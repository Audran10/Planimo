'use client'

import { useState } from 'react'
import { UserX } from 'lucide-react'
import { Button } from '@/core/components/ui/button'
import { TenantCard } from '@/features/tenants/components/tenant-card'
import { TenantFormDialog } from '@/features/tenants/components/tenant-form-dialog'
import type { TenantWithDocuments } from '@/features/tenants/types'

type TenantSummary = Pick<
  TenantWithDocuments,
  | 'id'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'leaseStart'
  | 'leaseEnd'
  | 'monthlyRent'
  | 'deposit'
  | 'documents'
>

interface TenantSectionProps {
  tenant: TenantSummary | null
  unitId: string
  propertySlug: string
  unitSlug: string
}

export function TenantSection({
  tenant,
  unitId,
  propertySlug,
  unitSlug,
}: TenantSectionProps) {
  const [createOpen, setCreateOpen] = useState(false)

  if (tenant) {
    return (
      <TenantCard
        tenant={tenant}
        unitId={unitId}
        propertySlug={propertySlug}
        unitSlug={unitSlug}
      />
    )
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <UserX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Aucun locataire</p>
        <Button
          variant="outline"
          className="cursor-pointer gap-2"
          onClick={() => setCreateOpen(true)}
        >
          Ajouter un locataire
        </Button>
      </div>

      <TenantFormDialog
        mode="create"
        unitId={unitId}
        propertySlug={propertySlug}
        unitSlug={unitSlug}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  )
}
