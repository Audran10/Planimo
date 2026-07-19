'use client'

import { useCallback, useState } from 'react'
import { uploadDocumentFile } from '@/features/documents/actions/documents'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export interface FileUploadResult {
  url: string
  fileType: string
  fileSize: number
}

function isAcceptedFile(file: File) {
  return file.type === 'application/pdf' || file.type.startsWith('image/')
}

export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const handleFileChange = useCallback(
    (selected: File | null): boolean => {
      setError(null)

      if (preview) URL.revokeObjectURL(preview)

      if (!selected) {
        setFile(null)
        setPreview(null)
        return false
      }

      if (!isAcceptedFile(selected)) {
        setError('Format non supporté. Utilisez un PDF ou une image.')
        setFile(null)
        setPreview(null)
        return false
      }

      if (selected.size > MAX_SIZE) {
        setError('Le fichier dépasse la taille maximale de 10 Mo.')
        setFile(null)
        setPreview(null)
        return false
      }

      setFile(selected)
      setPreview(selected.type.startsWith('image/') ? URL.createObjectURL(selected) : null)
      return true
    },
    [preview]
  )

  const upload = useCallback(
    async (fileToUpload: File, bucket: string, path: string): Promise<FileUploadResult> => {
      setUploading(true)
      setError(null)
      setProgress(10)

      const interval = setInterval(() => {
        setProgress((current) => (current < 90 ? current + 10 : current))
      }, 150)

      try {
        const formData = new FormData()
        formData.append('file', fileToUpload)
        formData.append('bucket', bucket)
        formData.append('path', path)

        const result = await uploadDocumentFile(formData)
        setProgress(100)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de l'upload"
        setError(message)
        throw err
      } finally {
        clearInterval(interval)
        setUploading(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    setError(null)
    setProgress(0)
    setUploading(false)
  }, [preview])

  return { file, preview, uploading, error, progress, handleFileChange, upload, reset }
}
