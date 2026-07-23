import { describe, expect, it } from 'vitest'
import { getUnitLabel } from '@/core/lib/property-labels'

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
