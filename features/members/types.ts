import type { MemberRole } from '@/core/types'

export interface PropertyMember {
  id: string
  propertyId: string
  userId: string
  role: MemberRole
  invitedAt: Date
  acceptedAt?: Date | null
}

export type { MemberRole }
