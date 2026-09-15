import type { FloorPlanCell, FloorPlanZone } from '@/core/types'

export interface StoredFloorPlan {
  id: string
  name: string
  url: string | null
  zones: FloorPlanZone[]
  cells: FloorPlanCell[] | null
}

export function defaultFloorPlanName(index: number): string {
  if (index <= 0) return 'Rez-de-chaussée'
  if (index === 1) return '1er étage'
  return `${index}e étage`
}

export function listFloorPlans(unit: {
  floorPlanUrl?: string | null
  floorPlanZones?: FloorPlanZone[] | null
  floorPlanCells?: FloorPlanCell[] | null
  floorPlans?: StoredFloorPlan[] | null
}): StoredFloorPlan[] {
  if (Array.isArray(unit.floorPlans) && unit.floorPlans.length > 0) {
    return unit.floorPlans
  }
  if (!unit.floorPlanUrl) return []
  return [
    {
      id: 'default',
      name: defaultFloorPlanName(0),
      url: unit.floorPlanUrl,
      zones: unit.floorPlanZones ?? [],
      cells: unit.floorPlanCells ?? null,
    },
  ]
}

export function emptyFloorPlan(index: number): StoredFloorPlan {
  return {
    id: crypto.randomUUID(),
    name: defaultFloorPlanName(index),
    url: null,
    zones: [],
    cells: null,
  }
}
