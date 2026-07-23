'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/core/components/ui/button'
import { PropertyFormDialog } from '@/features/properties/components/property-form-dialog'

export function NewPropertyButton({
  label = 'Nouveau bien',
}: {
  label?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="cursor-pointer gap-2">
        <Plus className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
      <PropertyFormDialog mode="create" open={open} onOpenChange={setOpen} />
    </>
  )
}
