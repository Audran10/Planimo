import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { prepareFloorPlanForVision } from '@/core/lib/floor-plan-vision'

/** Plan factice : un rectangle sombre posé sur un fond uni, avec des marges. */
async function makePlan(options: {
  width: number
  height: number
  background: { r: number; g: number; b: number }
  margin: { left: number; top: number; right: number; bottom: number }
  ink: { r: number; g: number; b: number }
}) {
  const { width, height, background, margin, ink } = options
  const drawWidth = width - margin.left - margin.right
  const drawHeight = height - margin.top - margin.bottom

  return sharp({
    create: { width, height, channels: 4, background: { ...background, alpha: 1 } },
  })
    .composite([
      {
        input: {
          create: {
            width: drawWidth,
            height: drawHeight,
            channels: 4,
            background: { ...ink, alpha: 1 },
          },
        },
        left: margin.left,
        top: margin.top,
      },
    ])
    .png()
    .toBuffer()
}

const WHITE = { r: 255, g: 255, b: 255 }
const DARK = { r: 40, g: 40, b: 40 }

describe('prepareFloorPlanForVision', () => {
  it('maps the grid onto the drawing, not the file, whatever the margins', async () => {
    const plan = await makePlan({
      width: 1000,
      height: 800,
      background: WHITE,
      margin: { left: 100, top: 40, right: 300, bottom: 160 },
      ink: DARK,
    })

    const image = await prepareFloorPlanForVision(plan)

    expect(image.toSourcePercent({ x: 0, y: 0 })).toMatchObject({
      x: expect.closeTo(10, 0),
      y: expect.closeTo(5, 0),
    })
    expect(image.toSourcePercent({ x: 100, y: 100 })).toMatchObject({
      x: expect.closeTo(70, 0),
      y: expect.closeTo(80, 0),
    })
  })

  it('crops a scan whose paper is grey rather than white', async () => {
    const plan = await makePlan({
      width: 900,
      height: 900,
      background: { r: 232, g: 230, b: 224 },
      margin: { left: 90, top: 90, right: 90, bottom: 90 },
      ink: DARK,
    })

    const image = await prepareFloorPlanForVision(plan)

    expect(image.toSourcePercent({ x: 0, y: 0 })).toMatchObject({
      x: expect.closeTo(10, 0),
      y: expect.closeTo(10, 0),
    })
  })

  it('keeps the whole image when the drawing fills it', async () => {
    const plan = await makePlan({
      width: 600,
      height: 600,
      background: WHITE,
      margin: { left: 0, top: 0, right: 0, bottom: 0 },
      ink: DARK,
    })

    const image = await prepareFloorPlanForVision(plan)

    expect(image.toSourcePercent({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
    expect(image.toSourcePercent({ x: 100, y: 100 })).toMatchObject({ x: 100, y: 100 })
  })

  it('falls back to the whole image rather than over-cropping a noisy plan', async () => {
    const plan = await makePlan({
      width: 800,
      height: 800,
      background: WHITE,
      margin: { left: 340, top: 340, right: 340, bottom: 340 },
      ink: DARK,
    })

    const image = await prepareFloorPlanForVision(plan)

    expect(image.toSourcePercent({ x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 })
  })

  it('handles a large scan without decoding it at full size', async () => {
    const plan = await makePlan({
      width: 4000,
      height: 3000,
      background: WHITE,
      margin: { left: 400, top: 300, right: 400, bottom: 300 },
      ink: DARK,
    })

    const image = await prepareFloorPlanForVision(plan)

    expect(image.toSourcePercent({ x: 0, y: 0 })).toMatchObject({
      x: expect.closeTo(10, 0),
      y: expect.closeTo(10, 0),
    })
  })

  it('never enlarges a small plan, to avoid amplifying compression artefacts', async () => {
    const plan = await makePlan({
      width: 400,
      height: 400,
      background: WHITE,
      margin: { left: 40, top: 40, right: 40, bottom: 40 },
      ink: DARK,
    })

    const image = await prepareFloorPlanForVision(plan)
    const metadata = await sharp(Buffer.from(image.base64, 'base64')).metadata()

    expect(metadata.width).toBeLessThanOrEqual(320 + 26)
    expect(metadata.height).toBeLessThanOrEqual(320 + 26)
  })
})
