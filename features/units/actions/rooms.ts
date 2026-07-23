'use server'

import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { checkPropertyAccess } from '@/features/members/actions/members'
import type { MemberRole } from '@/core/types'
import type { RoomTechnicalInfo, RoomWithMeta, UpdateRoomInput } from '../types'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')
  return session
}

function canManageRoom(role: MemberRole | 'owner' | null) {
  return role === 'owner' || role === 'admin' || role === 'editor'
}

async function resolveRoomPropertyId(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { unit: { select: { propertyId: true } } },
  })
  if (!room) throw new Error('Pièce introuvable')
  return room.unit.propertyId
}

export async function getRoomsByUnitId(unitId: string): Promise<RoomWithMeta[]> {
  const session = await requireSession()

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { propertyId: true },
  })
  if (!unit) throw new Error('Appartement introuvable')

  const access = await checkPropertyAccess(unit.propertyId, session.user.id)
  if (!access.hasAccess) throw new Error('Accès refusé à ce bien')

  const rooms = await prisma.room.findMany({
    where: { unitId },
    include: { _count: { select: { documents: true, workOrders: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return rooms.map(({ _count, zoneCoordinates, ...room }) => ({
    ...room,
    zoneCoordinates: zoneCoordinates as RoomTechnicalInfo | null,
    documentsCount: _count.documents,
    workOrdersCount: _count.workOrders,
  }))
}

export async function updateRoom(roomId: string, input: UpdateRoomInput) {
  const session = await requireSession()

  const propertyId = await resolveRoomPropertyId(roomId)
  const access = await checkPropertyAccess(propertyId, session.user.id)
  if (!access.hasAccess || !canManageRoom(access.role)) {
    throw new Error('Droits insuffisants')
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) throw new Error('Pièce introuvable')

  const currentData = (room.zoneCoordinates as RoomTechnicalInfo | null) ?? {}

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: {
      name: input.name ?? room.name,
      zoneCoordinates: {
        ...currentData,
        ...input.zoneCoordinates,
      },
    },
  })

  revalidatePath('/properties/[slug]/units/[unitSlug]', 'page')

  return updated
}

export async function deleteRoom(roomId: string) {
  const session = await requireSession()

  const propertyId = await resolveRoomPropertyId(roomId)
  const access = await checkPropertyAccess(propertyId, session.user.id)
  if (!access.hasAccess || !canManageRoom(access.role)) {
    throw new Error('Droits insuffisants pour supprimer cette pièce')
  }

  await prisma.room.delete({ where: { id: roomId } })

  revalidatePath('/properties/[slug]/units/[unitSlug]', 'page')
}
