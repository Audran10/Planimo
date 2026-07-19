const COMBINING_DIACRITICS = /[\u0300-\u036f]/g

export function generateSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateUniqueSlug(name: string, existingSlugs: string[]): string {
  const base = generateSlug(name)
  const existing = new Set(existingSlugs)

  if (!existing.has(base)) return base

  let suffix = 2
  while (existing.has(`${base}-${suffix}`)) {
    suffix++
  }

  return `${base}-${suffix}`
}
