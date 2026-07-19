export type TenantStatus = 'active' | 'expired' | 'upcoming'

export function isTenantActive(tenant: { leaseEnd?: Date | null }): boolean {
  return !tenant.leaseEnd || tenant.leaseEnd > new Date()
}

export function getTenantStatus(tenant: {
  leaseStart: Date
  leaseEnd?: Date | null
}): TenantStatus {
  const now = new Date()
  if (tenant.leaseStart > now) return 'upcoming'
  if (tenant.leaseEnd && tenant.leaseEnd <= now) return 'expired'
  return 'active'
}

export type LeaseStatusVariant = 'success' | 'warning' | 'destructive'
export type LeaseStatusIconName = 'XCircle' | 'AlertCircle' | 'FileCheck'

export interface TenantLeaseStatus {
  label: string
  variant: LeaseStatusVariant
  icon: LeaseStatusIconName
}

export function getTenantLeaseStatus(tenant: {
  leaseEnd?: Date | null
  documents?: { type: string }[]
}): TenantLeaseStatus {
  const now = new Date()
  const isExpired = Boolean(tenant.leaseEnd && new Date(tenant.leaseEnd) < now)
  const hasLeaseDocument = tenant.documents?.some((doc) => doc.type === 'lease') ?? false

  if (isExpired) {
    return { label: 'Bail expiré', variant: 'destructive', icon: 'XCircle' }
  }
  if (!hasLeaseDocument) {
    return { label: 'Contrat manquant', variant: 'warning', icon: 'AlertCircle' }
  }
  return { label: 'Bail actif', variant: 'success', icon: 'FileCheck' }
}
