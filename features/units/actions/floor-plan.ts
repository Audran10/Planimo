'use server'

import { prisma } from '@/core/lib/db'
import { Prisma } from '../../../generated/client'
import { auth } from '@/core/lib/auth'
import { getAnthropic } from '@/core/lib/anthropic'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { checkPropertyAccess } from '@/features/members/actions/members'
import { canWriteProperty } from '@/features/members/lib/permissions'
import { deleteFile, extractStoragePath, readStoredFile } from '@/core/lib/storage'
import { prepareFloorPlanForVision, type VisionImage } from '@/core/lib/floor-plan-vision'
import { detectWallGrid, type GridCell } from '@/core/lib/floor-plan-walls'
import { parseClaudeJson } from '@/features/units/lib/parse-claude-json'
import { uploadDocumentFile } from '@/features/documents/actions/documents'
import { buildDocumentFilename } from '@/features/documents/lib/build-filename'
import type { FloorPlanCell, FloorPlanZone } from '@/core/types'
import type { RoomTechnicalInfo } from '../types'
import {
  listFloorPlans,
  emptyFloorPlan,
  type StoredFloorPlan,
} from '@/features/units/lib/floor-plans'

const DOCUMENTS_BUCKET = 'documents'

// Mode principal : les murs ont été détectés sur le plan et le découpent en
// cellules numérotées. Le modèle ne mesure rien, il regroupe et nomme.
const GROUP_PROMPT = `Tu es un expert en analyse de plans d'appartements. L'image est un plan dont les murs ont été détectés automatiquement : chaque cellule numérotée et teintée est délimitée par de vrais murs.

Ton travail est de regrouper ces cellules en pièces, puis de nommer chaque pièce. Tu ne mesures rien et tu ne donnes aucune coordonnée.

Règles de regroupement :
- une cellule appartient à une seule pièce, et une pièce est une ou plusieurs cellules ;
- regroupe plusieurs cellules quand elles forment un seul espace continu sans mur entre elles, par exemple un séjour en L, ou une cuisine ouverte sur un salon ;
- laisse une cellule seule quand un mur la sépare de ses voisines ;
- IGNORE simplement les cellules qui ne sont pas des espaces intérieurs : extérieur, épaisseur de murs, cour, voirie, cartouche ou légende du plan. Ne les cite pas.

RÈGLES DE NOMMAGE — un mauvais nom est plus gênant qu'un nom générique.
N'attribue un nom précis que si tu en as la preuve visuelle :
- une étiquette écrite sur le plan dans la cellule (traduis-la en français : "Bedroom" donne "Chambre") ;
- ou un équipement sans ambiguïté : baignoire, douche ou WC donnent "Salle de bain" ; plaque de cuisson, évier ou plan de travail donnent "Cuisine" ; un lit donne "Chambre" ; une voiture donne "Garage".
Noms autorisés : Salon, Séjour / Salle à manger, Cuisine, Chambre, Salle de bain, WC, Entrée, Couloir, Dressing, Placard, Buanderie, Local technique, Bureau, Terrasse, Balcon, Cave, Garage.
Dans TOUS les autres cas, y compris si tu hésites entre deux noms, utilise "Pièce 1", "Pièce 2", etc. N'invente jamais de variante comme "Séjour 2" ou "Chambre d'appoint", et ne déduis pas l'usage d'une pièce de sa seule taille ou position.

Réponds UNIQUEMENT avec ce JSON valide, sans markdown, sans texte avant ou après :
{
"rooms": [
{ "id": "salon", "name": "Salon", "cells": [2, 5] },
{ "id": "chambre-1", "name": "Chambre", "cells": [7] },
...
],
"confidence": 0.85
}
où id est un identifiant slug en minuscules sans espaces et cells la liste des numéros de cellules de la pièce.
Si le plan n'est pas lisible, retourne :
{ "rooms": [], "confidence": 0 }`

