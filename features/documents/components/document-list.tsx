'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, FileX, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/core/components/ui/badge'
import { Button } from '@/core/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/core/components/ui/alert-dialog'
import { deleteDocument } from '@/features/documents/actions/documents'
import { documentTypeLabels, DocumentTypeIcon } from '@/features/documents/constants'
import type { Document } from '@/features/documents/types'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function DocumentRow({ document }: { document: Document }) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteDocument(document.id)
      toast.success('Document supprimé')
      setDeleteOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de la suppression'
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <li className="flex items-center gap-3 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <DocumentTypeIcon fileType={document.fileType} className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{document.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary">{documentTypeLabels[document.type]}</Badge>
            <span className="text-xs text-muted-foreground">
              {dateFormatter.format(document.createdAt)}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Télécharger"
          className="cursor-pointer"
          nativeButton={false}
          render={<a href={document.fileUrl} target="_blank" rel="noopener noreferrer" />}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Supprimer"
          className="cursor-pointer text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </li>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. « {document.name} » sera définitivement
              supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function DocumentList({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <FileX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Aucun document pour le moment</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {documents.map((document) => (
        <DocumentRow key={document.id} document={document} />
      ))}
    </ul>
  )
}
