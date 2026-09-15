import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import {
  acceptInvitation,
  declineInvitation,
  getPendingInvitations,
  inviteMember,
  removePropertyMember,
  updateMemberRole,
} from '@/features/members/actions/members'
import { fakeSession } from './helpers/session'

beforeEach(() => {
  vi.mocked(auth.api.getSession).mockReset()
  vi.mocked(prisma.property.findUnique).mockReset()
  vi.mocked(prisma.user.findUnique).mockReset()
  vi.mocked(prisma.propertyMember.findMany).mockReset()
  vi.mocked(prisma.propertyMember.findFirst).mockReset()
  vi.mocked(prisma.propertyMember.upsert).mockReset()
  vi.mocked(prisma.propertyMember.create).mockReset()
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
    vi.mocked(prisma.propertyMember.create).mockResolvedValueOnce({
      propertyId: 'prop-1',
      userId: 'user-3',
      role: 'editor',
    } as never)

    const result = await inviteMember('prop-1', 'new@example.com', 'editor')

    expect(result).toMatchObject({ userId: 'user-3', role: 'editor' })
    expect(prisma.propertyMember.create).toHaveBeenCalledWith({
      data: { propertyId: 'prop-1', userId: 'user-3', role: 'editor' },
    })
  })

  it('allows an admin member to invite a viewer', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [{ userId: 'user-2', role: 'admin', acceptedAt: new Date() }],
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'user-3',
      email: 'new@example.com',
    } as never)
    vi.mocked(prisma.propertyMember.create).mockResolvedValueOnce({
      propertyId: 'prop-1',
      userId: 'user-3',
      role: 'viewer',
    } as never)

    const result = await inviteMember('prop-1', 'new@example.com', 'viewer')

    expect(result).toMatchObject({ role: 'viewer' })
  })

  it('throws when an admin tries to invite another admin', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [{ userId: 'user-2', role: 'admin', acceptedAt: new Date() }],
    } as never)

    await expect(
      inviteMember('prop-1', 'new@example.com', 'admin')
    ).rejects.toThrow('Droits insuffisants')
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('throws when the invited user is already a member', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [{ userId: 'user-3', role: 'viewer', acceptedAt: new Date() }],
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'user-3',
      email: 'new@example.com',
    } as never)

    await expect(
      inviteMember('prop-1', 'new@example.com', 'editor')
    ).rejects.toThrow('Cette personne est déjà membre de ce bien')
    expect(prisma.propertyMember.create).not.toHaveBeenCalled()
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
      members: [
        { userId: 'user-2', role: 'editor', acceptedAt: new Date() },
        { userId: 'user-3', role: 'viewer', acceptedAt: new Date() },
      ],
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
      members: [
        { userId: 'user-2', role: 'admin', acceptedAt: null },
        { userId: 'user-3', role: 'editor', acceptedAt: new Date() },
      ],
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
      members: [{ userId: 'user-3', role: 'editor', acceptedAt: new Date() }],
    } as never)
    vi.mocked(prisma.propertyMember.delete).mockResolvedValueOnce({} as never)

    await removePropertyMember('prop-1', 'user-3')

    expect(prisma.propertyMember.delete).toHaveBeenCalledWith({
      where: { propertyId_userId: { propertyId: 'prop-1', userId: 'user-3' } },
    })
  })

  it('throws when an admin tries to remove another admin', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [
        { userId: 'user-2', role: 'admin', acceptedAt: new Date() },
        { userId: 'user-3', role: 'admin', acceptedAt: new Date() },
      ],
    } as never)

    await expect(removePropertyMember('prop-1', 'user-3')).rejects.toThrow(
      'Droits insuffisants'
    )
    expect(prisma.propertyMember.delete).not.toHaveBeenCalled()
  })
})

