'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/core/components/ui/button'
import { UnitFormDialog } from '@/features/units/components/unit-form-dialog'
import { getUnitLabel } from '@/core/lib/property-labels'
import type { PropertyType } from '@/core/types'

export function AddUnitButton({
  propertyId,
  propertySlug,
  propertyType,
}: {
  propertyId: string
  propertySlug: string
  propertyType: PropertyType
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        className="cursor-pointer gap-2"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Ajouter un {getUnitLabel(propertyType).toLowerCase()}
      </Button>
      <UnitFormDialog
        mode="create"
        propertyId={propertyId}
        propertySlug={propertySlug}
        propertyType={propertyType}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
