'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Euro, MoreVertical, Pencil, Trash2, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/core/components/ui/badge'
import { Button } from '@/core/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { deleteWorkOrder, updateWorkOrder } from '@/features/work-orders/actions/work-orders'
import { WorkOrderFormDialog } from '@/features/work-orders/components/work-order-form-dialog'
import type { WorkOrder } from '@/features/work-orders/types'

const statusLabels: Record<WorkOrder['status'], string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminé',
}

const statusClasses: Record<WorkOrder['status'], string> = {
  pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const amountFormatter = new Intl.NumberFormat('fr-FR')

export function WorkOrderCard({ workOrder }: { workOrder: WorkOrder }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteWorkOrder(workOrder.id)
      toast.success('Intervention supprimée')
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

  async function handleQuickStatusChange(status: WorkOrder['status']) {
    setUpdatingStatus(true)
    try {
      await updateWorkOrder(workOrder.id, { status })
      toast.success('Statut mis à jour')
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de la mise à jour'
      )
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <>
      <div className="relative rounded-xl border border-border p-4">
        <div className="absolute top-3 right-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Options"
              render={
                <Button variant="ghost" size="icon-sm" className="cursor-pointer" />
              }
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Modifier
              </DropdownMenuItem>
              {workOrder.status === 'pending' && (
                <DropdownMenuItem
                  disabled={updatingStatus}
                  onClick={() => handleQuickStatusChange('in_progress')}
                >
                  Marquer en cours
                </DropdownMenuItem>
              )}
              {workOrder.status === 'in_progress' && (
                <DropdownMenuItem
                  disabled={updatingStatus}
                  onClick={() => handleQuickStatusChange('completed')}
                >
                  Marquer terminé
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-start gap-3 pr-10">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Wrench className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{workOrder.description}</p>
              <Badge variant="secondary" className={statusClasses[workOrder.status]}>
                {statusLabels[workOrder.status]}
              </Badge>
            </div>
            {workOrder.contractor && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {workOrder.contractor}
              </p>
            )}
            {workOrder.amount != null && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Euro className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {amountFormatter.format(workOrder.amount)} €
              </p>
            )}
            {workOrder.interventionDate && (
              <p className="text-xs text-muted-foreground">
                {dateFormatter.format(workOrder.interventionDate)}
              </p>
            )}
          </div>
        </div>
      </div>

      <WorkOrderFormDialog
        mode="edit"
        workOrder={workOrder}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette intervention ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. « {workOrder.description} » sera
              définitivement supprimée.
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
