import type { FloorPlanZone } from '@/core/types'

export interface Unit {
  id: string
  propertyId: string
  name: string
  floor?: number | null
  surface?: number | null
  floorPlanUrl?: string | null
  floorPlanZones?: FloorPlanZone[] | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateUnitInput {
  propertyId: string
  name: string
  floor?: number
  surface?: number
}
