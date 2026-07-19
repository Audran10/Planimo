import { generateSlug } from '@/core/lib/slugify'

export function buildDocumentFilename(originalName: string) {
  const dotIndex = originalName.lastIndexOf('.')
  const extension = dotIndex > -1 ? originalName.slice(dotIndex) : ''
  const baseName = dotIndex > -1 ? originalName.slice(0, dotIndex) : originalName
  return `${Date.now()}-${generateSlug(baseName)}${extension}`
}
