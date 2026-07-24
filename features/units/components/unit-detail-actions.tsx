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
import { deleteUnit } from '@/features/units/actions/units'
import { UnitFormDialog } from '@/features/units/components/unit-form-dialog'
import type { UnitDetail } from '@/features/units/types'
import { getUnitLabel } from '@/core/lib/property-labels'

export function UnitDetailActions({ unit }: { unit: UnitDetail }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canEdit =
    unit.role === 'owner' || unit.role === 'admin' || unit.role === 'editor'
  const canDelete = unit.role === 'owner' || unit.role === 'admin'
  const unitLabel = getUnitLabel(unit.property.type).toLowerCase()

  if (!canEdit && !canDelete) return null

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteUnit(unit.id)
      toast.success(`${getUnitLabel(unit.property.type)} supprimé`)
      router.push(`/properties/${unit.property.slug}`)
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
        <UnitFormDialog
          mode="edit"
          propertyId={unit.propertyId}
          propertySlug={unit.property.slug}
          propertyType={unit.property.type}
          unit={unit}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      {canDelete && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer {unitLabel === 'unité' ? 'cette' : 'ce'} {unitLabel} ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. « {unit.name} » et toutes ses
                données associées seront définitivement supprimés.
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
