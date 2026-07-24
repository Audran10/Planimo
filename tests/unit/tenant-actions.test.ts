import { describe, expect, it } from 'vitest'
import { tenantSchema, tenantUpdateSchema } from '@/features/tenants/schemas/tenant.schema'

const validTenant = {
  fullName: 'Marc Bernard',
  email: 'marc@example.com',
  phone: '0612345678',
  leaseStart: '2024-01-15',
  leaseEnd: '2025-01-15',
  monthlyRent: 850,
  deposit: 850,
}

describe('tenantSchema', () => {
  it('validates a tenant with all fields correctly filled in', () => {
    const result = tenantSchema.safeParse(validTenant)
    expect(result.success).toBe(true)
  })

  it('rejects a fullName shorter than 2 characters', () => {
    const result = tenantSchema.safeParse({ ...validTenant, fullName: 'M' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid email', () => {
    const result = tenantSchema.safeParse({ ...validTenant, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid phone number', () => {
    const result = tenantSchema.safeParse({ ...validTenant, phone: 'not-a-phone' })
    expect(result.success).toBe(false)
  })

  it('rejects a negative or zero monthlyRent', () => {
    expect(tenantSchema.safeParse({ ...validTenant, monthlyRent: -100 }).success).toBe(
      false
    )
    expect(tenantSchema.safeParse({ ...validTenant, monthlyRent: 0 }).success).toBe(
      false
    )
  })

  it('rejects a leaseEnd before leaseStart', () => {
    const result = tenantSchema.safeParse({
      ...validTenant,
      leaseStart: '2024-06-01',
      leaseEnd: '2024-01-01',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a tenant without any optional fields', () => {
    const result = tenantSchema.safeParse({
      fullName: 'Marc Bernard',
      leaseStart: '2024-01-15',
      monthlyRent: 850,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a negative deposit', () => {
    const result = tenantSchema.safeParse({ ...validTenant, deposit: -50 })
    expect(result.success).toBe(false)
  })
})

// Regression coverage for a bug caught while testing updateTenant: Zod v4
// throws at runtime (not at parse-time — `.partial()` itself throws) when
// calling `.partial()` on a schema built via `.refine()`, which is exactly
// what `tenantSchema.partial()` used to be. updateTenant now uses this
// dedicated schema instead.
describe('tenantUpdateSchema', () => {
  it('does not throw when called, unlike tenantSchema.partial() would', () => {
    expect(() => tenantUpdateSchema.safeParse({ fullName: 'New Name' })).not.toThrow()
  })

  it('accepts a partial update with a single field', () => {
    const result = tenantUpdateSchema.safeParse({ monthlyRent: 900 })
    expect(result.success).toBe(true)
  })

  it('accepts an empty update', () => {
    const result = tenantUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('still rejects a leaseEnd before leaseStart when both are provided together', () => {
    const result = tenantUpdateSchema.safeParse({
      leaseStart: '2024-06-01',
      leaseEnd: '2024-01-01',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid value even in a partial update', () => {
    const result = tenantUpdateSchema.safeParse({ monthlyRent: -100 })
    expect(result.success).toBe(false)
  })
})
