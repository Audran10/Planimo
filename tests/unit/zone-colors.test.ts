import { describe, expect, it } from 'vitest'
import { assignZoneColors, ZONE_PALETTE, zonesAreAdjacent } from '@/features/units/lib/zone-colors'
import type { FloorPlanZone } from '@/core/types'

const left: FloorPlanZone = {
  id: 'a',
  name: 'A',
  coordinates: { x: 10, y: 10, width: 20, height: 20 },
  cells: [{ x: 0, y: 0, width: 20, height: 20 }],
}

const right: FloorPlanZone = {
  id: 'b',
  name: 'B',
  coordinates: { x: 30, y: 10, width: 20, height: 20 },
  cells: [{ x: 20, y: 0, width: 20, height: 20 }],
}

const far: FloorPlanZone = {
  id: 'c',
  name: 'C',
  coordinates: { x: 80, y: 80, width: 10, height: 10 },
  cells: [{ x: 75, y: 75, width: 10, height: 10 }],
}

describe('zonesAreAdjacent', () => {
  it('treats cells that share a wall as neighbours', () => {
    expect(zonesAreAdjacent(left, right)).toBe(true)
  })

  it('ignores distant rooms', () => {
    expect(zonesAreAdjacent(left, far)).toBe(false)
  })
})

describe('assignZoneColors', () => {
  it('gives neighbouring rooms different strokes', () => {
    const colors = assignZoneColors([left, right, far])

    expect(colors.get('a')?.stroke).not.toBe(colors.get('b')?.stroke)
  })

  it('assigns a color to every room from a larger palette', () => {
    const rooms: FloorPlanZone[] = Array.from({ length: 12 }, (_, index) => ({
      id: `z${index}`,
      name: `Pièce ${index + 1}`,
      coordinates: { x: index * 8, y: 10, width: 8, height: 20 },
      cells: [{ x: index * 8, y: 0, width: 8, height: 20 }],
    }))

    const colors = assignZoneColors(rooms)

    expect(colors.size).toBe(12)
    expect(ZONE_PALETTE.length).toBeGreaterThan(8)
  })
})
