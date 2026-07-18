import type { DocumentType } from '@/core/types'

export interface Document {
  id: string
  unitId?: string | null
  roomId?: string | null
  tenantId?: string | null
  name: string
  fileUrl: string
  fileType: string
  fileSize?: number | null
  type: DocumentType
  createdAt: Date
  updatedAt: Date
}

export interface CreateDocumentInput {
  name: string
  fileUrl: string
  fileType: string
  fileSize?: number
  type: DocumentType
  unitId?: string
  roomId?: string
  tenantId?: string
}
