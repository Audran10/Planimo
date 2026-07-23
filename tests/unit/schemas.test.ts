import { describe, expect, it } from 'vitest'
import { loginSchema } from '@/features/auth/schemas/login-schema'
import { registerSchema } from '@/features/auth/schemas/register-schema'
import { propertySchema } from '@/features/properties/schemas/property.schema'

describe('loginSchema', () => {
  it('validates a correct email + password', () => {
    const result = loginSchema.safeParse({
      email: 'marc@example.com',
      password: 'secret123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'secret123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({
      email: 'marc@example.com',
      password: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('registerSchema', () => {
  it('validates a correct name + email + password', () => {
    const result = registerSchema.safeParse({
      name: 'Marc Bernard',
      email: 'marc@example.com',
      password: 'secret123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a name shorter than 2 characters', () => {
    const result = registerSchema.safeParse({
      name: 'M',
      email: 'marc@example.com',
      password: 'secret123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      name: 'Marc Bernard',
      email: 'marc@example.com',
      password: 'short1',
    })
    expect(result.success).toBe(false)
  })
})

describe('propertySchema', () => {
  it('validates the required fields', () => {
    const result = propertySchema.safeParse({
      name: 'Résidence des Lilas',
      address: '12 rue des Lilas, 75011 Paris',
      type: 'apartment_building',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an address shorter than 5 characters', () => {
    const result = propertySchema.safeParse({
      name: 'Résidence des Lilas',
      address: '123',
      type: 'apartment_building',
    })
    expect(result.success).toBe(false)
  })
})
