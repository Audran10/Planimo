'use client'

import { useState } from 'react'
import { FileUp } from 'lucide-react'
import { Button } from '@/core/components/ui/button'
import { DocumentUploadDialog } from '@/features/documents/components/document-upload-dialog'

interface AddDocumentButtonProps {
  propertySlug: string
  unitSlug: string
  unitId?: string
  roomId?: string
  tenantId?: string
  workOrderId?: string
  label?: string
  size?: 'sm' | 'default'
  onSuccess?: () => void
}

export function AddDocumentButton({
  propertySlug,
  unitSlug,
  unitId,
  roomId,
  tenantId,
  workOrderId,
  label = 'Ajouter un document',
  size = 'default',
  onSuccess,
}: AddDocumentButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size={size}
        className="cursor-pointer gap-2"
        onClick={() => setOpen(true)}
      >
        <FileUp className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
      <DocumentUploadDialog
        propertySlug={propertySlug}
        unitSlug={unitSlug}
        unitId={unitId}
        roomId={roomId}
        tenantId={tenantId}
        workOrderId={workOrderId}
        open={open}
        onOpenChange={setOpen}
        onSuccess={onSuccess}
      />
    </>
  )
}
