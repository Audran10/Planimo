import sharp from 'sharp'
import { drawNumber, prepareCanvas } from './floor-plan-vision'

// La géométrie ne passe plus par le modèle. Sur un plan d'architecte, un mur
// est un trait long et continu : en comptant les pixels sombres le long d'une
// ligne, il ressort au pixel près là où le mobilier ne dépasse pas le bruit. On
// découpe donc le plan récursivement sur ses murs, et le modèle n'a plus qu'à
// dire quelles cellules forment une même pièce — ce qu'il sait faire,
// contrairement à estimer des coordonnées.

const INK_THRESHOLD = 150
/**
 * L'analyse est ramenée à une taille fixe pour que l'épaisseur d'un mur soit
 * comparable d'un plan à l'autre, et donc les seuils indépendants du fichier.
 */
const ANALYSIS_DIMENSION = 1400
/**
 * Rayon d'erosion isolant les murs : tout trait plus fin que ça disparaît. Le
 * mobilier est dessiné en traits fins, les murs en traits épais ou hachurés.
 */
const WALL_RADIUS = 3
/**
 * Part de la traversée qu'un mur doit couvrir pour valoir une coupe. Les portes
 * trouent les murs, d'où un seuil bien inférieur à 1 — ce qui est sans risque
 * puisque la couverture est mesurée sur les murs seuls, mobilier exclu.
 */
const CUT_COVERAGE = 0.45
/** Une coupe trop près du bord détacherait l'épaisseur d'un mur, pas une pièce. */
const MIN_SIDE_RATIO = 0.05
const MAX_DEPTH = 7
/** Une cellule presque noire est un mur hachuré ou un bloc technique. */
const MAX_CELL_INK_RATIO = 0.55
/**
 * Le recadrage inclut l'épaisseur des murs de façade : une coupe sur leur face
 * intérieure laisse une écharde entre le mur et le bord de l'image. Ces
 * lanières ne sont pas des pièces.
 */
const MIN_CELL_SIDE_RATIO = 0.06
const MIN_CELL_AREA_RATIO = 0.008
/** Un couloir reste dans les 8:1 ; au-delà on regarde une lanière de marge. */
const MAX_CELL_ASPECT = 8
const MAX_CELLS = 40

export interface GridCell {
  /** Numéro affiché sur l'image envoyée au modèle, à partir de 1. */
  number: number
  /** Bords en pourcentage de l'image d'origine. */
  x: number
  y: number
  width: number
  height: number
}

export interface WallGrid {
  cells: GridCell[]
  /** Plan avec les cellules numérotées, en base64. */
  base64: string
}

interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

interface Mask {
  data: Uint8Array
  width: number
  height: number
}

// Erosion et dilatation séparables : un carré de rayon r s'obtient en
// enchaînant un passage horizontal et un passage vertical, ce qui évite de
// balayer r² voisins par pixel sur une image de deux millions de points.
function morph(mask: Mask, radius: number, mode: 'erode' | 'dilate'): Mask {
  const { width, height } = mask
  const keep = mode === 'erode' ? 0 : 1
  const pass = (source: Uint8Array, horizontal: boolean) => {
    const target = new Uint8Array(source.length)
    const outer = horizontal ? height : width
    const inner = horizontal ? width : height
    const step = horizontal ? 1 : width

    for (let o = 0; o < outer; o++) {
      const base = horizontal ? o * width : o
      for (let i = 0; i < inner; i++) {
        let value = mode === 'erode' ? 1 : 0
        for (let d = -radius; d <= radius; d++) {
          const j = i + d
          // Hors image, on prolonge le fond : un mur au ras du bord ne doit pas
          // être rongé par l'erosion.
          const neighbour = j < 0 || j >= inner ? (mode === 'erode' ? 1 : 0) : source[base + j * step]
          if (neighbour === keep) {
            value = keep
            break
          }
        }
        target[base + i * step] = value
      }
    }
    return target
  }

  return { width, height, data: pass(pass(mask.data, true), false) }
}

interface Cut {
  orientation: 'vertical' | 'horizontal'
  position: number
  coverage: number
}

function coverageAlongColumn(walls: Mask, x: number, rect: Rect): number {
  let count = 0
  for (let y = rect.top; y < rect.bottom; y++) {
    if (walls.data[y * walls.width + x]) count++
  }
  return count / (rect.bottom - rect.top)
}

function coverageAlongRow(walls: Mask, y: number, rect: Rect): number {
  let count = 0
  for (let x = rect.left; x < rect.right; x++) {
    if (walls.data[y * walls.width + x]) count++
  }
  return count / (rect.right - rect.left)
}

// Un mur fait plusieurs pixels d'épaisseur : les positions qui dépassent le
// seuil forment une plage, dont on retient le centre.
function bestCutAlong(
  from: number,
  to: number,
  margin: number,
  coverageAt: (position: number) => number
): { position: number; coverage: number } | null {
  let best: { position: number; coverage: number } | null = null
  let runStart = -1
  let runBest = 0

  const flush = (end: number) => {
    if (runStart === -1) return
    const position = (runStart + end) / 2
    if (!best || runBest > best.coverage) best = { position, coverage: runBest }
    runStart = -1
    runBest = 0
  }

  for (let position = from + margin; position <= to - margin; position++) {
    const coverage = coverageAt(position)
    if (coverage >= CUT_COVERAGE) {
      if (runStart === -1) runStart = position
      if (coverage > runBest) runBest = coverage
    } else {
      flush(position - 1)
    }
  }
  flush(to - margin)

  return best
}

