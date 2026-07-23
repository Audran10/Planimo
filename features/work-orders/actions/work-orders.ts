'use server'

import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { checkPropertyAccess } from '@/features/members/actions/members'
import { workOrderSchema } from '../schemas/work-order.schema'
import type { CreateWorkOrderInput, UpdateWorkOrderInput, WorkOrder } from '../types'
import type { MemberRole, WorkOrderStatus } from '@/core/types'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')
  return session
}

function canManageWorkOrder(role: MemberRole | 'owner' | null) {
  return role === 'owner' || role === 'admin' || role === 'editor'
}

function revalidateWorkOrderPaths() {
  revalidatePath('/properties/[slug]/units/[unitSlug]', 'page')
  revalidatePath('/properties/[slug]', 'page')
  revalidatePath('/dashboard')
}

async function resolvePropertyId(target: {
  unitId?: string | null
  roomId?: string | null
}): Promise<string> {
  if (target.unitId) {
    const unit = await prisma.unit.findUnique({
      where: { id: target.unitId },
      select: { propertyId: true },
    })
    if (!unit) throw new Error('Appartement introuvable')
    return unit.propertyId
  }

  if (target.roomId) {
    const room = await prisma.room.findUnique({
      where: { id: target.roomId },
      select: { unit: { select: { propertyId: true } } },
    })
    if (!room) throw new Error('Pièce introuvable')
    return room.unit.propertyId
  }

  throw new Error('Intervention non rattachée à un bien')
}

async function resolveWorkOrderPropertyId(workOrderId: string) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      unit: { select: { propertyId: true } },
      room: { select: { unit: { select: { propertyId: true } } } },
    },
  })
  if (!workOrder) throw new Error('Intervention introuvable')

  const propertyId = workOrder.unit?.propertyId ?? workOrder.room?.unit.propertyId
  if (!propertyId) throw new Error('Intervention non rattachée à un bien')

  return propertyId
}

export async function getWorkOrdersByUnitId(unitId: string): Promise<WorkOrder[]> {
  const session = await requireSession()

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { propertyId: true },
  })
  if (!unit) throw new Error('Appartement introuvable')

  const access = await checkPropertyAccess(unit.propertyId, session.user.id)
  if (!access.hasAccess) throw new Error('Accès refusé à ce bien')

  const workOrders = await prisma.workOrder.findMany({
    where: { OR: [{ unitId }, { room: { unitId } }] },
    orderBy: { createdAt: 'desc' },
  })

  return workOrders.map((workOrder) => ({
    ...workOrder,
    status: workOrder.status as WorkOrderStatus,
  }))
}

export async function createWorkOrder(input: CreateWorkOrderInput) {
  const session = await requireSession()

  const data = workOrderSchema.parse(input)

  const propertyId = await resolvePropertyId(data)
  const access = await checkPropertyAccess(propertyId, session.user.id)
  if (!access.hasAccess || !canManageWorkOrder(access.role)) {
    throw new Error('Droits insuffisants pour ajouter une intervention')
  }

  const workOrder = await prisma.workOrder.create({ data })

  revalidateWorkOrderPaths()

  return workOrder
}

export async function updateWorkOrder(workOrderId: string, input: UpdateWorkOrderInput) {
  const session = await requireSession()

  const propertyId = await resolveWorkOrderPropertyId(workOrderId)
  const access = await checkPropertyAccess(propertyId, session.user.id)
  if (!access.hasAccess || !canManageWorkOrder(access.role)) {
    throw new Error('Droits insuffisants')
  }

  const data = workOrderSchema.partial().parse(input)

  const updated = await prisma.workOrder.update({
    where: { id: workOrderId },
    data,
  })

  revalidateWorkOrderPaths()

  return updated
}

export async function deleteWorkOrder(workOrderId: string) {
  const session = await requireSession()

  const propertyId = await resolveWorkOrderPropertyId(workOrderId)
  const access = await checkPropertyAccess(propertyId, session.user.id)
  if (!access.hasAccess || !canManageWorkOrder(access.role)) {
    throw new Error('Droits insuffisants pour supprimer cette intervention')
  }

  await prisma.workOrder.delete({ where: { id: workOrderId } })

  revalidateWorkOrderPaths()
}
