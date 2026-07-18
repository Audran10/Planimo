import { NextResponse } from 'next/server'
import { segmentFloorPlan } from '@/features/ai/actions/segment-plan'

export async function POST(request: Request) {
  const { imageUrl } = await request.json() as { imageUrl: string }
  const result = await segmentFloorPlan(imageUrl)
  return NextResponse.json(result)
}
