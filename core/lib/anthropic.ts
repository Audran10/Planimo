import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null
let cachedKey: string | undefined

export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!client || cachedKey !== apiKey) {
    client = new Anthropic({ apiKey })
    cachedKey = apiKey
  }
  return client
}