// Mode de repli, quand la détection des murs n'a rien donné (murs obliques,
// plan à main levée) : le modèle lit des coordonnées sur une grille graduée.
const SEGMENT_PROMPT = `Tu es un expert en analyse de plans d'appartements. Analyse ce plan et identifie toutes les pièces visibles.

L'image est recadrée sur le dessin et surchargée d'une grille rouge graduée de 0 à 100, avec une ligne tous les 10, les valeurs inscrites en haut et à gauche, et des lignes pleines à 0, 50 et 100. Le plan occupe donc toute la grille : son bord gauche est à x=0, son bord droit à x=100, son bord haut à y=0, son bord bas à y=100.

LIS les coordonnées sur cette grille, ne les estime pas : pour chaque bord de pièce, repère les deux lignes qui l'encadrent et interpole entre elles. Les décimales sont attendues, évite les multiples de 10 systématiques.

Pour chaque pièce, donne les quatre bords de son rectangle, mesurés sur les murs qui la délimitent :

id : identifiant unique slug en minuscules sans espaces (ex: "salon", "chambre-1", "piece-2")
name : nom de la pièce en français avec majuscule (voir les règles de nommage ci-dessous)
x0 : bord gauche, lu sur la graduation horizontale (0-100)
y0 : bord haut, lu sur la graduation verticale (0-100)
x1 : bord droit, lu sur la graduation horizontale (0-100)
y1 : bord bas, lu sur la graduation verticale (0-100)

Contraintes : x1 > x0 et y1 > y0. Ne donne ni centre ni largeur/hauteur, uniquement les bords.

Un plan n'est PAS un pavage : les rectangles ne doivent pas se toucher bord à bord ni couvrir toute la grille. Les murs, cloisons et couloirs occupent de la place qui n'appartient à aucune pièce, et il est normal que des espaces restent vides. Ne découpe jamais une pièce unique en deux rectangles, et ne fusionne jamais deux pièces séparées par une cloison. Deux rectangles ne doivent pas se recouvrir.

RÈGLES DE NOMMAGE — un mauvais nom est plus gênant qu'un nom générique.
N'attribue un nom précis que si tu en as la preuve visuelle :
- une étiquette écrite sur le plan (traduis-la en français : "Bedroom" donne "Chambre") ;
- ou un équipement sans ambiguïté : baignoire, douche ou WC donnent "Salle de bain" ; plaque de cuisson, évier ou plan de travail donnent "Cuisine" ; un lit donne "Chambre" ; une voiture donne "Garage".
Noms autorisés : Salon, Séjour / Salle à manger, Cuisine, Chambre, Salle de bain, WC, Entrée, Couloir, Dressing, Placard, Buanderie, Local technique, Bureau, Terrasse, Balcon, Cave, Garage.
Dans TOUS les autres cas, y compris si tu hésites entre deux noms, utilise "Pièce 1", "Pièce 2", etc. N'invente jamais de variante comme "Séjour 2" ou "Chambre d'appoint", et ne déduis pas l'usage d'une pièce de sa seule taille ou position.

Réponds UNIQUEMENT avec ce JSON valide, sans markdown, sans texte avant ou après :
{
"rooms": [
{ "id": "salon", "name": "Salon", "x0": 10, "y0": 18, "x1": 40, "y1": 43 },
...
],
"confidence": 0.85
}
Si le plan n'est pas lisible ou si tu ne peux pas identifier les pièces, retourne :
{ "rooms": [], "confidence": 0 }`

interface RawRoom {
  id: string
  name: string
  x0: number
  y0: number
  x1: number
  y1: number
}

interface RawGroup {
  id: string
  name: string
  cells: number[]
}

// Deux pièces peuvent revenir avec le même id ; Room.slug étant unique par
// appartement, un doublon ferait disparaître une pièce à la synchronisation.
function withUniqueIds(zones: FloorPlanZone[]): FloorPlanZone[] {
  const used = new Set<string>()

  return zones.map((zone) => {
    const base = zone.id?.trim() || 'piece'
    let id = base
    let suffix = 2
    while (used.has(id)) id = `${base}-${suffix++}`
    used.add(id)
    return id === zone.id ? zone : { ...zone, id }
  })
}

