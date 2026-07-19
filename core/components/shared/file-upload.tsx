'use client'

import { useRef, useState, type DragEvent } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import { Button } from '@/core/components/ui/button'
import { cn } from '@/core/lib/utils'
import { useFileUpload } from '@/core/hooks/use-file-upload'

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function matchesAccept(file: File, accept: string) {
  const patterns = accept
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean)
  if (patterns.length === 0) return true

  return patterns.some((pattern) => {
    if (pattern.endsWith('/*')) return file.type.startsWith(pattern.slice(0, -1))
    return file.type === pattern
  })
}

interface FileUploadProps {
  accept?: string
  maxSize?: number
  label?: string
  bucket?: string
  path?: string
  onUpload?: (url: string) => void
  onFileSelect?: (file: File | null) => void
  disabled?: boolean
}

export function FileUpload({
  accept = 'application/pdf,image/*',
  maxSize = 10 * 1024 * 1024,
  label = 'Glissez un fichier ou cliquez pour parcourir',
  bucket,
  path,
  onUpload,
  onFileSelect,
  disabled,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)
  const { file, preview, uploading, error, progress, handleFileChange, upload, reset } =
    useFileUpload()

  async function selectFile(selected: File | null) {
    setCustomError(null)

    if (selected && !matchesAccept(selected, accept)) {
      setCustomError('Ce type de fichier n’est pas accepté.')
      return
    }

    const accepted = handleFileChange(selected)
    onFileSelect?.(selected)

    if (accepted && selected && bucket && path && onUpload) {
      try {
        const result = await upload(selected, bucket, path)
        onUpload(result.url)
      } catch {
        // error already surfaced via hook state
      }
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragActive(false)
    if (disabled) return
    void selectFile(event.dataTransfer.files?.[0] ?? null)
  }

  function handleRemove() {
    reset()
    setCustomError(null)
    onFileSelect?.(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const displayError = customError ?? error
  const maxSizeLabel = `${Math.round(maxSize / (1024 * 1024))} Mo max`

  return (
    <div className="space-y-2">
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
          }}
          onDragOver={(event) => {
            event.preventDefault()
            if (!disabled) setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center transition-colors',
            dragActive && 'border-primary bg-primary/5',
            disabled && 'pointer-events-none opacity-50'
          )}
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">PDF ou image · {maxSizeLabel}</p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={disabled}
            onChange={(event) => void selectFile(event.target.files?.[0] ?? null)}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={file.name}
              className="h-10 w-10 shrink-0 rounded object-cover"
            />
          ) : (
            <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            {uploading && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer shrink-0"
            onClick={handleRemove}
            disabled={disabled || uploading}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Retirer le fichier</span>
          </Button>
        </div>
      )}

      {displayError && <p className="text-sm text-destructive">{displayError}</p>}
    </div>
  )
}
