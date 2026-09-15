'use server'

import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { MemberRole } from '@/core/types'
import type { PendingInvitation } from '@/features/members/types'
import {
  canAdminProperty,
  canAssignMemberRole,
  canInviteAs,
  canRemoveMember,
  getPropertyActorRole,
} from '@/features/members/lib/permissions'

const MEMBER_ROLES = ['admin', 'editor', 'viewer'] as const

function isMemberRole(role: string): role is MemberRole {
  return (MEMBER_ROLES as readonly string[]).includes(role)
}

function revalidateMemberPaths() {
  revalidatePath('/properties/[slug]', 'page')
  revalidatePath('/properties')
}

export async function inviteMember(
  propertyId: string,
  email: string,
  role: MemberRole
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')
  if (!isMemberRole(role)) throw new Error('Rôle invalide')

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { members: true },
  })

  if (!property) throw new Error('Bien introuvable')

  const actorRole = getPropertyActorRole(
    property.ownerId,
    property.members,
    session.user.id
  )
  if (!canAdminProperty(actorRole) || !canInviteAs(actorRole, role)) {
    throw new Error('Droits insuffisants')
  }

  const targetUser = await prisma.user.findUnique({
    where: { email },
  })

  if (!targetUser) throw new Error('Utilisateur introuvable')
  if (targetUser.id === property.ownerId) {
    throw new Error('Cette personne est déjà propriétaire de ce bien')
  }
  if (property.members.some((member) => member.userId === targetUser.id)) {
    throw new Error('Cette personne est déjà membre de ce bien')
  }

  const member = await prisma.propertyMember.create({
    data: {
      propertyId,
      userId: targetUser.id,
      role,
    },
  })

  revalidateMemberPaths()

  return member
}

export async function updateMemberRole(
  propertyId: string,
  userId: string,
  role: MemberRole
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')
  if (!isMemberRole(role)) throw new Error('Rôle invalide')

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { members: true },
  })
  if (!property) throw new Error('Bien introuvable')

  if (userId === property.ownerId) {
    throw new Error('Impossible de modifier le rôle du propriétaire')
  }
  if (userId === session.user.id) {
    throw new Error('Vous ne pouvez pas modifier votre propre rôle')
  }

  const target = property.members.find((member) => member.userId === userId)
  if (!target) throw new Error('Membre introuvable')
  if (!isMemberRole(target.role)) throw new Error('Rôle invalide')

  const actorRole = getPropertyActorRole(
    property.ownerId,
    property.members,
    session.user.id
  )
  if (!canAssignMemberRole(actorRole, target.role, role)) {
    throw new Error('Droits insuffisants')
  }

  const member = await prisma.propertyMember.update({
    where: { propertyId_userId: { propertyId, userId } },
    data: { role },
  })

  revalidateMemberPaths()

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

  if (userId === property.ownerId) {
    throw new Error('Impossible de supprimer le propriétaire du bien')
  }

  const target = property.members.find((member) => member.userId === userId)
  if (!target) throw new Error('Membre introuvable')
  if (!isMemberRole(target.role)) throw new Error('Rôle invalide')

  const actorRole = getPropertyActorRole(
    property.ownerId,
    property.members,
    session.user.id
  )
  if (!canRemoveMember(actorRole, target.role)) {
    throw new Error('Droits insuffisants')
  }

  await prisma.propertyMember.delete({
    where: {
      propertyId_userId: { propertyId, userId },
    },
  })

  revalidateMemberPaths()
}

export async function getPendingInvitations(): Promise<PendingInvitation[]> {
  const session = await requireSession()

  const memberships = await prisma.propertyMember.findMany({
    where: { userId: session.user.id, acceptedAt: null },
    include: {
      property: {
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
          owner: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { invitedAt: 'desc' },
  })

  return memberships.map((membership) => ({
    propertyId: membership.propertyId,
    propertyName: membership.property.name,
    propertySlug: membership.property.slug,
    propertyAddress: membership.property.address,
    role: membership.role as MemberRole,
    invitedAt: membership.invitedAt,
    invitedBy: membership.property.owner.name || membership.property.owner.email,
  }))
}

export async function acceptInvitation(propertyId: string) {
  const session = await requireSession()
  const membership = await requirePendingMembership(propertyId, session.user.id)

  await prisma.propertyMember.update({
    where: { id: membership.id },
    data: { acceptedAt: new Date() },
  })

  revalidatePath('/properties')
  revalidatePath('/properties/[slug]', 'page')
}

export async function declineInvitation(propertyId: string) {
  const session = await requireSession()
  const membership = await requirePendingMembership(propertyId, session.user.id)

  await prisma.propertyMember.delete({ where: { id: membership.id } })

  revalidatePath('/properties')
}

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')
  return session
}

async function requirePendingMembership(propertyId: string, userId: string) {
  const membership = await prisma.propertyMember.findFirst({
    where: { propertyId, userId, acceptedAt: null },
  })
  if (!membership) throw new Error('Invitation introuvable')
  return membership
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
