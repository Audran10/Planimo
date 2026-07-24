// Extracted from the 'use server' actions file: server action modules may
// only export async functions, so these pure, synchronous validators live
// here to stay directly unit-testable.

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo
export const DANGEROUS_EXTENSIONS = ['.exe', '.sh', '.php', '.js']

export function isAllowedContentType(type: string): boolean {
  return type === 'application/pdf' || type.startsWith('image/')
}

export function hasDangerousExtension(filename: string): boolean {
  const lower = filename.toLowerCase()
  return DANGEROUS_EXTENSIONS.some((extension) => lower.endsWith(extension))
}
