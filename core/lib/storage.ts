import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { deleteFromSupabase, hasSupabaseConfig, uploadToSupabase } from './supabase'

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads')

export function extractStoragePath(fileUrl: string, bucket: string): string | null {
  const markers = [`/object/public/${bucket}/`, `/uploads/${bucket}/`]
  for (const marker of markers) {
    const index = fileUrl.indexOf(marker)
    if (index !== -1) {
      return decodeURIComponent(fileUrl.slice(index + marker.length))
    }
  }
  return null
}

export function resolveLocalUploadPath(bucket: string, filePath: string): string {
  const absolute = path.resolve(UPLOADS_ROOT, bucket, filePath)
  const relative = path.relative(UPLOADS_ROOT, absolute)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Chemin de fichier invalide')
  }
  return absolute
}

function localPublicUrl(bucket: string, filePath: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const encoded = [bucket, ...filePath.split('/')].map(encodeURIComponent).join('/')
  return `${base}/uploads/${encoded}`
}

async function uploadLocal(file: File, bucket: string, filePath: string): Promise<string> {
  const absolute = resolveLocalUploadPath(bucket, filePath)
  await mkdir(path.dirname(absolute), { recursive: true })
  await writeFile(absolute, Buffer.from(await file.arrayBuffer()))
  return localPublicUrl(bucket, filePath)
}

async function deleteLocal(bucket: string, filePath: string): Promise<void> {
  const absolute = resolveLocalUploadPath(bucket, filePath)
  try {
    await unlink(absolute)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return
    }
    throw error
  }
}

export async function uploadFile(
  file: File,
  bucket: string,
  filePath: string
): Promise<string> {
  if (hasSupabaseConfig()) {
    return uploadToSupabase(file, bucket, filePath)
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Supabase Storage n’est pas configuré. Renseignez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return uploadLocal(file, bucket, filePath)
}

export async function deleteFile(bucket: string, filePath: string): Promise<void> {
  if (hasSupabaseConfig()) {
    await deleteFromSupabase(bucket, filePath)
    return
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Supabase Storage n’est pas configuré. Renseignez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  await deleteLocal(bucket, filePath)
}

export async function readStoredFile(fileUrl: string, bucket: string): Promise<Buffer> {
  const storagePath = extractStoragePath(fileUrl, bucket)

  if (!hasSupabaseConfig() && storagePath) {
    return readFile(resolveLocalUploadPath(bucket, storagePath))
  }

  const response = await fetch(fileUrl)
  if (!response.ok) {
    throw new Error(`Fichier inaccessible (${response.status})`)
  }
  return Buffer.from(await response.arrayBuffer())
}