function findCut(walls: Mask, rect: Rect): Cut | null {
  const marginX = Math.max(3, Math.round((rect.right - rect.left) * MIN_SIDE_RATIO))
  const marginY = Math.max(3, Math.round((rect.bottom - rect.top) * MIN_SIDE_RATIO))

  const vertical = bestCutAlong(rect.left, rect.right, marginX, (x) =>
    coverageAlongColumn(walls, x, rect)
  )
  const horizontal = bestCutAlong(rect.top, rect.bottom, marginY, (y) =>
    coverageAlongRow(walls, y, rect)
  )

  if (!vertical && !horizontal) return null
  if (vertical && (!horizontal || vertical.coverage >= horizontal.coverage)) {
    return { orientation: 'vertical', ...vertical }
  }
  return { orientation: 'horizontal', ...horizontal! }
}

function subdivide(walls: Mask, rect: Rect, depth: number): Rect[] {
  if (depth >= MAX_DEPTH) return [rect]

  const cut = findCut(walls, rect)
  if (!cut) return [rect]

  const position = Math.round(cut.position)
  const [a, b]: Rect[] =
    cut.orientation === 'vertical'
      ? [
          { ...rect, right: position },
          { ...rect, left: position },
        ]
      : [
          { ...rect, bottom: position },
          { ...rect, top: position },
        ]

  return [...subdivide(walls, a, depth + 1), ...subdivide(walls, b, depth + 1)]
}

function isHabitable(rect: Rect, width: number, height: number): boolean {
  const rectWidth = rect.right - rect.left
  const rectHeight = rect.bottom - rect.top
  const aspect = Math.max(rectWidth / rectHeight, rectHeight / rectWidth)
  return (
    rectWidth >= width * MIN_CELL_SIDE_RATIO &&
    rectHeight >= height * MIN_CELL_SIDE_RATIO &&
    (rectWidth * rectHeight) / (width * height) >= MIN_CELL_AREA_RATIO &&
    aspect <= MAX_CELL_ASPECT
  )
}

function inkRatio(ink: Mask, rect: Rect): number {
  let inked = 0
  for (let y = rect.top; y < rect.bottom; y++) {
    for (let x = rect.left; x < rect.right; x++) {
      if (ink.data[y * ink.width + x]) inked++
    }
  }
  return inked / ((rect.right - rect.left) * (rect.bottom - rect.top))
}

// Les cellules sont teintées : le modèle doit voir d'un coup d'œil jusqu'où va
// une cellule, ce qu'un simple liseré ne donne pas quand les murs du plan sont
// eux-mêmes des traits.
const CELL_TINTS = [
  '#ef4444',
  '#22c55e',
  '#3b82f6',
  '#eab308',
  '#a855f7',
  '#14b8a6',
  '#f97316',
  '#ec4899',
]

function buildOverlay(rects: Rect[], width: number, height: number): Buffer {
  const shapes = rects
    .map((rect, index) => {
      const label = String(index + 1)
      const labelWidth = label.length * 12 + 6
      const labelX = (rect.left + rect.right) / 2 - labelWidth / 2 + 3
      const labelY = (rect.top + rect.bottom) / 2 - 8

      return [
        `<rect x="${rect.left}" y="${rect.top}" width="${rect.right - rect.left}" height="${rect.bottom - rect.top}" fill="${CELL_TINTS[index % CELL_TINTS.length]}" fill-opacity="0.16" stroke="#e11d48" stroke-width="1.5" stroke-opacity="0.65" stroke-dasharray="6 4" />`,
        `<rect x="${labelX - 3}" y="${labelY - 3}" width="${labelWidth}" height="23" rx="3" fill="#ffffff" fill-opacity="0.92" />`,
        drawNumber(index + 1, labelX, labelY, '#e11d48'),
      ].join('')
    })
    .join('')

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${shapes}</svg>`
  )
}

/**
 * Découpe le plan sur ses murs. Renvoie null quand la découpe ne trouve pas de
 * structure exploitable (murs obliques, plan à main levée), auquel cas
 * l'appelant se rabat sur l'analyse par coordonnées.
 */
export async function detectWallGrid(source: Buffer): Promise<WallGrid | null> {
  const canvas = await prepareCanvas(source)
  const scaled = await sharp(canvas.cropped)
    .resize(ANALYSIS_DIMENSION, ANALYSIS_DIMENSION, { fit: 'inside' })
    .png()
    .toBuffer()
  const { data, info } = await sharp(scaled)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const ink: Mask = { data: new Uint8Array(width * height), width, height }
  for (let i = 0; i < width * height; i++) {
    ink.data[i] = data[i] < INK_THRESHOLD ? 1 : 0
  }

  // Ouverture : les traits fins du mobilier disparaissent, les murs épais
  // survivent et retrouvent leur largeur.
  const walls = morph(morph(ink, WALL_RADIUS, 'erode'), WALL_RADIUS, 'dilate')

  const rects = subdivide(walls, { left: 0, top: 0, right: width, bottom: height }, 0)
    .filter((rect) => isHabitable(rect, width, height) && inkRatio(ink, rect) <= MAX_CELL_INK_RATIO)
    .sort((a, b) => a.top - b.top || a.left - b.left)

  if (rects.length < 2 || rects.length > MAX_CELLS) return null

  const annotated = await sharp(scaled)
    .composite([{ input: buildOverlay(rects, width, height) }])
    .png()
    .toBuffer()

  return {
    base64: annotated.toString('base64'),
    cells: rects.map((rect, index) => {
      const topLeft = canvas.toSourcePercent({
        x: (rect.left / width) * 100,
        y: (rect.top / height) * 100,
      })
      const bottomRight = canvas.toSourcePercent({
        x: (rect.right / width) * 100,
        y: (rect.bottom / height) * 100,
      })
      return {
        number: index + 1,
        x: topLeft.x,
        y: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y,
      }
    }),
  }
}
