import type { FloorPlanZone, PropertyType, WorkOrderStatus } from '@/core/types'
import type { PropertyRole } from '@/features/properties/types'
import type { Document } from '@/features/documents/types'

export interface Unit {
  id: string
  propertyId: string
  name: string
  slug: string
  floor?: number | null
  surface?: number | null
  floorPlanUrl?: string | null
  floorPlanZones?: FloorPlanZone[] | null
  createdAt: Date
  updatedAt: Date
}

export interface UnitWithMeta extends Unit {
  isOccupied: boolean
  documentsCount: number
}

export interface UnitRoom {
  id: string
  unitId: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface UnitTenant {
  id: string
  unitId: string
  fullName: string
  email?: string | null
  phone?: string | null
  leaseStart: Date
  leaseEnd?: Date | null
  monthlyRent: number
  deposit?: number | null
}

export interface UnitWorkOrder {
  id: string
  description: string
  contractor?: string | null
  amount?: number | null
  interventionDate?: Date | null
  status: WorkOrderStatus
  createdAt: Date
}

export interface UnitDetail extends Unit {
  property: {
    id: string
    name: string
    slug: string
    type: PropertyType
  }
  rooms: UnitRoom[]
  tenants: UnitTenant[]
  documents: Document[]
  workOrders: UnitWorkOrder[]
  role: PropertyRole
}

export interface CreateUnitInput {
  name: string
  floor?: number
  surface?: number
}

export interface UpdateUnitInput {
  name?: string
  floor?: number
  surface?: number
}
