import { describe, expect, it } from 'vitest'
import { propertySchema } from '@/features/properties/schemas/property.schema'

// Note: generateSlug/generateUniqueSlug (tests/unit/slugify.test.ts) and
// getUnitLabel (tests/unit/property-labels.test.ts) — the four cases
// originally scoped to this file — are already covered at 100% there, so
// duplicating them here wouldn't add coverage. This file instead exercises
// propertySchema branches (the validation createProperty/updateProperty
// rely on) that schemas.test.ts doesn't yet cover.
describe('propertySchema', () => {
  it('rejects a name shorter than 2 characters', () => {
    const result = propertySchema.safeParse({
      name: 'A',
      address: '12 rue des Lilas, 75011 Paris',
      type: 'apartment_building',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a type outside the enum', () => {
    const result = propertySchema.safeParse({
      name: 'Résidence des Lilas',
      address: '12 rue des Lilas, 75011 Paris',
      type: 'castle',
    })
    expect(result.success).toBe(false)
  })

  it('accepts every valid property type', () => {
    for (const type of ['apartment_building', 'house', 'commercial']) {
      const result = propertySchema.safeParse({
        name: 'Résidence des Lilas',
        address: '12 rue des Lilas, 75011 Paris',
        type,
      })
      expect(result.success).toBe(true)
    }
  })

  it('accepts a property without a description', () => {
    const result = propertySchema.safeParse({
      name: 'Résidence des Lilas',
      address: '12 rue des Lilas, 75011 Paris',
      type: 'apartment_building',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a property with a description', () => {
    const result = propertySchema.safeParse({
      name: 'Résidence des Lilas',
      address: '12 rue des Lilas, 75011 Paris',
      type: 'apartment_building',
      description: 'Un bel immeuble ancien rénové.',
    })
    expect(result.success).toBe(true)
  })
})
