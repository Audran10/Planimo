import { Card, CardContent, CardHeader } from '@/core/components/ui/card'
import { TenantSection } from '@/features/tenants/components/tenant-section'
import { getTenantByUnitId } from '@/features/tenants/actions/tenants'
import { DocumentList } from '@/features/documents/components/document-list'
import { AddDocumentButton } from '@/features/documents/components/add-document-button'
import { WorkOrderList } from '@/features/work-orders/components/work-order-list'
import { AddWorkOrderButton } from '@/features/work-orders/components/add-work-order-button'
import { getWorkOrdersByUnitId } from '@/features/work-orders/actions/work-orders'
import { FloorPlanUpload } from '@/features/units/components/floor-plan-upload'
import { FloorPlanViewer } from '@/features/units/components/floor-plan-viewer'
import { getRoomsByUnitId } from '@/features/units/actions/rooms'
import type { UnitDetail } from '@/features/units/types'

export async function UnitSections({ unit }: { unit: UnitDetail }) {
  const activeTenant = await getTenantByUnitId(unit.id)
  const workOrders = (await getWorkOrdersByUnitId(unit.id)).filter(
    (workOrder) => workOrder.unitId === unit.id
  )
  const rooms = await getRoomsByUnitId(unit.id)

  return (
    <>
      <Card className="border border-border">
        <CardHeader>
          <p className="text-sm font-medium">Plan de l&apos;appartement</p>
        </CardHeader>
        <CardContent>
          {unit.floorPlanUrl ? (
            <FloorPlanViewer unit={unit} zones={unit.floorPlanZones ?? []} rooms={rooms} />
          ) : (
            <FloorPlanUpload unitId={unit.id} />
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
          <AddWorkOrderButton unitId={unit.id} />
        </CardHeader>
        <CardContent>
          <WorkOrderList workOrders={workOrders} />
        </CardContent>
      </Card>
    </>
  )
}