describe('updateMemberRole', () => {
  it('allows the owner to change a member role', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [{ userId: 'user-3', role: 'viewer', acceptedAt: new Date() }],
    } as never)
    vi.mocked(prisma.propertyMember.update).mockResolvedValueOnce({
      userId: 'user-3',
      role: 'editor',
    } as never)

    const result = await updateMemberRole('prop-1', 'user-3', 'editor')

    expect(result).toMatchObject({ role: 'editor' })
    expect(prisma.propertyMember.update).toHaveBeenCalledWith({
      where: { propertyId_userId: { propertyId: 'prop-1', userId: 'user-3' } },
      data: { role: 'editor' },
    })
  })

  it('allows an admin to change an editor to viewer', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [
        { userId: 'user-2', role: 'admin', acceptedAt: new Date() },
        { userId: 'user-3', role: 'editor', acceptedAt: new Date() },
      ],
    } as never)
    vi.mocked(prisma.propertyMember.update).mockResolvedValueOnce({
      userId: 'user-3',
      role: 'viewer',
    } as never)

    await updateMemberRole('prop-1', 'user-3', 'viewer')

    expect(prisma.propertyMember.update).toHaveBeenCalled()
  })

  it('throws when an admin tries to promote someone to admin', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [
        { userId: 'user-2', role: 'admin', acceptedAt: new Date() },
        { userId: 'user-3', role: 'editor', acceptedAt: new Date() },
      ],
    } as never)

    await expect(updateMemberRole('prop-1', 'user-3', 'admin')).rejects.toThrow(
      'Droits insuffisants'
    )
    expect(prisma.propertyMember.update).not.toHaveBeenCalled()
  })

  it('throws when an admin tries to change another admin', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [
        { userId: 'user-2', role: 'admin', acceptedAt: new Date() },
        { userId: 'user-3', role: 'admin', acceptedAt: new Date() },
      ],
    } as never)

    await expect(updateMemberRole('prop-1', 'user-3', 'editor')).rejects.toThrow(
      'Droits insuffisants'
    )
  })

  it('throws when an editor tries to change a role', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [
        { userId: 'user-2', role: 'editor', acceptedAt: new Date() },
        { userId: 'user-3', role: 'viewer', acceptedAt: new Date() },
      ],
    } as never)

    await expect(updateMemberRole('prop-1', 'user-3', 'editor')).rejects.toThrow(
      'Droits insuffisants'
    )
  })

  it('throws when a user tries to change their own role', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [{ userId: 'user-2', role: 'admin', acceptedAt: new Date() }],
    } as never)

    await expect(updateMemberRole('prop-1', 'user-2', 'editor')).rejects.toThrow(
      'Vous ne pouvez pas modifier votre propre rôle'
    )
  })
})

describe('getPendingInvitations', () => {
  it('returns pending memberships of the current user', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.propertyMember.findMany).mockResolvedValueOnce([
      {
        propertyId: 'prop-1',
        role: 'editor',
        invitedAt: new Date('2026-01-01'),
        property: {
          name: 'Libourne',
          slug: 'libourne',
          address: '1 rue Test',
          owner: { name: 'Alice', email: 'alice@example.com' },
        },
      },
    ] as never)

    const result = await getPendingInvitations()

    expect(prisma.propertyMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-2', acceptedAt: null },
      })
    )
    expect(result).toEqual([
      expect.objectContaining({
        propertyId: 'prop-1',
        propertyName: 'Libourne',
        propertySlug: 'libourne',
        role: 'editor',
        invitedBy: 'Alice',
      }),
    ])
  })
})

describe('acceptInvitation', () => {
  it('throws when there is no pending invitation', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.propertyMember.findFirst).mockResolvedValueOnce(null as never)

    await expect(acceptInvitation('prop-1')).rejects.toThrow('Invitation introuvable')
    expect(prisma.propertyMember.update).not.toHaveBeenCalled()
  })

  it('marks the current membership as accepted', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.propertyMember.findFirst).mockResolvedValueOnce({
      id: 'member-1',
      propertyId: 'prop-1',
      userId: 'user-2',
      acceptedAt: null,
    } as never)
    vi.mocked(prisma.propertyMember.update).mockResolvedValueOnce({} as never)

    await acceptInvitation('prop-1')

    expect(prisma.propertyMember.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { acceptedAt: expect.any(Date) },
    })
  })
})

describe('declineInvitation', () => {
  it('deletes the pending membership', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.propertyMember.findFirst).mockResolvedValueOnce({
      id: 'member-1',
      propertyId: 'prop-1',
      userId: 'user-2',
      acceptedAt: null,
    } as never)
    vi.mocked(prisma.propertyMember.delete).mockResolvedValueOnce({} as never)

    await declineInvitation('prop-1')

    expect(prisma.propertyMember.delete).toHaveBeenCalledWith({ where: { id: 'member-1' } })
  })
})
