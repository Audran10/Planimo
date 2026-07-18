import type { Unit } from '../types'

export function UnitCard({ unit }: { unit: Unit }) {
  return (
    <div>
      <h3>{unit.name}</h3>
    </div>
  )
}
