import Image from 'next/image'
import { FileUp, Map, Plus, UserPlus, Users, Wrench } from 'lucide-react'
import { ComingSoonButton } from '@/core/components/shared/coming-soon-button'
import { Card, CardContent, CardHeader } from '@/core/components/ui/card'
import type { UnitDetail } from '@/features/units/types'

function isActiveTenant(tenant: { leaseEnd?: Date | null }) {
  return !tenant.leaseEnd || tenant.leaseEnd >= new Date()
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function UnitSections({ unit }: { unit: UnitDetail }) {
  const activeTenant = unit.tenants.find(isActiveTenant)

  return (
    <>
      <Card className="border border-border">
        <CardHeader>
          <p className="text-sm font-medium">Plan de l&apos;appartement</p>
        </CardHeader>
        <CardContent>
          {unit.floorPlanUrl ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
              <Image
                src={unit.floorPlanUrl}
                alt={`Plan de ${unit.name}`}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Map className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucun plan ajouté</p>
              <ComingSoonButton icon={<Plus className="h-4 w-4" />} label="Uploader un plan" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader>
          <p className="text-sm font-medium">Locataire</p>
        </CardHeader>
        <CardContent>
          {activeTenant ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Nom</p>
                <p className="text-sm font-medium">{activeTenant.fullName}</p>
              </div>
              {activeTenant.email && (
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{activeTenant.email}</p>
                </div>
              )}
              {activeTenant.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Téléphone</p>
                  <p className="text-sm font-medium">{activeTenant.phone}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Bail</p>
                <p className="text-sm font-medium">
                  {formatDate(activeTenant.leaseStart)} —{' '}
                  {activeTenant.leaseEnd ? formatDate(activeTenant.leaseEnd) : 'en cours'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Loyer mensuel</p>
                <p className="text-sm font-medium">{activeTenant.monthlyRent} €</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucun locataire</p>
              <ComingSoonButton icon={<UserPlus className="h-4 w-4" />} label="Ajouter un locataire" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="flex-row items-center justify-between">
          <p className="text-sm font-medium">Documents</p>
          <ComingSoonButton icon={<FileUp className="h-4 w-4" />} label="Ajouter un document" />
        </CardHeader>
        <CardContent>
          {unit.documents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun document pour le moment
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {unit.documents.map((doc) => (
                <li key={doc.id} className="py-3 text-sm">
                  {doc.name}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="flex-row items-center justify-between">
          <p className="text-sm font-medium">Travaux &amp; Interventions</p>
          <ComingSoonButton icon={<Wrench className="h-4 w-4" />} label="Ajouter une intervention" />
        </CardHeader>
        <CardContent>
          {unit.workOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune intervention pour le moment
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {unit.workOrders.map((workOrder) => (
                <li key={workOrder.id} className="py-3 text-sm">
                  {workOrder.description}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}
