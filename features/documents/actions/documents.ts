'use server'

import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { uploadFile, deleteFile } from '@/core/lib/supabase'
import { checkPropertyAccess } from '@/features/members/actions/members'
import { documentSchema } from '../schemas/document.schema'
import type { CreateDocumentInput, DocumentListItem } from '../types'
import type { DocumentType, MemberRole } from '@/core/types'

const DOCUMENTS_BUCKET = 'documents'

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')
  return session
}

function canManageDocument(role: MemberRole | 'owner' | null) {
  return role === 'owner' || role === 'admin' || role === 'editor'
}

function revalidateDocumentPaths() {
  revalidatePath('/properties/[slug]/units/[unitSlug]', 'page')
  revalidatePath('/documents')
  revalidatePath('/dashboard')
}

function propertyAccessFilter(userId: string) {
  return {
    OR: [
      { ownerId: userId },
      { members: { some: { userId, acceptedAt: { not: null } } } },
    ],
  }
}

async function resolvePropertyId(target: {
  unitId?: string | null
  roomId?: string | null
  tenantId?: string | null
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

  if (target.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: target.tenantId },
      select: { unit: { select: { propertyId: true } } },
    })
    if (!tenant) throw new Error('Locataire introuvable')
    return tenant.unit.propertyId
  }

  throw new Error('Document non rattaché à un bien')
}

function extractStoragePath(fileUrl: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`
  const index = fileUrl.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(fileUrl.slice(index + marker.length))
}

export async function getDocumentsByUnitId(unitId: string) {
  const session = await requireSession()

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { propertyId: true },
  })
  if (!unit) throw new Error('Appartement introuvable')

  const access = await checkPropertyAccess(unit.propertyId, session.user.id)
  if (!access.hasAccess) throw new Error('Accès refusé à ce bien')

  const documents = await prisma.document.findMany({
    where: { unitId },
    orderBy: { createdAt: 'desc' },
  })

  return documents.map((doc) => ({ ...doc, type: doc.type as DocumentType }))
}

export async function getDocumentsByRoomId(roomId: string) {
  const session = await requireSession()

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { unit: { select: { propertyId: true } } },
  })
  if (!room) throw new Error('Pièce introuvable')

  const access = await checkPropertyAccess(room.unit.propertyId, session.user.id)
  if (!access.hasAccess) throw new Error('Accès refusé à ce bien')

  const documents = await prisma.document.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
  })

  return documents.map((doc) => ({ ...doc, type: doc.type as DocumentType }))
}

export async function getDocumentsByTenantId(tenantId: string) {
  const session = await requireSession()

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { unit: { select: { propertyId: true } } },
  })
  if (!tenant) throw new Error('Locataire introuvable')

  const access = await checkPropertyAccess(tenant.unit.propertyId, session.user.id)
  if (!access.hasAccess) throw new Error('Accès refusé à ce bien')

  const documents = await prisma.document.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  })

  return documents.map((doc) => ({ ...doc, type: doc.type as DocumentType }))
}

export async function createDocument(input: CreateDocumentInput) {
  const session = await requireSession()

  const { name, type, unitId, roomId, tenantId } = documentSchema.parse(input)

  const propertyId = await resolvePropertyId({ unitId, roomId, tenantId })
  const access = await checkPropertyAccess(propertyId, session.user.id)
  if (!access.hasAccess || !canManageDocument(access.role)) {
    throw new Error('Droits insuffisants pour ajouter un document')
  }

  const document = await prisma.document.create({
    data: {
      name,
      type,
      unitId,
      roomId,
      tenantId,
      fileUrl: input.fileUrl,
      fileType: input.fileType,
      fileSize: input.fileSize,
    },
  })

  revalidateDocumentPaths()

  return document
}

export async function deleteDocument(documentId: string) {
  const session = await requireSession()

  const document = await prisma.document.findUnique({ where: { id: documentId } })
  if (!document) throw new Error('Document introuvable')

  const propertyId = await resolvePropertyId(document)
  const access = await checkPropertyAccess(propertyId, session.user.id)
  if (!access.hasAccess || !canManageDocument(access.role)) {
    throw new Error('Droits insuffisants pour supprimer ce document')
  }

  const path = extractStoragePath(document.fileUrl, DOCUMENTS_BUCKET)
  if (path) {
    try {
      await deleteFile(DOCUMENTS_BUCKET, path)
    } catch (error) {
      console.error(
        'Erreur lors de la suppression du fichier sur Supabase Storage',
        error
      )
    }
  }

  await prisma.document.delete({ where: { id: documentId } })

  revalidateDocumentPaths()
}

export async function getAllDocuments(): Promise<DocumentListItem[]> {
  const session = await requireSession()
  const filter = propertyAccessFilter(session.user.id)

  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { unit: { property: filter } },
        { room: { unit: { property: filter } } },
        { tenant: { unit: { property: filter } } },
      ],
    },
    include: {
      unit: {
        select: {
          name: true,
          slug: true,
          property: { select: { name: true, slug: true } },
        },
      },
      room: {
        select: {
          unit: {
            select: {
              name: true,
              slug: true,
              property: { select: { name: true, slug: true } },
            },
          },
        },
      },
      tenant: {
        select: {
          unit: {
            select: {
              name: true,
              slug: true,
              property: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return documents.map(({ unit, room, tenant, type, ...doc }) => {
    const resolvedUnit = unit ?? room?.unit ?? tenant?.unit ?? null

    return {
      ...doc,
      type: type as DocumentType,
      unitName: resolvedUnit?.name ?? null,
      unitSlug: resolvedUnit?.slug ?? null,
      propertyName: resolvedUnit?.property.name ?? '—',
      propertySlug: resolvedUnit?.property.slug ?? '',
    }
  })
}

export async function uploadDocumentFile(
  formData: FormData
): Promise<{ url: string; fileType: string; fileSize: number }> {
  const session = await requireSession()

  const file = formData.get('file')
  const bucket = formData.get('bucket')
  const path = formData.get('path')

  if (!(file instanceof File) || typeof bucket !== 'string' || typeof path !== 'string') {
    throw new Error('Fichier invalide')
  }

  if (!path.startsWith(`${session.user.id}/`)) {
    throw new Error('Chemin de fichier invalide')
  }

  const url = await uploadFile(file, bucket, path)

  return { url, fileType: file.type, fileSize: file.size }
}
