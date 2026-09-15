import { describe, expect, it } from 'vitest'
import {
  cellsOutline,
  cellsShareEdge,
  labelAnchor,
  withCells,
  zoneBox,
  zoneOfCell,
} from '@/features/units/lib/zone-geometry'
import type { FloorPlanZone } from '@/core/types'

// Pièce en L : un grand carré, et une extension collée sur sa droite en bas.
const L_SHAPE: FloorPlanZone = {
  id: 'sejour',
  name: 'Séjour',
  coordinates: { x: 30, y: 30, width: 40, height: 40 },
  cells: [
    { x: 10, y: 10, width: 40, height: 20 },
    { x: 10, y: 30, width: 20, height: 20 },
  ],
}

const RECTANGLE: FloorPlanZone = {
  id: 'chambre',
  name: 'Chambre',
  coordinates: { x: 50, y: 50, width: 20, height: 10 },
}

describe('zoneBox', () => {
  it('spans every cell of the zone', () => {
    expect(zoneBox(L_SHAPE)).toEqual({ left: 10, top: 10, width: 40, height: 40 })
  })

  it('falls back to the stored rectangle when the zone has no cell', () => {
    expect(zoneBox(RECTANGLE)).toEqual({ left: 40, top: 45, width: 20, height: 10 })
  })
})

describe('cellsOutline', () => {
  it('drops the edge shared by two cells', () => {
    const segments = cellsOutline(L_SHAPE.cells!)

    // L'arête commune va de x=10 à x=30 sur y=30 : elle est intérieure.
    const shared = segments.filter(
      (segment) => segment.y1 === 30 && segment.y2 === 30 && segment.x1 < 30
    )
    expect(shared).toHaveLength(0)

    // La portion de y=30 qui dépasse l'extension reste un bord extérieur.
    expect(
      segments.some(
        (segment) =>
          segment.y1 === 30 && segment.y2 === 30 && segment.x1 === 30 && segment.x2 === 50
      )
    ).toBe(true)
  })

  it('traces a closed contour whose length matches the L perimeter', () => {
    const total = cellsOutline(L_SHAPE.cells!).reduce(
      (sum, segment) =>
        sum + Math.abs(segment.x2 - segment.x1) + Math.abs(segment.y2 - segment.y1),
      0
    )

    // Périmètre du L : 40 + 20 + 20 + 20 + 20 + 40.
    expect(total).toBe(160)
  })

  it('keeps all four edges of a lone cell', () => {
    const segments = cellsOutline([{ x: 0, y: 0, width: 10, height: 20 }])

    expect(segments).toHaveLength(4)
  })
})

describe('labelAnchor', () => {
  it('anchors on the largest cell, so an L never labels outside itself', () => {
    expect(labelAnchor(L_SHAPE)).toEqual({ left: 10, top: 10, width: 40, height: 20 })
  })
})

describe('withCells', () => {
  it('recomputes the bounding box after a cell is added', () => {
    const grown = withCells(L_SHAPE, [
      ...L_SHAPE.cells!,
      { x: 50, y: 10, width: 10, height: 20 },
    ])

    expect(grown.coordinates).toEqual({ x: 35, y: 30, width: 50, height: 40 })
  })

  it('leaves the box untouched while the zone has no cell yet', () => {
    const empty = withCells(L_SHAPE, [])

    expect(empty.cells).toEqual([])
    expect(empty.coordinates).toEqual(L_SHAPE.coordinates)
  })
})

describe('zoneOfCell', () => {
  it('finds the zone holding a cell, and none for a free cell', () => {
    const zones = [L_SHAPE, RECTANGLE]

    expect(zoneOfCell(zones, { x: 10, y: 30, width: 20, height: 20 })?.id).toBe('sejour')
    expect(zoneOfCell(zones, { x: 70, y: 70, width: 10, height: 10 })).toBeUndefined()
  })
})

describe('cellsShareEdge', () => {
  it('detects two cells that share a vertical wall', () => {
    expect(
      cellsShareEdge(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 10, y: 0, width: 10, height: 10 }
      )
    ).toBe(true)
  })

  it('ignores cells that only touch at a corner', () => {
    expect(
      cellsShareEdge(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 10, y: 10, width: 10, height: 10 }
      )
    ).toBe(false)
  })
})
