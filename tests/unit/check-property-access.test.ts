import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkPropertyAccess } from '@/features/members/actions/members'
import { prisma } from '@/core/lib/db'

describe('checkPropertyAccess', () => {
  beforeEach(() => {
    vi.mocked(prisma.property.findUnique).mockReset()
  })

  it('returns no access when the property does not exist', async () => {
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce(null as never)

    const result = await checkPropertyAccess('prop-1', 'user-1')

    expect(result).toEqual({ hasAccess: false, role: null })
  })

  it('returns owner access when the user is the property owner', async () => {
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'user-1',
      members: [],
    } as never)

    const result = await checkPropertyAccess('prop-1', 'user-1')

    expect(result).toEqual({ hasAccess: true, role: 'owner' })
  })

  it('returns admin access for an accepted admin member', async () => {
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'other-user',
      members: [{ userId: 'user-1', role: 'admin', acceptedAt: new Date() }],
    } as never)

    const result = await checkPropertyAccess('prop-1', 'user-1')

    expect(result).toEqual({ hasAccess: true, role: 'admin' })
  })

  it('returns editor access for an accepted editor member', async () => {
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'other-user',
      members: [{ userId: 'user-1', role: 'editor', acceptedAt: new Date() }],
    } as never)

    const result = await checkPropertyAccess('prop-1', 'user-1')

    expect(result).toEqual({ hasAccess: true, role: 'editor' })
  })

  it('excludes pending invitations via the acceptedAt filter passed to Prisma', async () => {
    // checkPropertyAccess never sees a pending membership at all: Prisma's
    // own nested `where: { acceptedAt: { not: null } }` filter excludes it
    // before the result comes back, so `members` arrives empty. The
    // function's correctness for this case rests entirely on that query
    // shape, so we assert it directly rather than just the return value
    // (which would be indistinguishable from "not a member").
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'other-user',
      members: [],
    } as never)

    const result = await checkPropertyAccess('prop-1', 'user-1')

    expect(prisma.property.findUnique).toHaveBeenCalledWith({
      where: { id: 'prop-1' },
      include: {
        members: {
          where: { userId: 'user-1', acceptedAt: { not: null } },
        },
      },
    })
    expect(result).toEqual({ hasAccess: false, role: null })
  })

  it('returns no access when the user is neither owner nor member', async () => {
    vi.mocked(prisma.property.findUnique).mockResolvedValueOnce({
      id: 'prop-1',
      ownerId: 'other-user',
      members: [],
    } as never)

    const result = await checkPropertyAccess('prop-1', 'user-1')

    expect(result).toEqual({ hasAccess: false, role: null })
  })
})