// Les cellules viennent de la détection des murs : la zone est leur réunion,
// et `coordinates` n'en est plus que la boîte englobante, utile aux libellés
// et aux zones héritées du mode rectangle.
function zoneFromGroup(group: RawGroup, cells: GridCell[]): FloorPlanZone | null {
  const members = (Array.isArray(group.cells) ? group.cells : [])
    .map((number) => cells.find((cell) => cell.number === number))
    .filter((cell): cell is GridCell => cell !== undefined)
  if (members.length === 0) return null

  const left = Math.min(...members.map((cell) => cell.x))
  const top = Math.min(...members.map((cell) => cell.y))
  const right = Math.max(...members.map((cell) => cell.x + cell.width))
  const bottom = Math.max(...members.map((cell) => cell.y + cell.height))

  return {
    id: group.id,
    name: group.name,
    coordinates: {
      x: left + (right - left) / 2,
      y: top + (bottom - top) / 2,
      width: right - left,
      height: bottom - top,
    },
    cells: members.map(({ x, y, width, height }) => ({ x, y, width, height })),
  }
}

// Claude renvoie les bords du rectangle, lus sur l'image annotée ; les zones
// sont stockées et éditées en centre + dimensions relatifs au plan d'origine.
function zoneFromRawRoom(room: RawRoom, image: VisionImage): FloorPlanZone | null {
  const topLeft = image.toSourcePercent({
    x: Math.min(room.x0, room.x1),
    y: Math.min(room.y0, room.y1),
  })
  const bottomRight = image.toSourcePercent({
    x: Math.max(room.x0, room.x1),
    y: Math.max(room.y0, room.y1),
  })

  const left = clampPercent(topLeft.x)
  const top = clampPercent(topLeft.y)
  const width = clampPercent(bottomRight.x) - left
  const height = clampPercent(bottomRight.y) - top
  if (width < 1 || height < 1) return null

  return {
    id: room.id,
    name: room.name,
    coordinates: {
      x: left + width / 2,
      y: top + height / 2,
      width,
      height,
    },
  }
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

async function askClaude<T>(
  prompt: string,
  imageBase64: string
): Promise<{ rooms: T[]; confidence: number }> {
  const response = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: imageBase64 },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Réponse Claude inattendue')

  return parseClaudeJson<{ rooms: T[]; confidence: number }>(block.text)
}

// La géométrie est mesurée sur les murs quand ils sont détectables, et le
// modèle s'y limite au regroupement et au nommage. À défaut seulement, il lit
// des coordonnées sur une grille graduée — sensiblement moins précis.
async function analyzePlan(source: Buffer): Promise<{
  zones: FloorPlanZone[]
  confidence: number
  cells: GridCell[] | null
}> {
  const grid = await detectWallGrid(source)

  if (grid) {
    const parsed = await askClaude<RawGroup>(GROUP_PROMPT, grid.base64)
    const zones = parsed.rooms
      .map((group) => zoneFromGroup(group, grid.cells))
      .filter((zone): zone is FloorPlanZone => zone !== null)

    if (zones.length > 0) {
      return { zones: withUniqueIds(zones), confidence: parsed.confidence, cells: grid.cells }
    }
  }

  const image = await prepareFloorPlanForVision(source)
  const parsed = await askClaude<RawRoom>(SEGMENT_PROMPT, image.base64)
  const zones = parsed.rooms
    .map((room) => zoneFromRawRoom(room, image))
    .filter((zone): zone is FloorPlanZone => zone !== null)

  return { zones: withUniqueIds(zones), confidence: parsed.confidence, cells: grid?.cells ?? null }
}

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')
  return session
}

async function requireUnitAccess(unitId: string) {
  const session = await requireSession()

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: {
      propertyId: true,
      floorPlanUrl: true,
      floorPlanZones: true,
      floorPlanCells: true,
      floorPlans: true,
    },
  })
  if (!unit) throw new Error('Appartement introuvable')

  const access = await checkPropertyAccess(unit.propertyId, session.user.id)
  if (!access.hasAccess || !canWriteProperty(access.role)) {
    throw new Error('Droits insuffisants')
  }

  return { session, unit }
}

