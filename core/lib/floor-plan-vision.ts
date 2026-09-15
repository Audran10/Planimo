import sharp from 'sharp'

// Claude n'a pas de capacité de mesure : laissé sans repère, il place les pièces
// sur une grille mentale grossière (valeurs rondes, moitié basse comprimée). On
// lui envoie donc le plan recadré sur son dessin et surchargé d'une grille
// graduée, puis on retraduit ses coordonnées vers l'image d'origine.

const MAX_DIMENSION = 1200
const GRID_STEP = 10
const GUTTER = 26
const SCAN_DIMENSION = 1000
const BLANK_ALPHA = 10
const BLANK_TOLERANCE = 12
const MIN_CONTENT_RATIO = 0.3

// Aucune police n'est garantie sur le serveur (librsvg n'en trouve aucune sur
// Vercel), donc les graduations sont tracées en rectangles plutôt qu'en texte.
const DIGIT_ROWS: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '001', '001', '001'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
}

const CELL = 3

export interface VisionImage {
  base64: string
  mediaType: 'image/png'
  /** Traduit un point de la grille (0-100) en pourcentage de l'image d'origine. */
  toSourcePercent: (point: { x: number; y: number }) => { x: number; y: number }
}

export interface PlanCanvas {
  /** Plan recadré sur son dessin, sans annotation, fond aplati en blanc. */
  cropped: Buffer
  width: number
  height: number
  /** Traduit un pourcentage du dessin recadré en pourcentage de l'image d'origine. */
  toSourcePercent: (point: { x: number; y: number }) => { x: number; y: number }
}

interface ContentBox {
  left: number
  top: number
  width: number
  height: number
}

export const PLAN_GUTTER = GUTTER

export function drawNumber(value: number, originX: number, originY: number, color: string) {
  return numberShape(value, originX, originY, color)
}

// La couleur de fond est déduite des bords : un scan sur papier grisé ou un
// plan sur fond coloré ne serait pas détecté par un seuil de blanc fixe.
function estimateBackground(
  data: Buffer,
  width: number,
  height: number,
  channels: number
): [number, number, number] {
  const samples: Array<[number, number, number]> = []

  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 64))) {
    for (const y of [0, height - 1]) {
      const i = (y * width + x) * channels
      samples.push([data[i], data[i + 1], data[i + 2]])
    }
  }
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 64))) {
    for (const x of [0, width - 1]) {
      const i = (y * width + x) * channels
      samples.push([data[i], data[i + 1], data[i + 2]])
    }
  }

  const median = (channel: number) => {
    const values = samples.map((sample) => sample[channel]).sort((a, b) => a - b)
    return values[Math.floor(values.length / 2)] ?? 255
  }

  return [median(0), median(1), median(2)]
}

