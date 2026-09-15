import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { detectWallGrid } from '@/core/lib/floor-plan-walls'

const WIDTH = 800
const HEIGHT = 600

interface Band {
  x: number
  y: number
  width: number
  height: number
}

async function renderPlan(...groups: Band[][]): Promise<Buffer> {
  const rects = groups
    .flat()
    .map(
      (band) =>
        `<rect x="${band.x}" y="${band.y}" width="${band.width}" height="${band.height}" fill="#1f2937" />`
    )
    .join('')

  return sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"><rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff" />${rects}</svg>`
    )
  )
    .png()
    .toBuffer()
}

const FACADE: Band[] = [
  { x: 0, y: 0, width: WIDTH, height: 10 },
  { x: 0, y: HEIGHT - 10, width: WIDTH, height: 10 },
  { x: 0, y: 0, width: 10, height: HEIGHT },
  { x: WIDTH - 10, y: 0, width: 10, height: HEIGHT },
]

/** Une cloison verticale et une horizontale, chacune percée d'une porte. */
const PARTITIONS: Band[] = [
  { x: 395, y: 0, width: 10, height: 250 },
  { x: 395, y: 330, width: 10, height: HEIGHT },
  { x: 0, y: 295, width: 100, height: 10 },
  { x: 180, y: 295, width: WIDTH - 180, height: 10 },
]

/** Traits fins : ils ne délimitent pas une pièce et ne doivent rien découper. */
const FURNITURE: Band[] = [
  { x: 60, y: 60, width: 2, height: 180 },
  { x: 60, y: 60, width: 200, height: 2 },
  { x: 500, y: 400, width: 2, height: 150 },
  { x: 500, y: 120, width: 250, height: 2 },
  { x: 300, y: 450, width: 2, height: 120 },
]

function bounds(cell: { x: number; y: number; width: number; height: number }) {
  return {
    left: Math.round(cell.x),
    top: Math.round(cell.y),
    right: Math.round(cell.x + cell.width),
    bottom: Math.round(cell.y + cell.height),
  }
}

describe('detectWallGrid', () => {
  it('cuts the plan along its walls, one cell per room', async () => {
    const grid = await detectWallGrid(await renderPlan(FACADE, PARTITIONS, FURNITURE))

    expect(grid).not.toBeNull()
    expect(grid!.cells).toHaveLength(4)

    // Les cellules sont découpées au centre des murs, soit 50 % sur les deux
    // axes pour ce plan, et s'étendent jusqu'aux façades. La tolérance couvre
    // l'arrondi du recadrage sur le dessin.
    const near = (value: number, target: number) => Math.abs(value - target) <= 2
    for (const cell of grid!.cells.map(bounds)) {
      expect(near(cell.left, cell.left < 25 ? 0 : 50)).toBe(true)
      expect(near(cell.top, cell.top < 25 ? 0 : 50)).toBe(true)
      expect(near(cell.right, cell.right < 75 ? 50 : 100)).toBe(true)
      expect(near(cell.bottom, cell.bottom < 75 ? 50 : 100)).toBe(true)
    }

    expect(grid!.cells.filter((cell) => cell.x < 25)).toHaveLength(2)
    expect(grid!.cells.filter((cell) => cell.y < 25)).toHaveLength(2)
  })

  // Sans cloison il n'y a rien à découper : la trame ne dirait alors que le
  // cadre du plan, et l'appelant se rabat sur l'analyse par coordonnées.
  it('does not cut on furniture, which is not a wall', async () => {
    expect(await detectWallGrid(await renderPlan(FACADE, FURNITURE))).toBeNull()
  })

  it('returns null on a blank plan', async () => {
    expect(await detectWallGrid(await renderPlan([]))).toBeNull()
  })

  it('numbers cells from one, in reading order', async () => {
    const grid = await detectWallGrid(await renderPlan(FACADE, PARTITIONS))

    expect(grid!.cells.map((cell) => cell.number)).toEqual([1, 2, 3, 4])
    expect(grid!.cells[0].y).toBeLessThan(grid!.cells[2].y)
    expect(grid!.cells[0].x).toBeLessThan(grid!.cells[1].x)
  })

  it('returns an annotated image of the cells', async () => {
    const grid = await detectWallGrid(await renderPlan(FACADE, PARTITIONS))
    const image = Buffer.from(grid!.base64, 'base64')

    const { width, height, format } = await sharp(image).metadata()
    expect(format).toBe('png')
    expect(width).toBeGreaterThan(WIDTH)
    expect(height).toBeGreaterThan(HEIGHT)
  })
})
