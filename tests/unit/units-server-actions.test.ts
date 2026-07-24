import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { checkPropertyAccess } from '@/features/members/actions/members'
import { createUnit, deleteUnit, updateUnit } from '@/features/units/actions/units'
import { fakeSession } from './helpers/session'

vi.mock('@/features/members/actions/members', () => ({
  checkPropertyAccess: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(auth.api.getSession).mockReset()
  vi.mocked(checkPropertyAccess).mockReset()
  vi.mocked(prisma.unit.findUnique).mockReset()
  vi.mocked(prisma.unit.findMany).mockReset()
  vi.mocked(prisma.unit.create).mockReset()
  vi.mocked(prisma.unit.update).mockReset()
  vi.mocked(prisma.unit.delete).mockReset()
})

describe('createUnit', () => {
  it('throws when the user has no access to the property', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({ hasAccess: false, role: null })

    await expect(createUnit('prop-1', { name: 'Appartement 1A' })).rejects.toThrow(
      'Droits insuffisants pour ajouter un appartement'
    )
  })

  it('throws when the user only has viewer access', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'viewer',
    })

    await expect(createUnit('prop-1', { name: 'Appartement 1A' })).rejects.toThrow(
      'Droits insuffisants pour ajouter un appartement'
    )
  })

  it('allows an editor to create a unit', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(prisma.unit.findMany).mockResolvedValueOnce([])
    vi.mocked(prisma.unit.create).mockResolvedValueOnce({
      id: 'unit-1',
      name: 'Appartement 1A',
      slug: 'appartement-1a',
    } as never)

    const result = await createUnit('prop-1', { name: 'Appartement 1A' })

    expect(result).toMatchObject({ slug: 'appartement-1a' })
  })
})

describe('updateUnit', () => {
  it('throws when the unit does not exist', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce(null as never)

    await expect(updateUnit('unit-1', { name: 'New Name' })).rejects.toThrow(
      'Appartement introuvable'
    )
  })

  it('throws when the user lacks manage rights', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
      id: 'unit-1',
      propertyId: 'prop-1',
      name: 'Old Name',
      slug: 'old-name',
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'viewer',
    })

    await expect(updateUnit('unit-1', { name: 'New Name' })).rejects.toThrow(
      'Droits insuffisants'
    )
  })

  it('keeps the same slug when the name is unchanged', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
      id: 'unit-1',
      propertyId: 'prop-1',
      name: 'Appartement 1A',
      slug: 'appartement-1a',
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(prisma.unit.update).mockResolvedValueOnce({
      id: 'unit-1',
      slug: 'appartement-1a',
    } as never)

    await updateUnit('unit-1', { floor: 3 })

    expect(prisma.unit.findMany).not.toHaveBeenCalled()
    expect(prisma.unit.update).toHaveBeenCalledWith({
      where: { id: 'unit-1' },
      data: { floor: 3, slug: 'appartement-1a' },
    })
  })

  it('regenerates the slug when the name changes', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
      id: 'unit-1',
      propertyId: 'prop-1',
      name: 'Appartement 1A',
      slug: 'appartement-1a',
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(prisma.unit.findMany).mockResolvedValueOnce([])
    vi.mocked(prisma.unit.update).mockResolvedValueOnce({
      id: 'unit-1',
      slug: 'appartement-2b',
    } as never)

    await updateUnit('unit-1', { name: 'Appartement 2B' })

    expect(prisma.unit.update).toHaveBeenCalledWith({
      where: { id: 'unit-1' },
      data: { name: 'Appartement 2B', slug: 'appartement-2b' },
    })
  })
})

describe('deleteUnit', () => {
  it('throws when the unit does not exist', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce(null as never)

    await expect(deleteUnit('unit-1')).rejects.toThrow('Appartement introuvable')
  })

  it('throws when an editor tries to delete a unit (owner/admin only)', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
      id: 'unit-1',
      propertyId: 'prop-1',
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })

    await expect(deleteUnit('unit-1')).rejects.toThrow(
      'Seuls le propriétaire ou un administrateur peuvent supprimer un appartement'
    )
    expect(prisma.unit.delete).not.toHaveBeenCalled()
  })

  it('allows an admin to delete a unit', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
      id: 'unit-1',
      propertyId: 'prop-1',
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'admin',
    })
    vi.mocked(prisma.unit.delete).mockResolvedValueOnce({ id: 'unit-1' } as never)

    await deleteUnit('unit-1')

    expect(prisma.unit.delete).toHaveBeenCalledWith({ where: { id: 'unit-1' } })
  })
})
