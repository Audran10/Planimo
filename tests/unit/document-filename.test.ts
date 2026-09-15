import { describe, expect, it } from 'vitest'
import { documentNameFromFile } from '@/features/documents/lib/build-filename'

describe('documentNameFromFile', () => {
  it('uses the filename without its extension', () => {
    expect(documentNameFromFile('Devis plomberie.pdf')).toBe('Devis plomberie')
  })

  it('keeps names that have no extension', () => {
    expect(documentNameFromFile('facture')).toBe('facture')
  })

  it('falls back when the basename is empty', () => {
    expect(documentNameFromFile('   ')).toBe('Document')
  })
})
