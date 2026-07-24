'use server'

import { prisma } from '@/core/lib/db'
import { Prisma } from '../../../generated/client'
import { auth } from '@/core/lib/auth'
import { anthropic } from '@/core/lib/anthropic'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { checkPropertyAccess } from '@/features/members/actions/members'
import { deleteFile } from '@/core/lib/supabase'
import { uploadDocumentFile } from '@/features/documents/actions/documents'
import { buildDocumentFilename } from '@/features/documents/lib/build-filename'
import type { MemberRole, FloorPlanZone } from '@/core/types'
import type { RoomTechnicalInfo } from '../types'

const DOCUMENTS_BUCKET = 'documents'

const SEGMENT_PROMPT = `Tu es un expert en analyse de plans d'appartements. Analyse ce plan et identifie toutes les pièces visibles.
Pour chaque pièce détectée, retourne un objet JSON avec ces propriétés exactes :

id : identifiant unique slug en minuscules sans espaces (ex: "salon", "chambre-1", "salle-de-bain")
name : nom de la pièce en français avec majuscule (ex: "Salon", "Chambre 1", "Salle de bain")
x : position du centre de la pièce en pourcentage depuis la gauche du plan (0-100)
y : position du centre de la pièce en pourcentage depuis le haut du plan (0-100)
width : largeur approximative de la pièce en pourcentage de la largeur totale du plan (0-100)
height : hauteur approximative de la pièce en pourcentage de la hauteur totale du plan (0-100)

Réponds UNIQUEMENT avec ce JSON valide, sans markdown, sans texte avant ou après :
{
"rooms": [
{ "id": "salon", "name": "Salon", "x": 25, "y": 30, "width": 30, "height": 25 },
...
],
"confidence": 0.85
}
Si le plan n'est pas lisible ou si tu ne peux pas identifier les pièces, retourne :
{ "rooms": [], "confidence": 0 }`

interface RawRoom {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
}

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')
  return session
}

function canManageUnit(role: MemberRole | 'owner' | null) {
  return role === 'owner' || role === 'admin' || role === 'editor'
}

async function requireUnitAccess(unitId: string) {
  const session = await requireSession()

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { propertyId: true, floorPlanUrl: true },
  })
  if (!unit) throw new Error('Appartement introuvable')

  const access = await checkPropertyAccess(unit.propertyId, session.user.id)
  if (!access.hasAccess || !canManageUnit(access.role)) {
    throw new Error('Droits insuffisants')
  }

  return { session, unit }
}

function extractStoragePath(fileUrl: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`
  const index = fileUrl.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(fileUrl.slice(index + marker.length))
}

// Room.slug is the stable link back to a FloorPlanZone.id — the zone's
// coordinates can move and its Room can be renamed independently, but the
// slug never changes, so matching never depends on re-deriving it from name.
async function syncRoomsWithZones(unitId: string, zones: FloorPlanZone[]) {
  // Zones can arrive with duplicate ids (AI segmentation glitch, stale
  // client state) — keep the last occurrence so slug (unique per unit)
  // never collides during the create/update pass below.
  const uniqueZones = Array.from(new Map(zones.map((zone) => [zone.id, zone])).values())

  const zoneIds = new Set(uniqueZones.map((zone) => zone.id))
  const existingRooms = await prisma.room.findMany({ where: { unitId } })

  const staleRoomIds = existingRooms
    .filter((room) => !zoneIds.has(room.slug))
    .map((room) => room.id)
  if (staleRoomIds.length > 0) {
    await prisma.room.deleteMany({ where: { id: { in: staleRoomIds } } })
  }

  for (const zone of uniqueZones) {
    const existing = existingRooms.find((room) => room.slug === zone.id)

    if (existing) {
      const currentData = (existing.zoneCoordinates as RoomTechnicalInfo | null) ?? {}
      await prisma.room.update({
        where: { id: existing.id },
        data: { zoneCoordinates: { ...currentData, ...zone.coordinates } },
      })
    } else {
      await prisma.room.create({
        data: {
          unitId,
          name: zone.name,
          slug: zone.id,
          zoneCoordinates: { ...zone.coordinates },
        },
      })
    }
  }
}

export async function uploadFloorPlan(unitId: string, formData: FormData) {
  const { session } = await requireUnitAccess(unitId)

  const file = formData.get('file')
  if (!(file instanceof File)) throw new Error('Fichier invalide')

  const path = `${session.user.id}/floor-plans/${unitId}/${buildDocumentFilename(file.name)}`

  const uploadFormData = new FormData()
  uploadFormData.append('file', file)
  uploadFormData.append('bucket', DOCUMENTS_BUCKET)
  uploadFormData.append('path', path)
  const uploaded = await uploadDocumentFile(uploadFormData)

  await prisma.unit.update({
    where: { id: unitId },
    data: { floorPlanUrl: uploaded.url },
  })

  revalidatePath('/properties/[slug]/units/[unitSlug]', 'page')

  return { url: uploaded.url, success: true }
}

export async function segmentFloorPlan(unitId: string, imageUrl: string) {
  await requireUnitAccess(unitId)

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Analyse IA non disponible')
  }

  let zones: FloorPlanZone[]
  let confidence: number

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: imageUrl } },
            { type: 'text', text: SEGMENT_PROMPT },
          ],
        },
      ],
    })

    const block = response.content[0]
    if (block.type !== 'text') throw new Error('Réponse Claude inattendue')

    const parsed = JSON.parse(block.text) as { rooms: RawRoom[]; confidence: number }
    zones = parsed.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      coordinates: { x: room.x, y: room.y, width: room.width, height: room.height },
    }))
    confidence = parsed.confidence
  } catch (error) {
    console.error("Erreur lors de l'analyse du plan par l'IA", error)
    throw new Error(
      "L'analyse du plan a échoué. Vous pouvez définir les pièces manuellement."
    )
  }

  await prisma.unit.update({
    where: { id: unitId },
    data: { floorPlanZones: zones as unknown as Prisma.InputJsonValue },
  })

  await syncRoomsWithZones(unitId, zones)

  revalidatePath('/properties/[slug]/units/[unitSlug]', 'page')

  return { zones, confidence, success: true }
}

export async function updateFloorPlanZones(unitId: string, zones: FloorPlanZone[]) {
  await requireUnitAccess(unitId)

  await prisma.unit.update({
    where: { id: unitId },
    data: { floorPlanZones: zones as unknown as Prisma.InputJsonValue },
  })

  await syncRoomsWithZones(unitId, zones)

  revalidatePath('/properties/[slug]/units/[unitSlug]', 'page')

  return { success: true }
}

export async function deleteFloorPlan(unitId: string) {
  const { unit } = await requireUnitAccess(unitId)

  if (unit.floorPlanUrl) {
    const path = extractStoragePath(unit.floorPlanUrl, DOCUMENTS_BUCKET)
    if (path) {
      try {
        await deleteFile(DOCUMENTS_BUCKET, path)
      } catch (error) {
        console.error('Erreur lors de la suppression du plan sur Supabase Storage', error)
      }
    }
  }

  await prisma.room.deleteMany({ where: { unitId } })

  await prisma.unit.update({
    where: { id: unitId },
    data: { floorPlanUrl: null, floorPlanZones: Prisma.DbNull },
  })

  revalidatePath('/properties/[slug]/units/[unitSlug]', 'page')

  return { success: true }
}
