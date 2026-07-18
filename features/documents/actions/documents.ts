'use server'

import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import type { CreateDocumentInput } from '../types'

export async function getDocuments(unitId?: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')

  return prisma.document.findMany({
    where: unitId ? { unitId } : undefined,
    orderBy: { createdAt: 'desc' },
  })
}

export async function createDocument(input: CreateDocumentInput) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')

  return prisma.document.create({ data: input })
}
