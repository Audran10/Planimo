import { describe, expect, it } from 'vitest'
import { getFloorPlanLabel, getUnitLabel } from '@/core/lib/property-labels'

describe('getUnitLabel', () => {
  it('returns the singular apartment label', () => {
    expect(getUnitLabel('apartment_building')).toBe('Appartement')
  })

  it('returns the plural apartment label', () => {
    expect(getUnitLabel('apartment_building', true)).toBe('Appartements')
  })

  it('returns the singular commercial label', () => {
    expect(getUnitLabel('commercial')).toBe('Local')
  })

  it('returns the plural commercial label', () => {
    expect(getUnitLabel('commercial', true)).toBe('Locaux')
  })

  it('falls back to the generic unit label for other types', () => {
    expect(getUnitLabel('house')).toBe('Unité')
  })
})

describe('getFloorPlanLabel', () => {
  it('names the house plan', () => {
    expect(getFloorPlanLabel('house')).toBe('Plan de la maison')
    expect(getFloorPlanLabel('house', true)).toBe('Plans de la maison')
  })

  it('keeps the apartment wording', () => {
    expect(getFloorPlanLabel('apartment_building')).toBe("Plan de l'appartement")
  })
})
