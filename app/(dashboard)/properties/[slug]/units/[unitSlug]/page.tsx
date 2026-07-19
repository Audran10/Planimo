import { notFound } from 'next/navigation'
import { getUnitBySlug } from '@/features/units/actions/units'
import { UnitDetailActions } from '@/features/units/components/unit-detail-actions'
import { UnitSections } from '@/features/units/components/unit-sections'
import { SetBreadcrumb } from '@/features/dashboard/components/set-breadcrumb'
import { getUnitLabel } from '@/core/lib/property-labels'
import { Badge } from '@/core/components/ui/badge'

function isActiveTenant(tenant: { leaseEnd?: Date | null }) {
  return !tenant.leaseEnd || tenant.leaseEnd >= new Date()
}

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ slug: string; unitSlug: string }>
}) {
  const { unitSlug } = await params

  let unit
  try {
    unit = await getUnitBySlug(unitSlug)
  } catch {
    notFound()
  }

  if (!unit) notFound()

  const isOccupied = unit.tenants.some(isActiveTenant)

  return (
    <div className="space-y-8">
      <SetBreadcrumb
        items={[
          { label: 'Biens', href: '/properties' },
          { label: unit.property.name, href: `/properties/${unit.property.slug}` },
          { label: getUnitLabel(unit.property.type, true) },
          { label: unit.name },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{unit.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {unit.floor != null && (
              <Badge variant="secondary">Étage {unit.floor}</Badge>
            )}
            {unit.surface != null && (
              <Badge variant="secondary">{unit.surface} m²</Badge>
            )}
            <Badge
              variant="outline"
              className={
                isOccupied
                  ? 'border-green-600/20 bg-green-600/10 text-green-700 dark:text-green-400'
                  : 'border-orange-600/20 bg-orange-600/10 text-orange-700 dark:text-orange-400'
              }
            >
              {isOccupied ? 'Occupé' : 'Vacant'}
            </Badge>
          </div>
        </div>

        <UnitDetailActions unit={unit} />
      </div>

      <UnitSections unit={unit} />
    </div>
  )
}
