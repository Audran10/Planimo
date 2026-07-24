'use client'

import { useRef, useState, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/core/components/ui/button'
import { cn } from '@/core/lib/utils'
import {
  deleteFloorPlan,
  segmentFloorPlan,
  uploadFloorPlan,
} from '@/features/units/actions/floor-plan'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024

type Stage = 'idle' | 'uploading' | 'uploaded' | 'analyzing' | 'analyzed'

async function convertPdfToImage(file: File): Promise<File> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 2 })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height

  await page.render({ canvas, viewport }).promise

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  )
  if (!blob) throw new Error('Impossible de convertir le PDF en image')

  const baseName = file.name.replace(/\.pdf$/i, '')
  return new File([blob], `${baseName}.png`, { type: 'image/png' })
}

export function FloorPlanUpload({ unitId }: { unitId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [aiUnavailable, setAiUnavailable] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [result, setResult] = useState<{ roomsCount: number; confidence: number } | null>(
    null
  )

  async function handleFile(file: File | null) {
    if (!file) return
    setError(null)

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Format non supporté. Utilisez un PDF ou une image (JPEG, PNG, WebP).')
      return
    }

    if (file.size > MAX_SIZE) {
      setError('Le fichier dépasse la taille maximale de 10 Mo.')
      return
    }

    setStage('uploading')
    try {
      const fileToUpload =
        file.type === 'application/pdf' ? await convertPdfToImage(file) : file

      const formData = new FormData()
      formData.append('file', fileToUpload)

      const uploaded = await uploadFloorPlan(unitId, formData)
      setUploadedUrl(uploaded.url)
      setStage('uploaded')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload")
      setStage('idle')
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragActive(false)
    void handleFile(event.dataTransfer.files?.[0] ?? null)
  }

  async function handleAnalyze() {
    if (!uploadedUrl) return
    setStage('analyzing')
    setError(null)
    try {
      const analyzed = await segmentFloorPlan(unitId, uploadedUrl)
      setResult({ roomsCount: analyzed.zones.length, confidence: analyzed.confidence })
      setStage('analyzed')
      window.location.reload()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue'
      if (message === 'Analyse IA non disponible') {
        setAiUnavailable(true)
      } else {
        setError(message)
      }
      setStage('uploaded')
    }
  }

  async function handleDelete() {
    try {
      await deleteFloorPlan(unitId)
      toast.success('Plan supprimé')
      setStage('idle')
      setUploadedUrl(null)
      setResult(null)
      setAiUnavailable(false)
      setError(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  if (stage === 'idle' || stage === 'uploading') {
    return (
      <div className="space-y-2">
        <div
          role="button"
          tabIndex={0}
          onClick={() => stage === 'idle' && inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
          }}
          onDragOver={(event) => {
            event.preventDefault()
            if (stage === 'idle') setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={cn(
            'flex min-h-[500px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center transition-colors',
            dragActive && 'border-primary bg-primary/5',
            stage === 'uploading' && 'pointer-events-none opacity-50'
          )}
        >
          {stage === 'uploading' ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Upload en cours...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Glissez le plan (PDF ou image) ou cliquez pour parcourir
              </p>
              <p className="text-xs text-muted-foreground">PDF ou image · 10 Mo max</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            disabled={stage === 'uploading'}
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center gap-4 rounded-lg border border-border px-4 py-8 text-center">
      {uploadedUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={uploadedUrl}
          alt="Plan uploadé"
          className="max-h-64 max-w-full rounded-lg object-contain"
        />
      )}

      {stage === 'analyzing' && (
        <div className="space-y-1">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm font-medium">Claude analyse votre plan...</p>
          <p className="text-xs text-muted-foreground">Estimation : 5 à 15 secondes</p>
        </div>
      )}

      {stage === 'uploaded' && !aiUnavailable && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Plan uploadé. Lancez l&apos;analyse IA pour détecter automatiquement les
            pièces.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center justify-center gap-2">
            <Button className="cursor-pointer gap-2" onClick={handleAnalyze}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Analyser avec l&apos;IA
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer gap-2 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Supprimer le plan
            </Button>
          </div>
        </div>
      )}

      {aiUnavailable && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Analyse IA non disponible. Vous pouvez définir les pièces manuellement.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button className="cursor-pointer" onClick={() => router.refresh()}>
              Passer en mode manuel
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer gap-2 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Supprimer le plan
            </Button>
          </div>
        </div>
      )}

      {stage === 'analyzed' && result && (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {result.roomsCount} pièce{result.roomsCount > 1 ? 's' : ''} détectée
            {result.roomsCount > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            Score de confiance : {Math.round(result.confidence * 100)} %
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button className="cursor-pointer" onClick={() => router.refresh()}>
              Voir le plan interactif
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer gap-2 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Supprimer le plan
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
