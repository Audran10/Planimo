import { File, FileText, Image as ImageIcon } from 'lucide-react'
import type { DocumentType } from '@/core/types'

export const documentTypeLabels: Record<DocumentType, string> = {
  lease: 'Bail',
  inventory: 'État des lieux',
  invoice: 'Facture',
  insurance: 'Assurance',
  diagnostic: 'Diagnostic',
  other: 'Autre',
}

export function DocumentTypeIcon({
  fileType,
  className,
}: {
  fileType: string
  className?: string
}) {
  if (fileType === 'application/pdf') {
    return <FileText className={className} aria-hidden="true" />
  }
  if (fileType.startsWith('image/')) {
    return <ImageIcon className={className} aria-hidden="true" />
  }
  return <File className={className} aria-hidden="true" />
}
