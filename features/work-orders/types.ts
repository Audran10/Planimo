import type { WorkOrderStatus } from '@/core/types'

export interface WorkOrder {
  id: string
  unitId?: string | null
  roomId?: string | null
  description: string
  contractor?: string | null
  amount?: number | null
  interventionDate?: Date | null
  status: WorkOrderStatus
  createdAt: Date
  updatedAt: Date
}

export interface CreateWorkOrderInput {
  description: string
  contractor?: string
  amount?: number
  interventionDate?: Date
  status?: WorkOrderStatus
  unitId?: string
  roomId?: string
}

export interface UpdateWorkOrderInput {
  description?: string
  contractor?: string
  amount?: number
  interventionDate?: Date
  status?: WorkOrderStatus
  unitId?: string
  roomId?: string
}
