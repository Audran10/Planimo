import { describe, expect, it } from 'vitest'
import { documentSchema } from '@/features/documents/schemas/document.schema'

describe('documentSchema', () => {
  it('validates a document with a valid name and type', () => {
    const result = documentSchema.safeParse({
      name: 'Facture électricité janvier',
      type: 'invoice',
      unitId: 'unit-1',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = documentSchema.safeParse({
      name: '',
      type: 'invoice',
      unitId: 'unit-1',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a type outside the enum', () => {
    const result = documentSchema.safeParse({
      name: 'Facture électricité janvier',
      type: 'contract',
      unitId: 'unit-1',
    })
    expect(result.success).toBe(false)
  })

  it('validates every accepted document type', () => {
    const types = ['lease', 'inventory', 'invoice', 'insurance', 'diagnostic', 'other']

    for (const type of types) {
      const result = documentSchema.safeParse({
        name: 'Document',
        type,
        unitId: 'unit-1',
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects a document not attached to a unit, room, tenant or work order', () => {
    const result = documentSchema.safeParse({
      name: 'Document orphelin',
      type: 'other',
    })
    expect(result.success).toBe(false)
  })

  it('validates a document attached to a work order', () => {
    const result = documentSchema.safeParse({
      name: 'Facture plombier',
      type: 'invoice',
      workOrderId: 'wo-1',
    })
    expect(result.success).toBe(true)
  })
})