function plansFromUnit(unit: {
  floorPlanUrl: string | null
  floorPlanZones: unknown
  floorPlanCells: unknown
  floorPlans: unknown
}): StoredFloorPlan[] {
  return listFloorPlans({
    floorPlanUrl: unit.floorPlanUrl,
    floorPlanZones: unit.floorPlanZones as FloorPlanZone[] | null,
    floorPlanCells: unit.floorPlanCells as FloorPlanCell[] | null,
    floorPlans: unit.floorPlans as StoredFloorPlan[] | null,
  })
}

function persistPlansData(plans: StoredFloorPlan[]) {
  const primary = plans[0]
  return {
    floorPlans: (plans.length > 0 ? plans : Prisma.DbNull) as unknown as Prisma.InputJsonValue,
    floorPlanUrl: primary?.url ?? null,
    floorPlanZones: (primary?.zones ??
      Prisma.DbNull) as unknown as Prisma.InputJsonValue,
    floorPlanCells: (primary?.cells ??
      Prisma.DbNull) as unknown as Prisma.InputJsonValue,
  }
}

function resolvePlan(plans: StoredFloorPlan[], planId?: string) {
  if (planId) {
    const match = plans.find((plan) => plan.id === planId)
    if (!match) throw new Error('Plan introuvable')
    return match
  }
  return plans[0] ?? null
}

// Room.slug is the stable link back to a FloorPlanZone.id — the zone's
// coordinates can move and its Room can be renamed independently, but the
// slug never changes, so matching never depends on re-deriving it from name.
async function syncRoomsWithZones(
  unitId: string,
  zones: FloorPlanZone[],
  previousZoneIds: string[]
) {
  // Zones can arrive with duplicate ids (AI segmentation glitch, stale
  // client state) — keep the last occurrence so slug (unique per unit)
  // never collides during the create/update pass below.
  const uniqueZones = Array.from(new Map(zones.map((zone) => [zone.id, zone])).values())

  const zoneIds = new Set(uniqueZones.map((zone) => zone.id))
  const existingRooms = await prisma.room.findMany({ where: { unitId } })

  const staleRoomIds = existingRooms
    .filter(
      (room) => previousZoneIds.includes(room.slug) && !zoneIds.has(room.slug)
    )
    .map((room) => room.id)
  if (staleRoomIds.length > 0) {
    await prisma.room.deleteMany({ where: { id: { in: staleRoomIds } } })
  }

  const reserved = new Set(
    existingRooms
      .filter((room) => !previousZoneIds.includes(room.slug))
      .map((room) => room.slug)
  )
  const scopedZones = uniqueZones.map((zone) => {
    if (!reserved.has(zone.id)) {
      reserved.add(zone.id)
      return zone
    }
    let suffix = 2
    let id = `${zone.id}-${suffix}`
    while (reserved.has(id)) id = `${zone.id}-${++suffix}`
    reserved.add(id)
    return { ...zone, id }
  })

  for (const zone of scopedZones) {
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

  return scopedZones
}

export async function uploadFloorPlan(
  unitId: string,
  formData: FormData,
  planId?: string
) {
  const { session, unit } = await requireUnitAccess(unitId)

  const file = formData.get('file')
  if (!(file instanceof File)) throw new Error('Fichier invalide')

  const path = `${session.user.id}/floor-plans/${unitId}/${buildDocumentFilename(file.name)}`

  const uploadFormData = new FormData()
  uploadFormData.append('file', file)
  uploadFormData.append('bucket', DOCUMENTS_BUCKET)
  uploadFormData.append('path', path)
  const uploaded = await uploadDocumentFile(uploadFormData)

  const plans = plansFromUnit(unit)
  const existing = resolvePlan(plans, planId)
  const nextPlans = existing
    ? plans.map((plan) =>
        plan.id === existing.id ? { ...plan, url: uploaded.url } : plan
      )
    : [
        {
          id: crypto.randomUUID(),
          name: 'Rez-de-chaussée',
          url: uploaded.url,
          zones: [],
          cells: null,
        },
      ]

  await prisma.unit.update({
    where: { id: unitId },
    data: persistPlansData(nextPlans),
  })

  revalidatePath('/properties/[slug]/units/[unitSlug]', 'page')
  revalidatePath('/properties/[slug]', 'page')

  return { url: uploaded.url, success: true, planId: (existing ?? nextPlans[0]).id }
}

export async function segmentFloorPlan(
  unitId: string,
  imageUrl: string,
  planId?: string
) {
  const { unit } = await requireUnitAccess(unitId)

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Analyse IA non disponible')
  }

  let zones: FloorPlanZone[]
  let confidence: number
  let cells: GridCell[] | null

  try {
    const source = await readStoredFile(imageUrl, DOCUMENTS_BUCKET)
    const analysis = await analyzePlan(source)
    zones = analysis.zones
    confidence = analysis.confidence
    cells = analysis.cells
  } catch (error) {
    console.error("Erreur lors de l'analyse du plan par l'IA", error)
    const detail =
      process.env.NODE_ENV === 'production' || !(error instanceof Error)
        ? ''
        : ` (${error.message})`
    throw new Error(
      `L'analyse du plan a échoué. Vous pouvez définir les pièces manuellement.${detail}`
    )
  }

  const plans = plansFromUnit(unit)
  const target = resolvePlan(plans, planId)
  if (!target) throw new Error('Plan introuvable')

  const mappedCells = cells
    ? cells.map(({ x, y, width, height }) => ({ x, y, width, height }))
    : null

  const synced = await syncRoomsWithZones(
    unitId,
    zones,
    target.zones.map((zone) => zone.id)
  )

  const nextPlans = plans.map((plan) =>
    plan.id === target.id
      ? { ...plan, zones: synced, cells: mappedCells }
      : plan
  )

  await prisma.unit.update({
    where: { id: unitId },
    data: persistPlansData(nextPlans),
  })

  revalidatePath('/properties/[slug]/units/[unitSlug]', 'page')
  revalidatePath('/properties/[slug]', 'page')

  return { zones: synced, cells: mappedCells, confidence, success: true }
}

