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
  if (fileType === 'application/pdf') return <FileText className={className} />
  if (fileType.startsWith('image/')) return <ImageIcon className={className} />
  return <File className={className} />
}
