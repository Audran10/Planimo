'use client'

import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/components/ui/table'
import { LeaseStatusBadge } from '@/features/tenants/components/lease-status-badge'
import type { TenantListItem } from '@/features/tenants/types'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const rentFormatter = new Intl.NumberFormat('fr-FR')

export function TenantsTable({ tenants }: { tenants: TenantListItem[] }) {
  const router = useRouter()

  return (
    <Table aria-label="Liste des locataires actifs">
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Nom</TableHead>
          <TableHead scope="col">Bien</TableHead>
          <TableHead scope="col">Appartement</TableHead>
          <TableHead scope="col">Loyer</TableHead>
          <TableHead scope="col">Début bail</TableHead>
          <TableHead scope="col">Fin bail</TableHead>
          <TableHead scope="col">Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tenants.map((tenant) => (
          <TableRow
            key={tenant.id}
            className="cursor-pointer"
            onClick={() =>
              router.push(`/properties/${tenant.propertySlug}/units/${tenant.unitSlug}`)
            }
          >
            <TableCell className="font-medium">{tenant.fullName}</TableCell>
            <TableCell>{tenant.propertyName}</TableCell>
            <TableCell>{tenant.unitName}</TableCell>
            <TableCell>{rentFormatter.format(tenant.monthlyRent)} €/mois</TableCell>
            <TableCell>{dateFormatter.format(tenant.leaseStart)}</TableCell>
            <TableCell>
              {tenant.leaseEnd ? dateFormatter.format(tenant.leaseEnd) : 'En cours'}
            </TableCell>
            <TableCell>
              <LeaseStatusBadge tenant={tenant} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
