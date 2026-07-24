import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { checkPropertyAccess } from '@/features/members/actions/members'
import {
  createTenant,
  deleteTenant,
  updateTenant,
} from '@/features/tenants/actions/tenants'
import { fakeSession } from './helpers/session'

vi.mock('@/features/members/actions/members', () => ({
  checkPropertyAccess: vi.fn(),
}))

const validTenantInput = {
  fullName: 'Marc Bernard',
  leaseStart: new Date('2024-01-15'),
  monthlyRent: 850,
}

beforeEach(() => {
  vi.mocked(auth.api.getSession).mockReset()
  vi.mocked(checkPropertyAccess).mockReset()
  vi.mocked(prisma.unit.findUnique).mockReset()
  vi.mocked(prisma.tenant.findMany).mockReset()
  vi.mocked(prisma.tenant.create).mockReset()
  vi.mocked(prisma.tenant.findUnique).mockReset()
  vi.mocked(prisma.tenant.update).mockReset()
  vi.mocked(prisma.tenant.delete).mockReset()
})

describe('createTenant', () => {
  it('throws when the unit does not exist', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce(null as never)

    await expect(createTenant('unit-1', validTenantInput)).rejects.toThrow(
      'Appartement introuvable'
    )
  })

  it('throws when the user has no access to the property', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
      propertyId: 'prop-1',
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({ hasAccess: false, role: null })

    await expect(createTenant('unit-1', validTenantInput)).rejects.toThrow(
      'Droits insuffisants pour ajouter un locataire'
    )
  })

  it('throws when the user only has viewer access', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
      propertyId: 'prop-1',
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'viewer',
    })

    await expect(createTenant('unit-1', validTenantInput)).rejects.toThrow(
      'Droits insuffisants pour ajouter un locataire'
    )
  })

  it('throws when the unit already has an active tenant', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
      propertyId: 'prop-1',
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(prisma.tenant.findMany).mockResolvedValueOnce([
      { id: 'tenant-1', leaseEnd: null },
    ] as never)

    await expect(createTenant('unit-1', validTenantInput)).rejects.toThrow(
      'Cet appartement a déjà un locataire actif'
    )
  })

  it('allows an editor to create a tenant when the previous lease already expired', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
      propertyId: 'prop-1',
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(prisma.tenant.findMany).mockResolvedValueOnce([
      { id: 'old-tenant', leaseEnd: new Date('2020-01-01') },
    ] as never)
    vi.mocked(prisma.tenant.create).mockResolvedValueOnce({
      id: 'new-tenant',
      ...validTenantInput,
    } as never)

    const result = await createTenant('unit-1', validTenantInput)

    expect(result).toMatchObject({ id: 'new-tenant' })
  })

  it('allows an owner to create the first tenant on a vacant unit', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
      propertyId: 'prop-1',
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'owner',
    })
    vi.mocked(prisma.tenant.findMany).mockResolvedValueOnce([])
    vi.mocked(prisma.tenant.create).mockResolvedValueOnce({
      id: 'new-tenant',
      ...validTenantInput,
    } as never)

    const result = await createTenant('unit-1', validTenantInput)

    expect(result).toMatchObject({ id: 'new-tenant' })
  })

  it('rejects an invalid payload before touching Prisma', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
      propertyId: 'prop-1',
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'owner',
    })
    vi.mocked(prisma.tenant.findMany).mockResolvedValueOnce([])

    await expect(
      createTenant('unit-1', { ...validTenantInput, fullName: 'M' })
    ).rejects.toThrow()
    expect(prisma.tenant.create).not.toHaveBeenCalled()
  })
})

describe('updateTenant', () => {
  it('throws when the tenant does not exist', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce(null as never)

    await expect(updateTenant('tenant-1', { fullName: 'New Name' })).rejects.toThrow(
      'Locataire introuvable'
    )
  })

  it('throws when the user lacks manage rights', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce({
      id: 'tenant-1',
      unit: { propertyId: 'prop-1' },
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'viewer',
    })

    await expect(updateTenant('tenant-1', { fullName: 'New Name' })).rejects.toThrow(
      'Droits insuffisants'
    )
  })

  it('allows an admin to update a tenant', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce({
      id: 'tenant-1',
      unit: { propertyId: 'prop-1' },
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'admin',
    })
    vi.mocked(prisma.tenant.update).mockResolvedValueOnce({
      id: 'tenant-1',
      fullName: 'New Name',
    } as never)

    const result = await updateTenant('tenant-1', { fullName: 'New Name' })

    expect(result).toMatchObject({ fullName: 'New Name' })
  })
})

describe('deleteTenant', () => {
  it('throws when the tenant does not exist', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce(null as never)

    await expect(deleteTenant('tenant-1')).rejects.toThrow('Locataire introuvable')
  })

  it('throws when the user only has viewer access', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce({
      id: 'tenant-1',
      unit: { propertyId: 'prop-1' },
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'viewer',
    })

    await expect(deleteTenant('tenant-1')).rejects.toThrow('Droits insuffisants')
    expect(prisma.tenant.delete).not.toHaveBeenCalled()
  })

  it('allows an editor to delete a tenant', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce({
      id: 'tenant-1',
      unit: { propertyId: 'prop-1' },
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(prisma.tenant.delete).mockResolvedValueOnce({ id: 'tenant-1' } as never)

    await deleteTenant('tenant-1')

    expect(prisma.tenant.delete).toHaveBeenCalledWith({ where: { id: 'tenant-1' } })
  })
})
