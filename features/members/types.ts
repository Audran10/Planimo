import type { MemberRole } from '@/core/types'

export interface PropertyMember {
  id: string
  propertyId: string
  userId: string
  role: MemberRole
  invitedAt: Date
  acceptedAt?: Date | null
}

export interface PendingInvitation {
  propertyId: string
  propertyName: string
  propertySlug: string
  propertyAddress: string
  role: MemberRole
  invitedAt: Date
  invitedBy: string
}

export type { MemberRole }
