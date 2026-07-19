'use server'

import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { MemberRole } from '@/core/types'

export async function inviteMember(
  propertyId: string,
  email: string,
  role: MemberRole
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { members: true },
  })

  if (!property) throw new Error('Bien introuvable')

  const isOwner = property.ownerId === session.user.id
  const isAdmin = property.members.some(
    (m: { userId: string; role: string }) => m.userId === session.user.id && m.role === 'admin'
  )

  if (!isOwner && !isAdmin) {
    throw new Error('Droits insuffisants')
  }

  const targetUser = await prisma.user.findUnique({
    where: { email },
  })

  if (!targetUser) throw new Error('Utilisateur introuvable')

  const member = await prisma.propertyMember.upsert({
    where: {
      propertyId_userId: {
        propertyId,
        userId: targetUser.id,
      },
    },
    update: { role },
    create: {
      propertyId,
      userId: targetUser.id,
      role,
    },
  })

  revalidatePath('/properties/[slug]', 'page')

  return member
}

export async function removePropertyMember(propertyId: string, userId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { members: true },
  })
  if (!property) throw new Error('Bien introuvable')

  const isOwner = property.ownerId === session.user.id
  const isAdmin = property.members.some(
    (m: { userId: string; acceptedAt: Date | null; role: string }) =>
      m.userId === session.user.id && m.acceptedAt && m.role === 'admin'
  )

  if (!isOwner && !isAdmin) {
    throw new Error('Droits insuffisants')
  }

  if (userId === property.ownerId) {
    throw new Error('Impossible de supprimer le propriétaire du bien')
  }

  await prisma.propertyMember.delete({
    where: {
      propertyId_userId: { propertyId, userId },
    },
  })

  revalidatePath('/properties/[slug]', 'page')
}

export async function acceptInvitation(propertyId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')

  return prisma.propertyMember.update({
    where: {
      propertyId_userId: {
        propertyId,
        userId: session.user.id,
      },
    },
    data: {
      acceptedAt: new Date(),
    },
  })
}

export async function checkPropertyAccess(
  propertyId: string,
  userId: string
): Promise<{ hasAccess: boolean; role: MemberRole | 'owner' | null }> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      members: {
        where: {
          userId,
          acceptedAt: { not: null },
        },
      },
    },
  })

  if (!property) return { hasAccess: false, role: null }
  if (property.ownerId === userId) return { hasAccess: true, role: 'owner' }

  const membership = property.members[0]
  if (membership) return { hasAccess: true, role: membership.role as MemberRole }

  return { hasAccess: false, role: null }
}
