'use client'

import { useRef, useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/core/components/ui/button'
import { attachFilesToWorkOrder } from '@/features/work-orders/actions/work-orders'
import type { Document } from '@/features/documents/types'

const ACCEPT = 'application/pdf,image/*'

export function AttachWorkOrderFilesButton({
  workOrderId,
  label = 'Joindre',
  size = 'sm',
  onAttached,
}: {
  workOrderId: string
  label?: string
  size?: 'sm' | 'default'
  onAttached?: (documents: Document[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleChange(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return

    const formData = new FormData()
    for (const file of Array.from(fileList)) {
      formData.append('files', file)
    }
    if (inputRef.current) inputRef.current.value = ''

    setUploading(true)
    try {
      const documents = await attachFilesToWorkOrder(workOrderId, formData)
      toast.success(
        documents.length > 1
          ? `${documents.length} documents ajoutés`
          : 'Document ajouté'
      )
      onAttached?.(documents)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de l’ajout du document'
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        className="cursor-pointer gap-2"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <FileUp className="h-4 w-4" aria-hidden="true" />
        )}
        {uploading ? 'Ajout...' : label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        disabled={uploading}
        onChange={(event) => void handleChange(event.target.files)}
      />
    </>
  )
}
