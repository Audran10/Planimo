import { describe, expect, it } from 'vitest'
import { workOrderSchema } from '@/features/work-orders/schemas/work-order.schema'

describe('workOrderSchema', () => {
  it('validates a work order with a valid description and status', () => {
    const result = workOrderSchema.safeParse({
      description: 'Réparation de la chaudière',
      status: 'in_progress',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a description shorter than 5 characters', () => {
    const result = workOrderSchema.safeParse({
      description: 'Fuit',
      status: 'pending',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a status outside the enum', () => {
    const result = workOrderSchema.safeParse({
      description: 'Réparation de la chaudière',
      status: 'cancelled',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a work order without any optional fields', () => {
    const result = workOrderSchema.safeParse({
      description: 'Réparation de la chaudière',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a negative amount', () => {
    const result = workOrderSchema.safeParse({
      description: 'Réparation de la chaudière',
      amount: -50,
    })
    expect(result.success).toBe(false)
  })

  it('defaults status to "pending" when omitted', () => {
    const result = workOrderSchema.safeParse({
      description: 'Réparation de la chaudière',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('pending')
    }
  })
})
