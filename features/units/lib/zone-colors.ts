import type { FloorPlanZone } from '@/core/types'
import {
  boxesTouch,
  cellsShareEdge,
  zoneBox,
} from '@/features/units/lib/zone-geometry'

export interface ZoneColor {
  fill: string
  stroke: string
}

/** Palette assez large pour colorier un étage sans réutiliser trop tôt. */
export const ZONE_PALETTE: ZoneColor[] = [
  { fill: 'rgba(99, 102, 241, 0.18)', stroke: '#4f46e5' },
  { fill: 'rgba(16, 185, 129, 0.18)', stroke: '#059669' },
  { fill: 'rgba(245, 158, 11, 0.18)', stroke: '#d97706' },
  { fill: 'rgba(239, 68, 68, 0.18)', stroke: '#dc2626' },
  { fill: 'rgba(14, 165, 233, 0.18)', stroke: '#0284c7' },
  { fill: 'rgba(168, 85, 247, 0.18)', stroke: '#7c3aed' },
  { fill: 'rgba(244, 63, 94, 0.18)', stroke: '#e11d48' },
  { fill: 'rgba(20, 184, 166, 0.18)', stroke: '#0d9488' },
  { fill: 'rgba(234, 179, 8, 0.2)', stroke: '#ca8a04' },
  { fill: 'rgba(249, 115, 22, 0.18)', stroke: '#ea580c' },
  { fill: 'rgba(132, 204, 22, 0.2)', stroke: '#65a30d' },
  { fill: 'rgba(6, 182, 212, 0.18)', stroke: '#0891b2' },
  { fill: 'rgba(217, 70, 239, 0.18)', stroke: '#c026d3' },
  { fill: 'rgba(251, 146, 60, 0.2)', stroke: '#c2410c' },
  { fill: 'rgba(52, 211, 153, 0.18)', stroke: '#059669' },
  { fill: 'rgba(96, 165, 250, 0.2)', stroke: '#2563eb' },
  { fill: 'rgba(192, 132, 252, 0.2)', stroke: '#9333ea' },
  { fill: 'rgba(248, 113, 113, 0.2)', stroke: '#b91c1c' },
  { fill: 'rgba(45, 212, 191, 0.18)', stroke: '#0f766e' },
  { fill: 'rgba(163, 230, 53, 0.2)', stroke: '#4d7c0f' },
]

export function zonesAreAdjacent(a: FloorPlanZone, b: FloorPlanZone): boolean {
  if (a.cells && a.cells.length > 0 && b.cells && b.cells.length > 0) {
    return a.cells.some((cellA) =>
      b.cells!.some((cellB) => cellsShareEdge(cellA, cellB))
    )
  }
  return boxesTouch(zoneBox(a), zoneBox(b))
}

/**
 * Coloration gloutonne : deux pièces qui se touchent n'ont pas la même
 * couleur tant que la palette le permet.
 */
export function assignZoneColors(zones: FloorPlanZone[]): Map<string, ZoneColor> {
  const neighbors = new Map<string, string[]>()
  for (const zone of zones) neighbors.set(zone.id, [])

  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      if (!zonesAreAdjacent(zones[i], zones[j])) continue
      neighbors.get(zones[i].id)!.push(zones[j].id)
      neighbors.get(zones[j].id)!.push(zones[i].id)
    }
  }

  const ordered = [...zones].sort(
    (a, b) => (neighbors.get(b.id)?.length ?? 0) - (neighbors.get(a.id)?.length ?? 0)
  )
  const colorIndex = new Map<string, number>()

  for (const zone of ordered) {
    const used = new Set(
      (neighbors.get(zone.id) ?? [])
        .map((id) => colorIndex.get(id))
        .filter((index): index is number => index !== undefined)
    )
    let next = 0
    while (used.has(next) && next < ZONE_PALETTE.length) next++
    colorIndex.set(zone.id, next % ZONE_PALETTE.length)
  }

  return new Map(
    zones.map((zone) => [
      zone.id,
      ZONE_PALETTE[colorIndex.get(zone.id) ?? 0],
    ])
  )
}
