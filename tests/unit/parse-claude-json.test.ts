import { describe, expect, it } from 'vitest'
import { parseClaudeJson } from '@/features/units/lib/parse-claude-json'

const payload = { rooms: [{ id: 'salon', name: 'Salon', cells: [2] }], confidence: 0.9 }

describe('parseClaudeJson', () => {
  it('parses a raw JSON object', () => {
    expect(parseClaudeJson(JSON.stringify(payload))).toEqual(payload)
  })

  it('strips a markdown fence, which is how Claude often answers', () => {
    expect(parseClaudeJson('```json\n' + JSON.stringify(payload, null, 2) + '\n```')).toEqual(
      payload
    )
  })

  it('ignores prose around the object', () => {
    expect(parseClaudeJson('Voici le résultat :\n' + JSON.stringify(payload) + '\nfin')).toEqual(
      payload
    )
  })

  it('throws when there is no JSON object', () => {
    expect(() => parseClaudeJson('pas de json ici')).toThrow('Réponse Claude sans JSON')
  })
})
