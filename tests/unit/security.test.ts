import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRateLimiter, getClientIp } from '@/core/lib/rate-limit'
import {
  hasDangerousExtension,
  isAllowedContentType,
} from '@/features/documents/lib/file-validation'

describe('rate limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows the first 10 requests from an IP', () => {
    const isWithinRateLimit = createRateLimiter(10, 60_000)

    for (let i = 0; i < 10; i++) {
      expect(isWithinRateLimit('1.2.3.4')).toBe(true)
    }
  })

  it('blocks the 11th request from the same IP', () => {
    const isWithinRateLimit = createRateLimiter(10, 60_000)

    for (let i = 0; i < 10; i++) {
      isWithinRateLimit('1.2.3.4')
    }

    expect(isWithinRateLimit('1.2.3.4')).toBe(false)
  })

  it('resets the counter after the time window elapses', () => {
    const isWithinRateLimit = createRateLimiter(10, 60_000)

    for (let i = 0; i < 10; i++) {
      isWithinRateLimit('1.2.3.4')
    }
    expect(isWithinRateLimit('1.2.3.4')).toBe(false)

    vi.advanceTimersByTime(60_001)

    expect(isWithinRateLimit('1.2.3.4')).toBe(true)
  })

  it('tracks different IPs independently', () => {
    const isWithinRateLimit = createRateLimiter(10, 60_000)

    for (let i = 0; i < 10; i++) {
      isWithinRateLimit('1.2.3.4')
    }
    expect(isWithinRateLimit('1.2.3.4')).toBe(false)

    // A different IP has its own, untouched quota.
    expect(isWithinRateLimit('5.6.7.8')).toBe(true)
  })
})

describe('getClientIp', () => {
  it('takes the first IP from a comma-separated x-forwarded-for header', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(getClientIp(headers)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip, then "unknown"', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9')
    expect(getClientIp(new Headers())).toBe('unknown')
  })
})

describe('file extension validation', () => {
  it('blocks dangerous extensions', () => {
    expect(hasDangerousExtension('malware.exe')).toBe(true)
    expect(hasDangerousExtension('script.sh')).toBe(true)
    expect(hasDangerousExtension('backdoor.php')).toBe(true)
    expect(hasDangerousExtension('payload.js')).toBe(true)
  })

  it('accepts safe document extensions', () => {
    expect(hasDangerousExtension('bail.pdf')).toBe(false)
    expect(hasDangerousExtension('photo.jpg')).toBe(false)
    expect(hasDangerousExtension('photo.png')).toBe(false)
    expect(hasDangerousExtension('photo.webp')).toBe(false)
  })
})

describe('isAllowedContentType', () => {
  it('accepts PDF and image MIME types', () => {
    expect(isAllowedContentType('application/pdf')).toBe(true)
    expect(isAllowedContentType('image/png')).toBe(true)
    expect(isAllowedContentType('image/jpeg')).toBe(true)
  })

  it('rejects other MIME types', () => {
    expect(isAllowedContentType('application/x-msdownload')).toBe(false)
    expect(isAllowedContentType('text/javascript')).toBe(false)
  })
})
