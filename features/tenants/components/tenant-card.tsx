'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Mail, Pencil, Phone, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/core/components/ui/avatar'
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
import { deleteTenant } from '@/features/tenants/actions/tenants'
import { TenantFormDialog } from '@/features/tenants/components/tenant-form-dialog'
import { LeaseStatusBadge } from '@/features/tenants/components/lease-status-badge'
import type { TenantWithDocuments } from '@/features/tenants/types'

type TenantSummary = Pick<
  TenantWithDocuments,
  | 'id'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'leaseStart'
  | 'leaseEnd'
  | 'monthlyRent'
  | 'deposit'
  | 'documents'
>

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const rentFormatter = new Intl.NumberFormat('fr-FR')

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function TenantCard({
  tenant,
  unitId,
  propertySlug,
  unitSlug,
}: {
  tenant: TenantSummary
  unitId: string
  propertySlug: string
  unitSlug: string
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const leaseDocument = tenant.documents.find((doc) => doc.type === 'lease')

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteTenant(tenant.id)
      toast.success('Locataire supprimé')
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
      <div className="relative rounded-xl border border-border p-4">
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Modifier"
            className="cursor-pointer"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
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
        </div>

        <div className="flex items-start gap-3 pr-16">
          <Avatar size="lg">
            <AvatarFallback className="bg-primary/10 font-medium text-primary">
              {getInitials(tenant.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{tenant.fullName}</p>
              <LeaseStatusBadge tenant={tenant} />
            </div>
            {leaseDocument && (
              <a
                href={leaseDocument.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                Voir le contrat
              </a>
            )}
            {tenant.email && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {tenant.email}
              </p>
            )}
            {tenant.phone && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {tenant.phone}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Bail</p>
            <p className="text-sm font-medium">
              {dateFormatter.format(tenant.leaseStart)} →{' '}
              {tenant.leaseEnd ? dateFormatter.format(tenant.leaseEnd) : 'En cours'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Loyer mensuel</p>
            <p className="text-sm font-medium">
              {rentFormatter.format(tenant.monthlyRent)} €/mois
            </p>
          </div>
          {tenant.deposit != null && (
            <div>
              <p className="text-xs text-muted-foreground">Dépôt de garantie</p>
              <p className="text-sm font-medium">
                {rentFormatter.format(tenant.deposit)} €
              </p>
            </div>
          )}
        </div>
      </div>

      <TenantFormDialog
        mode="edit"
        unitId={unitId}
        propertySlug={propertySlug}
        unitSlug={unitSlug}
        tenant={tenant}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce locataire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les informations de bail de «{' '}
              {tenant.fullName} » seront définitivement supprimées.
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
