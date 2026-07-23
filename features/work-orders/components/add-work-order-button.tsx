'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/core/components/ui/button'
import { WorkOrderFormDialog } from '@/features/work-orders/components/work-order-form-dialog'

interface AddWorkOrderButtonProps {
  unitId: string
  roomId?: string
  label?: string
}

export function AddWorkOrderButton({
  unitId,
  roomId,
  label = 'Ajouter une intervention',
}: AddWorkOrderButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        className="cursor-pointer gap-2"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        {label}
      </Button>
      <WorkOrderFormDialog
        mode="create"
        unitId={unitId}
        roomId={roomId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
