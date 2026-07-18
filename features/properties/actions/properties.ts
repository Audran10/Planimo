'use server'

import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import type { CreatePropertyInput } from '../types'

export async function getProperties() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')

  return prisma.property.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        {
          members: {
            some: {
              userId: session.user.id,
              acceptedAt: { not: null },
            },
          },
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createProperty(input: CreatePropertyInput) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')

  return prisma.property.create({
    data: {
      ...input,
      ownerId: session.user.id,
    },
  })
}
