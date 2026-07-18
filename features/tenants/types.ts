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

export interface CreateTenantInput {
  unitId: string
  fullName: string
  email?: string
  phone?: string
  leaseStart: Date
  leaseEnd?: Date
  monthlyRent: number
  deposit?: number
}
