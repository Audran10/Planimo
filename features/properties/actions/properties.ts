'use server'

import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { generateUniqueSlug } from '@/core/lib/slugify'
import { propertySchema } from '../schemas/property.schema'
import type {
  CreatePropertyInput,
  PropertyDetail,
  PropertyRole,
  PropertyWithMeta,
  UpdatePropertyInput,
} from '../types'
import type { FloorPlanZone, MemberRole, PropertyType } from '@/core/types'
import type { Unit } from '@/features/units/types'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')
  return session
}

async function loadPropertyDetail(
  where: { id: string } | { slug: string },
  userId: string
): Promise<PropertyDetail | null> {
  const property = await prisma.property.findUnique({
    where,
    include: {
      units: { orderBy: { createdAt: 'asc' } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { invitedAt: 'asc' },
      },
      owner: { select: { id: true, name: true, email: true } },
    },
  })

  if (!property) return null

  const isOwner = property.ownerId === userId
  const membership = property.members.find(
    (member) => member.userId === userId && member.acceptedAt
  )

  if (!isOwner && !membership) {
    throw new Error('Accès refusé à ce bien')
  }

  return {
    ...property,
    type: property.type as PropertyType,
    units: property.units.map((unit) => ({
      ...unit,
      floorPlanZones: unit.floorPlanZones as FloorPlanZone[] | null,
    })) as Unit[],
    members: property.members.map((member) => ({
      ...member,
      role: member.role as MemberRole,
    })),
    role: isOwner ? 'owner' : (membership!.role as PropertyRole),
  }
}

export async function getProperties(): Promise<PropertyWithMeta[]> {
  const session = await requireSession()

  const properties = await prisma.property.findMany({
    where: {
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
    include: {
      _count: { select: { units: true } },
      members: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return properties.map(({ _count, members, ...property }) => {
    const isOwner = property.ownerId === session.user.id
    const role: PropertyRole = isOwner
      ? 'owner'
      : ((members[0]?.role ?? 'viewer') as PropertyRole)

    return {
      ...property,
      type: property.type as PropertyType,
      unitsCount: _count.units,
      role,
    }
  })
}

export async function getPropertyById(
  id: string
): Promise<PropertyDetail | null> {
  const session = await requireSession()
  return loadPropertyDetail({ id }, session.user.id)
}

export async function getPropertyBySlug(
  slug: string
): Promise<PropertyDetail | null> {
  const session = await requireSession()
  return loadPropertyDetail({ slug }, session.user.id)
}

export async function createProperty(input: CreatePropertyInput) {
  const session = await requireSession()
  const data = propertySchema.parse(input)

  const existingSlugs = (
    await prisma.property.findMany({ select: { slug: true } })
  ).map((p) => p.slug)
  const slug = generateUniqueSlug(data.name, existingSlugs)

  const property = await prisma.property.create({
    data: {
      ...data,
      slug,
      ownerId: session.user.id,
    },
  })

  revalidatePath('/properties')
  revalidatePath('/dashboard')

  return property
}

export async function updateProperty(id: string, input: UpdatePropertyInput) {
  const session = await requireSession()
  const data = propertySchema.partial().parse(input)

  const property = await prisma.property.findUnique({
    where: { id },
    include: { members: true },
  })
  if (!property) throw new Error('Bien introuvable')

  const isOwner = property.ownerId === session.user.id
  const isAdmin = property.members.some(
    (member) =>
      member.userId === session.user.id &&
      member.acceptedAt &&
      member.role === 'admin'
  )
  if (!isOwner && !isAdmin) throw new Error('Action non autorisée')

  let slug = property.slug
  if (data.name && data.name !== property.name) {
    const existingSlugs = (
      await prisma.property.findMany({
        where: { NOT: { id } },
        select: { slug: true },
      })
    ).map((p) => p.slug)
    slug = generateUniqueSlug(data.name, existingSlugs)
  }

  const updated = await prisma.property.update({
    where: { id },
    data: { ...data, slug },
  })

  revalidatePath('/properties')
  revalidatePath(`/properties/${property.slug}`)
  if (slug !== property.slug) {
    revalidatePath(`/properties/${slug}`)
  }
  revalidatePath('/dashboard')

  return updated
}

export async function deleteProperty(id: string) {
  const session = await requireSession()

  const property = await prisma.property.findUnique({ where: { id } })
  if (!property) throw new Error('Bien introuvable')

  if (property.ownerId !== session.user.id) {
    throw new Error('Seul le propriétaire peut supprimer ce bien')
  }

  await prisma.property.delete({ where: { id } })

  revalidatePath('/properties')
  revalidatePath('/dashboard')
}
