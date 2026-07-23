import type { NextRequest } from 'next/server'
import { auth } from '@/core/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

const { GET, POST: authPost } = toNextJsHandler(auth)

// Rate limiting simple en mémoire — suffisant pour le dev et la démo.
// En production à fort trafic, remplacer par une solution distribuée
// (ex: Upstash Redis) car cette Map ne survit pas à un redémarrage du
// serveur et n'est pas partagée entre plusieurs instances.
const RATE_LIMIT = 10
const RATE_LIMIT_WINDOW_MS = 60_000
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function isWithinRateLimit(key: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (record.count >= RATE_LIMIT) return false

  record.count += 1
  return true
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export { GET }

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  if (!isWithinRateLimit(ip)) {
    return new Response('Too Many Requests', { status: 429 })
  }

  return authPost(request)
}
