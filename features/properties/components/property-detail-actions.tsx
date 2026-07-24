'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { deleteProperty } from '@/features/properties/actions/properties'
import { PropertyFormDialog } from '@/features/properties/components/property-form-dialog'
import type { PropertyDetail } from '@/features/properties/types'

export function PropertyDetailActions({
  property,
}: {
  property: PropertyDetail
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canEdit = property.role === 'owner' || property.role === 'admin'
  const canDelete = property.role === 'owner'

  if (!canEdit && !canDelete) return null

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteProperty(property.id)
      toast.success('Bien supprimé')
      router.push('/properties')
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de la suppression'
      )
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {canEdit && (
        <Button
          variant="outline"
          className="cursor-pointer gap-2"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Modifier
        </Button>
      )}
      {canDelete && (
        <Button
          variant="outline"
          className="cursor-pointer gap-2 text-destructive hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Supprimer
        </Button>
      )}

      {canEdit && (
        <PropertyFormDialog
          mode="edit"
          property={property}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      {canDelete && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce bien ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. « {property.name} » et tous ses
                appartements associés seront définitivement supprimés.
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
      )}
    </div>
  )
}
