import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import {
  createProperty,
  deleteProperty,
  updateProperty,
} from '@/features/properties/actions/properties'
import { fakeSession } from './helpers/session'

beforeEach(() => {
  vi.mocked(auth.api.getSession).mockReset()
  vi.mocked(prisma.property.findMany).mockReset()
  vi.mocked(prisma.property.findUnique).mockReset()
  vi.mocked(prisma.property.create).mockReset()
  vi.mocked(prisma.property.update).mockReset()
  vi.mocked(prisma.property.delete).mockReset()
})

const validPropertyInput = {
  name: 'Résidence des Lilas',
  address: '12 rue des Lilas, 75011 Paris',
  type: 'apartment_building' as const,
}

describe('createProperty', () => {
  it('creates a property owned by the current user', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.property.findMany).mockResolvedValueOnce([])
    vi.mocked(prisma.property.create).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      slug: 'residence-des-lilas',
    } as never)

    const result = await createProperty(validPropertyInput)

    expect(result).toMatchObject({ slug: 'residence-des-lilas' })
    expect(prisma.property.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: 'user-1' }),
      })
    )
  })

  it('rejects an invalid payload before touching Prisma', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)

    await expect(
      createProperty({ ...validPropertyInput, name: 'A' })
    ).rejects.toThrow()
    expect(prisma.property.create).not.toHaveBeenCalled()
  })
})

describe('updateProperty', () => {
  it('throws when the property does not exist', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce(null as never)

    await expect(updateProperty('prop-1', { name: 'New Name' })).rejects.toThrow(
      'Bien introuvable'
    )
  })

  it('allows the owner to update the property', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      name: 'Old Name',
      slug: 'old-name',
      members: [],
    } as never)
    vi.mocked(prisma.property.findMany).mockResolvedValueOnce([])
    vi.mocked(prisma.property.update).mockResolvedValueOnce({
      id: 'prop-1',
      name: 'New Name',
    } as never)

    const result = await updateProperty('prop-1', { name: 'New Name' })

    expect(result).toMatchObject({ name: 'New Name' })
  })

  it('allows an accepted admin member to update the property', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      name: 'Old Name',
      slug: 'old-name',
      members: [{ userId: 'user-2', role: 'admin', acceptedAt: new Date() }],
    } as never)
    vi.mocked(prisma.property.findMany).mockResolvedValueOnce([])
    vi.mocked(prisma.property.update).mockResolvedValueOnce({
      id: 'prop-1',
      name: 'New Name',
    } as never)

    const result = await updateProperty('prop-1', { name: 'New Name' })

    expect(result).toMatchObject({ name: 'New Name' })
  })

  it('throws when an editor member tries to update the property', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      name: 'Old Name',
      slug: 'old-name',
      members: [{ userId: 'user-2', role: 'editor', acceptedAt: new Date() }],
    } as never)

    await expect(updateProperty('prop-1', { name: 'New Name' })).rejects.toThrow(
      'Action non autorisée'
    )
    expect(prisma.property.update).not.toHaveBeenCalled()
  })

  it('throws when the admin membership is still a pending invitation', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      name: 'Old Name',
      slug: 'old-name',
      members: [{ userId: 'user-2', role: 'admin', acceptedAt: null }],
    } as never)

    await expect(updateProperty('prop-1', { name: 'New Name' })).rejects.toThrow(
      'Action non autorisée'
    )
  })
})

describe('deleteProperty', () => {
  it('throws when the property does not exist', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce(null as never)

    await expect(deleteProperty('prop-1')).rejects.toThrow('Bien introuvable')
  })

  it('throws when a non-owner (even an admin) tries to delete the property', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-2') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
    } as never)

    await expect(deleteProperty('prop-1')).rejects.toThrow(
      'Seul le propriétaire peut supprimer ce bien'
    )
    expect(prisma.property.delete).not.toHaveBeenCalled()
  })

  it('allows the owner to delete the property', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
    } as never)
    vi.mocked(prisma.property.delete).mockResolvedValueOnce({ id: 'prop-1' } as never)

    await deleteProperty('prop-1')

    expect(prisma.property.delete).toHaveBeenCalledWith({ where: { id: 'prop-1' } })
  })
})
