import type { Property } from '../types'

export function PropertyCard({ property }: { property: Property }) {
  return (
    <div>
      <h3>{property.name}</h3>
      <p>{property.address}</p>
    </div>
  )
}
