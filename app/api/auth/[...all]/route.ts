import type { NextRequest } from 'next/server'
import { auth } from '@/core/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { createRateLimiter, getClientIp } from '@/core/lib/rate-limit'

const { GET, POST: authPost } = toNextJsHandler(auth)

const isWithinRateLimit = createRateLimiter(10, 60_000)

export { GET }

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers)

  if (!isWithinRateLimit(ip)) {
    return new Response('Too Many Requests', { status: 429 })
  }

  return authPost(request)
}
