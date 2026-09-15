import { describe, expect, it } from 'vitest'
import {
  canAdminProperty,
  canAssignMemberRole,
  canInviteAs,
  canOwnProperty,
  canRemoveMember,
  canWriteProperty,
  getPropertyActorRole,
} from '@/features/members/lib/permissions'

describe('canWriteProperty', () => {
  it('allows owner, admin and editor', () => {
    expect(canWriteProperty('owner')).toBe(true)
    expect(canWriteProperty('admin')).toBe(true)
    expect(canWriteProperty('editor')).toBe(true)
  })

  it('forbids a viewer', () => {
    expect(canWriteProperty('viewer')).toBe(false)
    expect(canWriteProperty(null)).toBe(false)
  })
})

describe('canAdminProperty', () => {
  it('allows owner and admin only', () => {
    expect(canAdminProperty('owner')).toBe(true)
    expect(canAdminProperty('admin')).toBe(true)
    expect(canAdminProperty('editor')).toBe(false)
    expect(canAdminProperty('viewer')).toBe(false)
  })
})

describe('canOwnProperty', () => {
  it('allows the owner only', () => {
    expect(canOwnProperty('owner')).toBe(true)
    expect(canOwnProperty('admin')).toBe(false)
  })
})

describe('getPropertyActorRole', () => {
  it('returns owner even if a membership row also exists', () => {
    expect(
      getPropertyActorRole(
        'user-1',
        [{ userId: 'user-1', role: 'editor', acceptedAt: new Date() }],
        'user-1'
      )
    ).toBe('owner')
  })

  it('ignores a pending invitation', () => {
    expect(
      getPropertyActorRole(
        'user-1',
        [{ userId: 'user-2', role: 'admin', acceptedAt: null }],
        'user-2'
      )
    ).toBeNull()
  })
})

describe('canInviteAs', () => {
  it('lets the owner invite any member role', () => {
    expect(canInviteAs('owner', 'admin')).toBe(true)
    expect(canInviteAs('owner', 'editor')).toBe(true)
    expect(canInviteAs('owner', 'viewer')).toBe(true)
  })

  it('lets an admin invite editors and viewers only', () => {
    expect(canInviteAs('admin', 'admin')).toBe(false)
    expect(canInviteAs('admin', 'editor')).toBe(true)
    expect(canInviteAs('admin', 'viewer')).toBe(true)
  })

  it('forbids editors and viewers from inviting', () => {
    expect(canInviteAs('editor', 'viewer')).toBe(false)
    expect(canInviteAs('viewer', 'viewer')).toBe(false)
  })
})

describe('canAssignMemberRole', () => {
  it('lets the owner change any member role', () => {
    expect(canAssignMemberRole('owner', 'viewer', 'admin')).toBe(true)
    expect(canAssignMemberRole('owner', 'admin', 'editor')).toBe(true)
  })

  it('lets an admin change editor/viewer roles, but not admins', () => {
    expect(canAssignMemberRole('admin', 'viewer', 'editor')).toBe(true)
    expect(canAssignMemberRole('admin', 'editor', 'viewer')).toBe(true)
    expect(canAssignMemberRole('admin', 'editor', 'admin')).toBe(false)
    expect(canAssignMemberRole('admin', 'admin', 'editor')).toBe(false)
  })
})

describe('canRemoveMember', () => {
  it('lets the owner remove any member', () => {
    expect(canRemoveMember('owner', 'admin')).toBe(true)
    expect(canRemoveMember('owner', 'editor')).toBe(true)
  })

  it('lets an admin remove editors and viewers, but not other admins', () => {
    expect(canRemoveMember('admin', 'editor')).toBe(true)
    expect(canRemoveMember('admin', 'viewer')).toBe(true)
    expect(canRemoveMember('admin', 'admin')).toBe(false)
  })
})