// sharp.trim() ne recadre pas ces plans (bords non uniformes, canal alpha),
// donc la boîte du dessin est calculée sur les pixels. Le scan se fait sur une
// copie réduite : décoder un gros scan en RGBA saturerait la mémoire.
async function findContentBox(source: Buffer, full: ContentBox): Promise<ContentBox> {
  const { data, info } = await sharp(source)
    .resize(SCAN_DIMENSION, SCAN_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const background = estimateBackground(data, info.width, info.height, info.channels)

  let minX = info.width
  let minY = info.height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels
      const isBlank =
        data[i + 3] < BLANK_ALPHA ||
        (Math.abs(data[i] - background[0]) <= BLANK_TOLERANCE &&
          Math.abs(data[i + 1] - background[1]) <= BLANK_TOLERANCE &&
          Math.abs(data[i + 2] - background[2]) <= BLANK_TOLERANCE)
      if (isBlank) continue

      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  if (maxX < 0 || maxY < 0) return full

  const scaleX = full.width / info.width
  const scaleY = full.height / info.height
  const box = {
    left: Math.max(0, Math.floor(minX * scaleX)),
    top: Math.max(0, Math.floor(minY * scaleY)),
    width: Math.min(full.width, Math.ceil((maxX - minX + 1) * scaleX)),
    height: Math.min(full.height, Math.ceil((maxY - minY + 1) * scaleY)),
  }

  // Un recadrage trop agressif trahit une mauvaise détection (fond bruité,
  // photo de plan) : mieux vaut alors garder l'image entière.
  const coversEnough =
    box.width >= full.width * MIN_CONTENT_RATIO && box.height >= full.height * MIN_CONTENT_RATIO
  return coversEnough ? box : full
}

function numberShape(
  value: number,
  originX: number,
  originY: number,
  color = '#e11d48'
): string {
  return String(value)
    .split('')
    .flatMap((digit, digitIndex) => {
      const rows = DIGIT_ROWS[digit] ?? []
      const offsetX = originX + digitIndex * 4 * CELL
      return rows.flatMap((row, rowIndex) =>
        row
          .split('')
          .map((cell, columnIndex) =>
            cell === '1'
              ? `<rect x="${offsetX + columnIndex * CELL}" y="${originY + rowIndex * CELL}" width="${CELL}" height="${CELL}" fill="${color}" />`
              : ''
          )
      )
    })
    .join('')
}

function buildGridSvg(
  width: number,
  height: number,
  content: { width: number; height: number }
): Buffer {
  const parts: string[] = []

  for (let percent = 0; percent <= 100; percent += GRID_STEP) {
    const x = GUTTER + Math.round((percent / 100) * content.width)
    const y = GUTTER + Math.round((percent / 100) * content.height)
    const isMajor = percent === 0 || percent === 50 || percent === 100

    parts.push(
      `<line x1="${x}" y1="${GUTTER}" x2="${x}" y2="${height}" stroke="#e11d48" stroke-width="${isMajor ? 2 : 1}" stroke-opacity="${isMajor ? 0.8 : 0.4}" ${isMajor ? '' : 'stroke-dasharray="6 6"'} />`,
      `<line x1="${GUTTER}" y1="${y}" x2="${width}" y2="${y}" stroke="#e11d48" stroke-width="${isMajor ? 2 : 1}" stroke-opacity="${isMajor ? 0.8 : 0.4}" ${isMajor ? '' : 'stroke-dasharray="6 6"'} />`,
      percent === 100 ? '' : numberShape(percent, x + 2, 4),
      percent === 100 ? '' : numberShape(percent, 3, y + 2)
    )
  }

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${parts.join('')}</svg>`
  )
}

// Les marges faussent toute mesure : le dessin est isolé une fois pour toutes,
// et les deux modes d'analyse (trame de murs, ou grille graduée en repli)
// travaillent ensuite sur ce même recadrage.
export async function prepareCanvas(source: Buffer): Promise<PlanCanvas> {
  const { width: sourceWidth, height: sourceHeight } = await sharp(source).metadata()
  if (!sourceWidth || !sourceHeight) {
    throw new Error('Dimensions du plan illisibles')
  }

  const content = await findContentBox(source, {
    left: 0,
    top: 0,
    width: sourceWidth,
    height: sourceHeight,
  })
  const scale = Math.min(1, MAX_DIMENSION / Math.max(content.width, content.height))
  const width = Math.round(content.width * scale)
  const height = Math.round(content.height * scale)

  const cropped = await sharp(source)
    .extract({
      left: content.left,
      top: content.top,
      width: content.width,
      height: content.height,
    })
    .resize(width, height)
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer()

  return {
    cropped,
    width,
    height,
    toSourcePercent: ({ x, y }) => ({
      x: ((content.left + (x / 100) * content.width) / sourceWidth) * 100,
      y: ((content.top + (y / 100) * content.height) / sourceHeight) * 100,
    }),
  }
}

export async function prepareFloorPlanForVision(source: Buffer): Promise<VisionImage> {
  const canvas = await prepareCanvas(source)

  // Une gouttière évite que les graduations ne recouvrent les murs.
  const annotated = await sharp(canvas.cropped)
    .extend({ left: GUTTER, top: GUTTER, background: '#ffffff' })
    .composite([
      { input: buildGridSvg(canvas.width + GUTTER, canvas.height + GUTTER, canvas) },
    ])
    .png()
    .toBuffer()

  return {
    base64: annotated.toString('base64'),
    mediaType: 'image/png',
    toSourcePercent: canvas.toSourcePercent,
  }
}
