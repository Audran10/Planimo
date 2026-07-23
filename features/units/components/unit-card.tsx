'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DoorOpen,
  Eye,
  FileText,
  Layers,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader } from '@/core/components/ui/card'
import { Badge } from '@/core/components/ui/badge'
import { Button } from '@/core/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/core/components/ui/dropdown-menu'
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
import type { UnitWithMeta } from '@/features/units/types'
import type { PropertyRole } from '@/features/properties/types'
import { getUnitLabel } from '@/core/lib/property-labels'
import type { PropertyType } from '@/core/types'

interface UnitCardProps {
  unit: UnitWithMeta
  propertySlug: string
  propertyRole: PropertyRole
  propertyType: PropertyType
}

export function UnitCard({
  unit,
  propertySlug,
  propertyRole,
  propertyType,
}: UnitCardProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canEdit =
    propertyRole === 'owner' || propertyRole === 'admin' || propertyRole === 'editor'
  const canDelete = propertyRole === 'owner' || propertyRole === 'admin'
  const href = `/properties/${propertySlug}/units/${unit.slug}`
  const unitLabel = getUnitLabel(propertyType)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteUnit(unit.id)
      toast.success(`${unitLabel} supprimé`)
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

  const details = [
    unit.floor != null ? `Étage ${unit.floor}` : null,
    unit.surface != null ? `${unit.surface} m²` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <Card
        onClick={() => router.push(href)}
        className="relative cursor-pointer rounded-xl border border-border transition-all duration-200 hover:shadow-md"
      >
        <div
          className="absolute top-3 right-3"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Options"
              render={
                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" />
              }
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(href)}>
                <Eye className="h-4 w-4" aria-hidden="true" />
                Voir
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Modifier
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <DoorOpen className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div>
            <h3 className="font-semibold">{unit.name}</h3>
            {details && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {details}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={
                unit.isOccupied
                  ? 'border-green-600/20 bg-green-600/10 text-green-700 dark:text-green-400'
                  : 'border-orange-600/20 bg-orange-600/10 text-orange-700 dark:text-orange-400'
              }
            >
              {unit.isOccupied ? 'Occupé' : 'Vacant'}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              {unit.documentsCount}{' '}
              {unit.documentsCount > 1 ? 'documents' : 'document'}
            </span>
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <UnitFormDialog
          mode="edit"
          propertyId={unit.propertyId}
          propertySlug={propertySlug}
          propertyType={propertyType}
          unit={unit}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      {canDelete && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Supprimer {unitLabel === 'Unité' ? 'cette' : 'ce'}{' '}
                {unitLabel.toLowerCase()} ?
              </AlertDialogTitle>
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
    </>
  )
}
