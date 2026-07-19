import type { MemberRole, PropertyType } from '@/core/types'
import type { Unit } from '@/features/units/types'

export type PropertyRole = 'owner' | MemberRole

export interface Property {
  id: string
  ownerId: string
  name: string
  slug: string
  address: string
  type: PropertyType
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PropertyWithMeta extends Property {
  unitsCount: number
  role: PropertyRole
}

export interface PropertyMemberWithUser {
  id: string
  propertyId: string
  userId: string
  role: MemberRole
  invitedAt: Date
  acceptedAt: Date | null
  user: {
    id: string
    name: string | null
    email: string
  }
}

export interface PropertyDetail extends Property {
  units: Unit[]
  members: PropertyMemberWithUser[]
  owner: {
    id: string
    name: string | null
    email: string
  }
  role: PropertyRole
}

export interface CreatePropertyInput {
  name: string
  address: string
  type: PropertyType
  description?: string
}

export interface UpdatePropertyInput {
  name?: string
  address?: string
  type?: PropertyType
  description?: string
}
