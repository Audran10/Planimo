import { PropertyCard } from '@/features/properties/components/property-card'
import type { PropertyWithMeta } from '@/features/properties/types'

export function PropertyList({
  properties,
}: {
  properties: PropertyWithMeta[]
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  )
}
