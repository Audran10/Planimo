import type { DocumentType } from '@/core/types'

export interface Tenant {
  id: string
  unitId: string
  fullName: string
  email?: string | null
  phone?: string | null
  leaseStart: Date
  leaseEnd?: Date | null
  monthlyRent: number
  deposit?: number | null
  createdAt: Date
  updatedAt: Date
}

export interface TenantDocument {
  id: string
  name: string
  fileUrl: string
  fileType: string
  fileSize?: number | null
  type: DocumentType
  createdAt: Date
}

export interface TenantWithDocuments extends Tenant {
  documents: TenantDocument[]
}

export interface TenantListItem extends Tenant {
  documents: TenantDocument[]
  unitName: string
  unitSlug: string
  propertyName: string
  propertySlug: string
}

export interface CreateTenantInput {
  fullName: string
  email?: string
  phone?: string
  leaseStart: Date
  leaseEnd?: Date
  monthlyRent: number
  deposit?: number
}

export interface UpdateTenantInput {
  fullName?: string
  email?: string
  phone?: string
  leaseStart?: Date
  leaseEnd?: Date
  monthlyRent?: number
  deposit?: number
}
