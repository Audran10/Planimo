import type { PropertyType } from '@/core/types'

export interface Property {
  id: string
  ownerId: string
  name: string
  address: string
  type: PropertyType
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreatePropertyInput {
  name: string
  address: string
  type: PropertyType
  description?: string
}
