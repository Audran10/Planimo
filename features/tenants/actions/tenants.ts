'use server'

import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { checkPropertyAccess } from '@/features/members/actions/members'
import { tenantSchema } from '../schemas/tenant.schema'
import { isTenantActive } from '../lib/tenant-status'
import type {
  CreateTenantInput,
  TenantListItem,
  TenantWithDocuments,
  UpdateTenantInput,
} from '../types'
import type { DocumentType, MemberRole } from '@/core/types'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')
  return session
}

function canManageTenant(role: MemberRole | 'owner' | null) {
  return role === 'owner' || role === 'admin' || role === 'editor'
}

function revalidateTenantPaths() {
  revalidatePath('/properties/[slug]/units/[unitSlug]', 'page')
  revalidatePath('/tenants')
  revalidatePath('/dashboard')
}

export async function getTenantByUnitId(
  unitId: string
): Promise<TenantWithDocuments | null> {
  const session = await requireSession()

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { propertyId: true },
  })
  if (!unit) throw new Error('Appartement introuvable')

  const access = await checkPropertyAccess(unit.propertyId, session.user.id)
  if (!access.hasAccess) throw new Error('Accès refusé à ce bien')

  const tenants = await prisma.tenant.findMany({
    where: { unitId },
    include: {
      documents: {
        where: { type: 'lease' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { leaseStart: 'desc' },
  })

  const active = tenants.find(isTenantActive)
  if (!active) return null

  return {
    ...active,
    documents: active.documents.map((doc) => ({
      ...doc,
      type: doc.type as DocumentType,
    })),
  }
}

export async function createTenant(unitId: string, input: CreateTenantInput) {
  const session = await requireSession()

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { propertyId: true },
  })
  if (!unit) throw new Error('Appartement introuvable')

  const access = await checkPropertyAccess(unit.propertyId, session.user.id)
  if (!access.hasAccess || !canManageTenant(access.role)) {
    throw new Error('Droits insuffisants pour ajouter un locataire')
  }

  const existingTenants = await prisma.tenant.findMany({ where: { unitId } })
  if (existingTenants.some(isTenantActive)) {
    throw new Error(
      'Cet appartement a déjà un locataire actif. Modifiez-le ou mettez fin à son bail avant d\'en ajouter un nouveau.'
    )
  }

  const data = tenantSchema.parse(input)

  const tenant = await prisma.tenant.create({
    data: { ...data, unitId },
  })

  revalidateTenantPaths()

  return tenant
}

export async function updateTenant(tenantId: string, input: UpdateTenantInput) {
  const session = await requireSession()

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { unit: { select: { propertyId: true } } },
  })
  if (!tenant) throw new Error('Locataire introuvable')

  const access = await checkPropertyAccess(tenant.unit.propertyId, session.user.id)
  if (!access.hasAccess || !canManageTenant(access.role)) {
    throw new Error('Droits insuffisants')
  }

  const data = tenantSchema.partial().parse(input)

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data,
  })

  revalidateTenantPaths()

  return updated
}

export async function deleteTenant(tenantId: string) {
  const session = await requireSession()

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { unit: { select: { propertyId: true } } },
  })
  if (!tenant) throw new Error('Locataire introuvable')

  const access = await checkPropertyAccess(tenant.unit.propertyId, session.user.id)
  if (!access.hasAccess || !canManageTenant(access.role)) {
    throw new Error('Droits insuffisants')
  }

  await prisma.tenant.delete({ where: { id: tenantId } })

  revalidateTenantPaths()
}

export async function getAllTenants(): Promise<TenantListItem[]> {
  const session = await requireSession()

  const tenants = await prisma.tenant.findMany({
    where: {
      unit: {
        property: {
          OR: [
            { ownerId: session.user.id },
            {
              members: {
                some: {
                  userId: session.user.id,
                  acceptedAt: { not: null },
                },
              },
            },
          ],
        },
      },
    },
    include: {
      unit: {
        select: {
          name: true,
          slug: true,
          property: { select: { name: true, slug: true } },
        },
      },
      documents: {
        where: { type: 'lease' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { leaseStart: 'desc' },
  })

  return tenants.map(({ unit, documents, ...tenant }) => ({
    ...tenant,
    documents: documents.map((doc) => ({ ...doc, type: doc.type as DocumentType })),
    unitName: unit.name,
    unitSlug: unit.slug,
    propertyName: unit.property.name,
    propertySlug: unit.property.slug,
  }))
}
