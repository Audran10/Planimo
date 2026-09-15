'use server'

import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { uploadFile } from '@/core/lib/storage'
import { checkPropertyAccess } from '@/features/members/actions/members'
import { canWriteProperty } from '@/features/members/lib/permissions'
import { workOrderSchema } from '../schemas/work-order.schema'
import {
  MAX_FILE_SIZE,
  hasDangerousExtension,
  isAllowedContentType,
} from '@/features/documents/lib/file-validation'
import {
  buildDocumentFilename,
  documentNameFromFile,
} from '@/features/documents/lib/build-filename'
import type { CreateWorkOrderInput, UpdateWorkOrderInput, WorkOrder } from '../types'
import type { WorkOrderStatus, DocumentType } from '@/core/types'
import type { Document } from '@/features/documents/types'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')
  return session
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
    include: { documents: { orderBy: { createdAt: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  })

  return workOrders.map((workOrder) => ({
    ...workOrder,
    status: workOrder.status as WorkOrderStatus,
    documents: workOrder.documents.map((document) => ({
      ...document,
      type: document.type as DocumentType,
    })),
  }))
}

export async function createWorkOrder(input: CreateWorkOrderInput) {
  const session = await requireSession()

  const data = workOrderSchema.parse(input)

  const propertyId = await resolvePropertyId(data)
  const access = await checkPropertyAccess(propertyId, session.user.id)
  if (!access.hasAccess || !canWriteProperty(access.role)) {
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
  if (!access.hasAccess || !canWriteProperty(access.role)) {
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
  if (!access.hasAccess || !canWriteProperty(access.role)) {
    throw new Error('Droits insuffisants pour supprimer cette intervention')
  }

  await prisma.workOrder.delete({ where: { id: workOrderId } })

  revalidateWorkOrderPaths()
}

const DOCUMENTS_BUCKET = 'documents'

export async function attachFilesToWorkOrder(
  workOrderId: string,
  formData: FormData
): Promise<Document[]> {
  const session = await requireSession()

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      unit: {
        select: {
          id: true,
          slug: true,
          propertyId: true,
          property: { select: { slug: true } },
        },
      },
      room: {
        select: {
          unit: {
            select: {
              id: true,
              slug: true,
              propertyId: true,
              property: { select: { slug: true } },
            },
          },
        },
      },
    },
  })
  if (!workOrder) throw new Error('Intervention introuvable')

  const unit = workOrder.unit ?? workOrder.room?.unit
  if (!unit) throw new Error('Intervention non rattachée à un bien')

  const access = await checkPropertyAccess(unit.propertyId, session.user.id)
  if (!access.hasAccess || !canWriteProperty(access.role)) {
    throw new Error('Droits insuffisants')
  }

  const files = formData
    .getAll('files')
    .filter((entry): entry is File => entry instanceof File)
  if (files.length === 0) throw new Error('Aucun fichier sélectionné')

  const created: Document[] = []
  for (const file of files) {
    if (hasDangerousExtension(file.name)) {
      throw new Error('Type de fichier non autorisé')
    }
    if (!isAllowedContentType(file.type)) {
      throw new Error('Type de fichier non autorisé (PDF ou image uniquement)')
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Le fichier dépasse la taille maximale de 10 Mo')
    }

    const path = `${session.user.id}/${unit.property.slug}/${unit.slug}/work-orders/${workOrderId}/${buildDocumentFilename(file.name)}`
    const url = await uploadFile(file, DOCUMENTS_BUCKET, path)
    const document = await prisma.document.create({
      data: {
        name: documentNameFromFile(file.name),
        type: 'other',
        workOrderId,
        unitId: unit.id,
        fileUrl: url,
        fileType: file.type,
        fileSize: file.size,
      },
    })
    created.push({ ...document, type: 'other' })
  }

  revalidateWorkOrderPaths()
  revalidatePath('/documents')

  return created
}
