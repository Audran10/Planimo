/**
 * Claude enveloppe souvent le JSON dans un fence markdown malgré la consigne
 * « sans markdown ». On isole le premier objet, fence ou pas.
 */
export function parseClaudeJson<T>(text: string): T {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const candidate = (fenced?.[1] ?? trimmed).trim()

  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new SyntaxError('Réponse Claude sans JSON')
  }

  return JSON.parse(candidate.slice(start, end + 1)) as T
}
