'use server'

import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import type { CreateTenantInput } from '../types'

export async function getTenants(unitId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')

  return prisma.tenant.findMany({
    where: { unitId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createTenant(input: CreateTenantInput) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')

  return prisma.tenant.create({ data: input })
}
