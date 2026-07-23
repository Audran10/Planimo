'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, MapPin, MoreVertical, Pencil, Trash2 } from 'lucide-react'
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
import { deleteProperty } from '@/features/properties/actions/properties'
import { PropertyFormDialog } from '@/features/properties/components/property-form-dialog'
import type { PropertyWithMeta } from '@/features/properties/types'
import { propertyTypeIcons, propertyTypeLabels } from '@/features/properties/constants'
import { getUnitLabel } from '@/core/lib/property-labels'

export function PropertyCard({ property }: { property: PropertyWithMeta }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const Icon = propertyTypeIcons[property.type]
  const canEdit = property.role === 'owner' || property.role === 'admin'
  const canDelete = property.role === 'owner'

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteProperty(property.id)
      toast.success('Bien supprimé')
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
      <Card
        onClick={() => router.push(`/properties/${property.slug}`)}
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
              <DropdownMenuItem
                onClick={() => router.push(`/properties/${property.slug}`)}
              >
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
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div>
            <h3 className="font-semibold">{property.name}</h3>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{property.address}</span>
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="secondary">{propertyTypeLabels[property.type]}</Badge>
            <Badge variant={property.role === 'owner' ? 'default' : 'outline'}>
              {property.role === 'owner' ? 'Propriétaire' : 'Membre'}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            {property.type === 'house'
              ? 'Maison individuelle'
              : `${property.unitsCount} ${getUnitLabel(
                  property.type,
                  property.unitsCount > 1
                ).toLowerCase()}`}
          </p>
        </CardContent>
      </Card>

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
    </>
  )
}
