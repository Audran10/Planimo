import { describe, expect, it } from 'vitest'
import { generateSlug, generateUniqueSlug } from '@/core/lib/slugify'

describe('generateSlug', () => {
  it('slugifies a simple name', () => {
    expect(generateSlug('Immeuble Libourne')).toBe('immeuble-libourne')
  })

  it('strips accents', () => {
    expect(generateSlug('Résidence Saint-André')).toBe('residence-saint-andre')
  })

  it('trims surrounding whitespace and collapses it', () => {
    expect(generateSlug('  Espaces  ')).toBe('espaces')
  })
})

describe('generateUniqueSlug', () => {
  it('appends the next available numeric suffix on collision', () => {
    expect(generateUniqueSlug('test', ['test', 'test-2'])).toBe('test-3')
  })

  it('returns the base slug when there is no collision', () => {
    expect(generateUniqueSlug('nouveau', [])).toBe('nouveau')
  })
})
