import type { MemberRole } from '@/core/types'
import type { PropertyRole } from '@/features/properties/types'

type AccessRole = PropertyRole | MemberRole | 'owner' | null

export type PropertyMembership = {
  userId: string
  role: string
  acceptedAt: Date | null
}

/** Créer / modifier appartements, locataires, documents, plans, interventions. */
export function canWriteProperty(role: AccessRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor'
}

/** Modifier le bien, inviter des membres, supprimer un appartement. */
export function canAdminProperty(role: AccessRole): boolean {
  return role === 'owner' || role === 'admin'
}

export function canOwnProperty(role: AccessRole): boolean {
  return role === 'owner'
}

export function getPropertyActorRole(
  ownerId: string,
  members: PropertyMembership[],
  userId: string
): AccessRole {
  if (ownerId === userId) return 'owner'
  const membership = members.find(
    (member) => member.userId === userId && member.acceptedAt
  )
  return (membership?.role as MemberRole) ?? null
}

/** Un admin ne peut inviter que des éditeurs et lecteurs. */
export function canInviteAs(actor: AccessRole, role: MemberRole): boolean {
  if (actor === 'owner') return true
  if (actor === 'admin') return role === 'editor' || role === 'viewer'
  return false
}

/** Un admin ne peut pas modifier un autre admin, ni promouvoir en admin. */
export function canAssignMemberRole(
  actor: AccessRole,
  targetRole: MemberRole,
  nextRole: MemberRole
): boolean {
  if (actor === 'owner') return true
  if (actor === 'admin') {
    if (targetRole === 'admin') return false
    return nextRole === 'editor' || nextRole === 'viewer'
  }
  return false
}

/** Un admin ne peut pas retirer un autre admin. */
export function canRemoveMember(
  actor: AccessRole,
  targetRole: MemberRole
): boolean {
  if (actor === 'owner') return true
  if (actor === 'admin') return targetRole !== 'admin'
  return false
}
