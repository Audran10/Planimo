'use server'

import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import type { CreateUnitInput } from '../types'

export async function getUnits(propertyId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')

  return prisma.unit.findMany({
    where: { propertyId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createUnit(input: CreateUnitInput) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')

  return prisma.unit.create({ data: input })
}
