import type { FloorPlanCell, FloorPlanZone } from '@/core/types'

export interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface Box {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Tolérance de jointure, en pourcentage du plan. Les cellules sont découpées au
 * centre des murs, donc deux voisines partagent exactement une arête ; l'écart
 * admis absorbe les arrondis de la détection.
 */
const EPSILON = 0.2

function subtract(
  from: [number, number],
  covers: Array<[number, number]>
): Array<[number, number]> {
  let pieces: Array<[number, number]> = [from]

  for (const [coverStart, coverEnd] of covers) {
    const remaining: Array<[number, number]> = []
    for (const [start, end] of pieces) {
      if (coverEnd <= start + EPSILON || coverStart >= end - EPSILON) {
        remaining.push([start, end])
        continue
      }
      if (coverStart > start + EPSILON) remaining.push([start, coverStart])
      if (coverEnd < end - EPSILON) remaining.push([coverEnd, end])
    }
    pieces = remaining
  }

  return pieces.filter(([start, end]) => end - start > EPSILON)
}

export function cellBox(cell: FloorPlanCell): Box {
  return { left: cell.x, top: cell.y, width: cell.width, height: cell.height }
}

export function zoneBox(zone: FloorPlanZone): Box {
  if (zone.cells && zone.cells.length > 0) return cellsBox(zone.cells)

  const { x, y, width, height } = zone.coordinates
  return { left: x - width / 2, top: y - height / 2, width, height }
}

export function cellsBox(cells: FloorPlanCell[]): Box {
  const left = Math.min(...cells.map((cell) => cell.x))
  const top = Math.min(...cells.map((cell) => cell.y))
  const right = Math.max(...cells.map((cell) => cell.x + cell.width))
  const bottom = Math.max(...cells.map((cell) => cell.y + cell.height))
  return { left, top, width: right - left, height: bottom - top }
}

/**
 * Contour de la réunion des cellules : on ne garde d'un bord de cellule que
 * les portions qu'aucune cellule voisine ne recouvre, ce qui efface les arêtes
 * intérieures et laisse le tracé longer les murs.
 */
export function cellsOutline(cells: FloorPlanCell[]): Segment[] {
  const segments: Segment[] = []

  for (const cell of cells) {
    const others = cells.filter((other) => other !== cell)
    const right = cell.x + cell.width
    const bottom = cell.y + cell.height

    const verticalCovers = (edge: number) =>
      others
        .filter(
          (other) =>
            Math.abs(other.x - edge) < EPSILON ||
            Math.abs(other.x + other.width - edge) < EPSILON
        )
        .map((other): [number, number] => [other.y, other.y + other.height])

    const horizontalCovers = (edge: number) =>
      others
        .filter(
          (other) =>
            Math.abs(other.y - edge) < EPSILON ||
            Math.abs(other.y + other.height - edge) < EPSILON
        )
        .map((other): [number, number] => [other.x, other.x + other.width])

    for (const [start, end] of subtract([cell.y, bottom], verticalCovers(cell.x))) {
      segments.push({ x1: cell.x, y1: start, x2: cell.x, y2: end })
    }
    for (const [start, end] of subtract([cell.y, bottom], verticalCovers(right))) {
      segments.push({ x1: right, y1: start, x2: right, y2: end })
    }
    for (const [start, end] of subtract([cell.x, right], horizontalCovers(cell.y))) {
      segments.push({ x1: start, y1: cell.y, x2: end, y2: cell.y })
    }
    for (const [start, end] of subtract([cell.x, right], horizontalCovers(bottom))) {
      segments.push({ x1: start, y1: bottom, x2: end, y2: bottom })
    }
  }

  return segments
}

/**
 * Point d'ancrage du libellé. Le centre de la boîte englobante tombe hors de la
 * pièce sur une forme en L, d'où le centre de la plus grande cellule.
 */
export function labelAnchor(zone: FloorPlanZone): Box {
  if (!zone.cells || zone.cells.length === 0) return zoneBox(zone)

  const largest = zone.cells.reduce((best, cell) =>
    cell.width * cell.height > best.width * best.height ? cell : best
  )
  return cellBox(largest)
}

export function cellsShareEdge(a: FloorPlanCell, b: FloorPlanCell): boolean {
  const aRight = a.x + a.width
  const aBottom = a.y + a.height
  const bRight = b.x + b.width
  const bBottom = b.y + b.height
  const verticalOverlap = Math.min(aBottom, bBottom) - Math.max(a.y, b.y) > EPSILON
  const horizontalOverlap = Math.min(aRight, bRight) - Math.max(a.x, b.x) > EPSILON
  const touchLeftRight =
    Math.abs(aRight - b.x) < EPSILON || Math.abs(bRight - a.x) < EPSILON
  const touchTopBottom =
    Math.abs(aBottom - b.y) < EPSILON || Math.abs(bBottom - a.y) < EPSILON
  return (verticalOverlap && touchLeftRight) || (horizontalOverlap && touchTopBottom)
}

export function boxesTouch(a: Box, b: Box): boolean {
  return cellsShareEdge(
    { x: a.left, y: a.top, width: a.width, height: a.height },
    { x: b.left, y: b.top, width: b.width, height: b.height }
  )
}

export function sameCell(a: FloorPlanCell, b: FloorPlanCell): boolean {
  return (
    Math.abs(a.x - b.x) < EPSILON &&
    Math.abs(a.y - b.y) < EPSILON &&
    Math.abs(a.width - b.width) < EPSILON &&
    Math.abs(a.height - b.height) < EPSILON
  )
}

export function zoneOfCell(
  zones: FloorPlanZone[],
  cell: FloorPlanCell
): FloorPlanZone | undefined {
  return zones.find((zone) => zone.cells?.some((member) => sameCell(member, cell)))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function clipCellToBox(cell: FloorPlanCell, box: Box): FloorPlanCell | null {
  const left = Math.max(cell.x, box.left)
  const top = Math.max(cell.y, box.top)
  const right = Math.min(cell.x + cell.width, box.left + box.width)
  const bottom = Math.min(cell.y + cell.height, box.top + box.height)
  const width = right - left
  const height = bottom - top
  if (width <= EPSILON || height <= EPSILON) return null
  return { x: left, y: top, width, height }
}

export function clipCellsToBox(cells: FloorPlanCell[], box: Box): FloorPlanCell[] {
  return cells
    .map((cell) => clipCellToBox(cell, box))
    .filter((cell): cell is FloorPlanCell => cell !== null)
}

export function resizeBox(
  box: Box,
  handle: 'nw' | 'ne' | 'sw' | 'se',
  dx: number,
  dy: number
): Box {
  let { left, top, width, height } = box
  const min = 2
  if (handle.includes('e')) {
    width = clamp(width + dx, min, 100 - left)
  }
  if (handle.includes('s')) {
    height = clamp(height + dy, min, 100 - top)
  }
  if (handle.includes('w')) {
    const nextWidth = clamp(width - dx, min, left + width)
    left += width - nextWidth
    width = nextWidth
  }
  if (handle.includes('n')) {
    const nextHeight = clamp(height - dy, min, top + height)
    top += height - nextHeight
    height = nextHeight
  }
  return {
    left: clamp(left, 0, 100),
    top: clamp(top, 0, 100),
    width,
    height,
  }
}

/**
 * Découpe la pièce sur le rectangle (y compris une unique grande cellule
 * cuisine+salon). Toujours partir des cellules d'origine, pas de l'état déjà
 * réduit, pour pouvoir agrandir à nouveau pendant le drag.
 */
export function resizeCellZone(zone: FloorPlanZone, box: Box): FloorPlanZone {
  const clipped = clipCellsToBox(zone.cells ?? [], box)
  if (clipped.length === 0) {
    return {
      ...zone,
      cells: undefined,
      coordinates: {
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
        width: box.width,
        height: box.height,
      },
    }
  }
  return withCells(zone, clipped)
}

/** Recalcule la boîte englobante après un ajout ou un retrait de cellule. */
export function withCells(zone: FloorPlanZone, cells: FloorPlanCell[]): FloorPlanZone {
  // Une pièce en cours de composition n'a encore aucune cellule : sa boîte
  // n'a alors rien à englober.
  if (cells.length === 0) return { ...zone, cells }

  const box = cellsBox(cells)
  return {
    ...zone,
    cells,
    coordinates: {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
      width: box.width,
      height: box.height,
    },
  }
}
