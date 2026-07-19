'use server'

import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { checkPropertyAccess } from '@/features/members/actions/members'
import { generateUniqueSlug } from '@/core/lib/slugify'
import { unitSchema } from '../schemas/unit.schema'
import type {
  CreateUnitInput,
  UnitDetail,
  UnitWithMeta,
  UpdateUnitInput,
} from '../types'
import type {
  DocumentType,
  FloorPlanZone,
  MemberRole,
  PropertyType,
  WorkOrderStatus,
} from '@/core/types'
import type { PropertyRole } from '@/features/properties/types'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')
  return session
}

function isActiveTenant(tenant: { leaseEnd: Date | null }) {
  return !tenant.leaseEnd || tenant.leaseEnd >= new Date()
}

function canManageUnit(role: MemberRole | 'owner' | null) {
  return role === 'owner' || role === 'admin' || role === 'editor'
}

function canDeleteUnit(role: MemberRole | 'owner' | null) {
  return role === 'owner' || role === 'admin'
}

async function loadUnitDetail(
  where: { id: string } | { slug: string },
  userId: string
): Promise<UnitDetail | null> {
  const unit = await prisma.unit.findUnique({
    where,
    include: {
      property: { select: { id: true, name: true, slug: true, type: true } },
      rooms: { orderBy: { createdAt: 'asc' } },
      tenants: { orderBy: { leaseStart: 'desc' } },
      documents: { orderBy: { createdAt: 'desc' } },
      workOrders: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!unit) return null

  const access = await checkPropertyAccess(unit.propertyId, userId)
  if (!access.hasAccess) throw new Error('Accès refusé à ce bien')

  return {
    ...unit,
    floorPlanZones: unit.floorPlanZones as FloorPlanZone[] | null,
    property: {
      ...unit.property,
      type: unit.property.type as PropertyType,
    },
    documents: unit.documents.map((doc) => ({
      ...doc,
      type: doc.type as DocumentType,
    })),
    workOrders: unit.workOrders.map((workOrder) => ({
      ...workOrder,
      status: workOrder.status as WorkOrderStatus,
    })),
    role: access.role as PropertyRole,
  }
}

export async function getUnitsByPropertyId(
  propertyId: string
): Promise<UnitWithMeta[]> {
  const session = await requireSession()

  const access = await checkPropertyAccess(propertyId, session.user.id)
  if (!access.hasAccess) throw new Error('Accès refusé à ce bien')

  const units = await prisma.unit.findMany({
    where: { propertyId },
    include: {
      tenants: { select: { leaseEnd: true } },
      _count: { select: { documents: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return units.map(({ tenants, _count, floorPlanZones, ...unit }) => ({
    ...unit,
    floorPlanZones: floorPlanZones as FloorPlanZone[] | null,
    isOccupied: tenants.some(isActiveTenant),
    documentsCount: _count.documents,
  }))
}

export async function getUnitById(unitId: string): Promise<UnitDetail | null> {
  const session = await requireSession()
  return loadUnitDetail({ id: unitId }, session.user.id)
}

export async function getUnitBySlug(slug: string): Promise<UnitDetail | null> {
  const session = await requireSession()
  return loadUnitDetail({ slug }, session.user.id)
}

export async function getOrCreateHouseUnit(
  propertyId: string,
  propertyName: string
): Promise<UnitDetail> {
  const session = await requireSession()

  const access = await checkPropertyAccess(propertyId, session.user.id)
  if (!access.hasAccess) throw new Error('Accès refusé à ce bien')

  const existing = await prisma.unit.findFirst({ where: { propertyId } })

  const unit =
    existing ??
    (await prisma.unit.create({
      data: {
        propertyId,
        name: propertyName,
        slug: generateUniqueSlug(
          propertyName,
          (await prisma.unit.findMany({ select: { slug: true } })).map(
            (u) => u.slug
          )
        ),
      },
    }))

  const detail = await getUnitById(unit.id)
  if (!detail) throw new Error("Erreur lors de la récupération de l'appartement")

  return detail
}

export async function createUnit(propertyId: string, input: CreateUnitInput) {
  const session = await requireSession()

  const access = await checkPropertyAccess(propertyId, session.user.id)
  if (!access.hasAccess || !canManageUnit(access.role)) {
    throw new Error("Droits insuffisants pour ajouter un appartement")
  }

  const data = unitSchema.parse(input)

  const existingSlugs = (
    await prisma.unit.findMany({ select: { slug: true } })
  ).map((u) => u.slug)
  const slug = generateUniqueSlug(data.name, existingSlugs)

  const unit = await prisma.unit.create({
    data: { ...data, slug, propertyId },
  })

  revalidatePath('/properties/[slug]', 'page')
  revalidatePath('/dashboard')

  return unit
}

export async function updateUnit(unitId: string, input: UpdateUnitInput) {
  const session = await requireSession()

  const unit = await prisma.unit.findUnique({ where: { id: unitId } })
  if (!unit) throw new Error('Appartement introuvable')

  const access = await checkPropertyAccess(unit.propertyId, session.user.id)
  if (!access.hasAccess || !canManageUnit(access.role)) {
    throw new Error('Droits insuffisants')
  }

  const data = unitSchema.partial().parse(input)

  let slug = unit.slug
  if (data.name && data.name !== unit.name) {
    const existingSlugs = (
      await prisma.unit.findMany({
        where: { NOT: { id: unitId } },
        select: { slug: true },
      })
    ).map((u) => u.slug)
    slug = generateUniqueSlug(data.name, existingSlugs)
  }

  const updated = await prisma.unit.update({
    where: { id: unitId },
    data: { ...data, slug },
  })

  revalidatePath('/properties/[slug]', 'page')
  revalidatePath('/properties/[slug]/units/[unitSlug]', 'page')

  return updated
}

export async function deleteUnit(unitId: string) {
  const session = await requireSession()

  const unit = await prisma.unit.findUnique({ where: { id: unitId } })
  if (!unit) throw new Error('Appartement introuvable')

  const access = await checkPropertyAccess(unit.propertyId, session.user.id)
  if (!access.hasAccess || !canDeleteUnit(access.role)) {
    throw new Error(
      'Seuls le propriétaire ou un administrateur peuvent supprimer un appartement'
    )
  }

  await prisma.unit.delete({ where: { id: unitId } })

  revalidatePath('/properties/[slug]', 'page')
  revalidatePath('/dashboard')
}
