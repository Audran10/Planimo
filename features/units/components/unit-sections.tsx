import Image from 'next/image'
import { Map, Plus, Wrench } from 'lucide-react'
import { ComingSoonButton } from '@/core/components/shared/coming-soon-button'
import { Card, CardContent, CardHeader } from '@/core/components/ui/card'
import { TenantSection } from '@/features/tenants/components/tenant-section'
import { getTenantByUnitId } from '@/features/tenants/actions/tenants'
import { DocumentList } from '@/features/documents/components/document-list'
import { AddDocumentButton } from '@/features/documents/components/add-document-button'
import type { UnitDetail } from '@/features/units/types'

export async function UnitSections({ unit }: { unit: UnitDetail }) {
  const activeTenant = await getTenantByUnitId(unit.id)

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
          <TenantSection
            tenant={activeTenant}
            unitId={unit.id}
            propertySlug={unit.property.slug}
            unitSlug={unit.slug}
          />
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="flex-row items-center justify-between">
          <p className="text-sm font-medium">Documents</p>
          <AddDocumentButton
            propertySlug={unit.property.slug}
            unitSlug={unit.slug}
            unitId={unit.id}
            tenantId={activeTenant?.id}
          />
        </CardHeader>
        <CardContent>
          <DocumentList documents={unit.documents} />
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