export async function updateFloorPlanZones(
  unitId: string,
  zones: FloorPlanZone[],
  planId?: string
) {
  const { unit } = await requireUnitAccess(unitId)
  const plans = plansFromUnit(unit)
  const target = resolvePlan(plans, planId)
  if (!target) throw new Error('Plan introuvable')

  const synced = await syncRoomsWithZones(
    unitId,
    zones,
    target.zones.map((zone) => zone.id)
  )

  const nextPlans = plans.map((plan) =>
    plan.id === target.id ? { ...plan, zones: synced } : plan
  )

  await prisma.unit.update({
    where: { id: unitId },
    data: persistPlansData(nextPlans),
  })

  revalidatePath('/properties/[slug]/units/[unitSlug]', 'page')
  revalidatePath('/properties/[slug]', 'page')

  return { success: true, zones: synced }
}

export async function addFloorPlan(unitId: string) {
  const { unit } = await requireUnitAccess(unitId)
  const plans = plansFromUnit(unit)
  const created = emptyFloorPlan(plans.length)
  const nextPlans = [...plans, created]

  await prisma.unit.update({
    where: { id: unitId },
    data: persistPlansData(nextPlans),
  })

  revalidatePath('/properties/[slug]/units/[unitSlug]', 'page')
  revalidatePath('/properties/[slug]', 'page')

  return created
}

export async function deleteFloorPlan(unitId: string, planId?: string) {
  const { unit } = await requireUnitAccess(unitId)
  const plans = plansFromUnit(unit)
  const target = resolvePlan(plans, planId)

  const toDelete = planId ? (target ? [target] : []) : plans

  for (const plan of toDelete) {
    if (plan.url) {
      const path = extractStoragePath(plan.url, DOCUMENTS_BUCKET)
      if (path) {
        try {
          await deleteFile(DOCUMENTS_BUCKET, path)
        } catch (error) {
          console.error('Erreur lors de la suppression du plan', error)
        }
      }
    }
    await syncRoomsWithZones(unitId, [], plan.zones.map((zone) => zone.id))
  }

  const remaining = planId
    ? plans.filter((plan) => plan.id !== planId)
    : []

  await prisma.unit.update({
    where: { id: unitId },
    data: persistPlansData(remaining),
  })

  revalidatePath('/properties/[slug]/units/[unitSlug]', 'page')
  revalidatePath('/properties/[slug]', 'page')

  return { success: true }
}
