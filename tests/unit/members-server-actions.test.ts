import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import {
  acceptInvitation,
  inviteMember,
  removePropertyMember,
} from '@/features/members/actions/members'
import { fakeSession } from './helpers/session'

beforeEach(() => {
  vi.mocked(auth.api.getSession).mockReset()
  vi.mocked(prisma.property.findUnique).mockReset()
  vi.mocked(prisma.user.findUnique).mockReset()
  vi.mocked(prisma.propertyMember.upsert).mockReset()
  vi.mocked(prisma.propertyMember.update).mockReset()
  vi.mocked(prisma.propertyMember.delete).mockReset()
})

describe('inviteMember', () => {
  it('throws when the property does not exist', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce(null as never)

    await expect(
      inviteMember('prop-1', 'new@example.com', 'editor')
    ).rejects.toThrow('Bien introuvable')
  })

  it('throws when an editor (not owner/admin) tries to invite', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [{ userId: 'user-2', role: 'editor' }],
    } as never)

    await expect(
      inviteMember('prop-1', 'new@example.com', 'editor')
    ).rejects.toThrow('Droits insuffisants')
  })

  it('throws when the invited email has no matching account', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [],
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null as never)

    await expect(
      inviteMember('prop-1', 'ghost@example.com', 'editor')
    ).rejects.toThrow('Utilisateur introuvable')
  })

  it('allows the owner to invite an existing user', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [],
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'user-3',
      email: 'new@example.com',
    } as never)
    vi.mocked(prisma.propertyMember.upsert).mockResolvedValueOnce({
      propertyId: 'prop-1',
      userId: 'user-3',
      role: 'editor',
    } as never)

    const result = await inviteMember('prop-1', 'new@example.com', 'editor')

    expect(result).toMatchObject({ userId: 'user-3', role: 'editor' })
  })

  it('allows an admin member to invite a new user', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [{ userId: 'user-2', role: 'admin' }],
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'user-3',
      email: 'new@example.com',
    } as never)
    vi.mocked(prisma.propertyMember.upsert).mockResolvedValueOnce({
      propertyId: 'prop-1',
      userId: 'user-3',
      role: 'viewer',
    } as never)

    const result = await inviteMember('prop-1', 'new@example.com', 'viewer')

    expect(result).toMatchObject({ role: 'viewer' })
  })
})

describe('removePropertyMember', () => {
  it('throws when the property does not exist', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce(null as never)

    await expect(removePropertyMember('prop-1', 'user-3')).rejects.toThrow(
      'Bien introuvable'
    )
  })

  it('throws when an editor (not owner/accepted admin) tries to remove a member', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [{ userId: 'user-2', role: 'editor', acceptedAt: new Date() }],
    } as never)

    await expect(removePropertyMember('prop-1', 'user-3')).rejects.toThrow(
      'Droits insuffisants'
    )
  })

  it('throws when a pending (not yet accepted) admin tries to remove a member', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [{ userId: 'user-2', role: 'admin', acceptedAt: null }],
    } as never)

    await expect(removePropertyMember('prop-1', 'user-3')).rejects.toThrow(
      'Droits insuffisants'
    )
  })

  it('refuses to let anyone remove the property owner', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [],
    } as never)

    await expect(removePropertyMember('prop-1', 'user-1')).rejects.toThrow(
      'Impossible de supprimer le propriétaire du bien'
    )
    expect(prisma.propertyMember.delete).not.toHaveBeenCalled()
  })

  it('allows the owner to remove a member', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [],
    } as never)
    vi.mocked(prisma.propertyMember.delete).mockResolvedValueOnce({} as never)

    await removePropertyMember('prop-1', 'user-3')

    expect(prisma.propertyMember.delete).toHaveBeenCalledWith({
      where: { propertyId_userId: { propertyId: 'prop-1', userId: 'user-3' } },
    })
  })
})

describe('acceptInvitation', () => {
  it('marks the current membership as accepted', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.propertyMember.update).mockResolvedValueOnce({
      propertyId: 'prop-1',
      userId: 'user-2',
      acceptedAt: new Date(),
    } as never)

    const result = await acceptInvitation('prop-1')

    expect(prisma.propertyMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { propertyId_userId: { propertyId: 'prop-1', userId: 'user-2' } },
      })
    )
    expect(result).toMatchObject({ userId: 'user-2' })
  })
})
