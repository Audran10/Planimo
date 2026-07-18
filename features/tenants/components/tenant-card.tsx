import type { Tenant } from '../types'

export function TenantCard({ tenant }: { tenant: Tenant }) {
  return (
    <div>
      <h3>{tenant.fullName}</h3>
    </div>
  )
}
