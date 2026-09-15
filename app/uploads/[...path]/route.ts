import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { resolveLocalUploadPath } from '@/core/lib/storage'

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const segments = (await context.params).path
  if (segments.length < 2) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const [bucket, ...fileSegments] = segments

  try {
    const absolute = resolveLocalUploadPath(bucket, fileSegments.join('/'))
    const bytes = await readFile(absolute)
    const contentType =
      CONTENT_TYPES[path.extname(absolute).toLowerCase()] ?? 'application/octet-stream'

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return new NextResponse('Not Found', { status: 404 })
  }
}
