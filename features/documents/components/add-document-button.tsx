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
  label?: string
}

export function AddDocumentButton({
  propertySlug,
  unitSlug,
  unitId,
  roomId,
  tenantId,
  label = 'Ajouter un document',
}: AddDocumentButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
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
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
