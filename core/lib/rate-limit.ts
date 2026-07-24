interface RateLimitRecord {
  count: number
  resetTime: number
}

// Simple in-memory rate limiter — sufficient for dev/demo, but doesn't
// survive a server restart and isn't shared across instances. Swap for a
// distributed store (e.g. Upstash Redis) in a multi-instance production
// deployment. See SECURITY.md.
export function createRateLimiter(limit: number, windowMs: number) {
  const store = new Map<string, RateLimitRecord>()

  return function isWithinRateLimit(key: string): boolean {
    const now = Date.now()
    const record = store.get(key)

    if (!record || now > record.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs })
      return true
    }

    if (record.count >= limit) return false

    record.count += 1
    return true
  }
}

export function getClientIp(headers: Pick<Headers, 'get'>): string {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
