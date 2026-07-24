import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { checkPropertyAccess } from '@/features/members/actions/members'
import { deleteRoom, updateRoom } from '@/features/units/actions/rooms'
import { fakeSession } from './helpers/session'

vi.mock('@/features/members/actions/members', () => ({
  checkPropertyAccess: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(auth.api.getSession).mockReset()
  vi.mocked(checkPropertyAccess).mockReset()
  vi.mocked(prisma.room.findUnique).mockReset()
  vi.mocked(prisma.room.update).mockReset()
  vi.mocked(prisma.room.delete).mockReset()
})

describe('updateRoom', () => {
  it('throws when the room does not exist', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(null as never)

    await expect(updateRoom('room-1', { name: 'Salon' })).rejects.toThrow(
      'Pièce introuvable'
    )
  })

  it('throws when the user only has viewer access', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.room.findUnique).mockResolvedValueOnce({
      id: 'room-1',
      unit: { propertyId: 'prop-1' },
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'viewer',
    })

    await expect(updateRoom('room-1', { name: 'Salon' })).rejects.toThrow(
      'Droits insuffisants'
    )
  })

  it('merges new technical info with what was already stored', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.room.findUnique)
      .mockResolvedValueOnce({
        id: 'room-1',
        unit: { propertyId: 'prop-1' },
      } as never)
      .mockResolvedValueOnce({
        id: 'room-1',
        name: 'Salon',
        zoneCoordinates: { x: 10, y: 20, paintRef: 'Dulux blanc' },
      } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(prisma.room.update).mockResolvedValueOnce({ id: 'room-1' } as never)

    await updateRoom('room-1', { zoneCoordinates: { notes: 'Refait à neuf' } })

    expect(prisma.room.update).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      data: {
        name: 'Salon',
        zoneCoordinates: { x: 10, y: 20, paintRef: 'Dulux blanc', notes: 'Refait à neuf' },
      },
    })
  })
})

describe('deleteRoom', () => {
  it('throws when the room does not exist', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.room.findUnique).mockResolvedValueOnce(null as never)

    await expect(deleteRoom('room-1')).rejects.toThrow('Pièce introuvable')
  })

  it('throws when the user only has viewer access', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.room.findUnique).mockResolvedValueOnce({
      id: 'room-1',
      unit: { propertyId: 'prop-1' },
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'viewer',
    })

    await expect(deleteRoom('room-1')).rejects.toThrow(
      'Droits insuffisants pour supprimer cette pièce'
    )
    expect(prisma.room.delete).not.toHaveBeenCalled()
  })

  it('allows an editor to delete a room', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.room.findUnique).mockResolvedValueOnce({
      id: 'room-1',
      unit: { propertyId: 'prop-1' },
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(prisma.room.delete).mockResolvedValueOnce({ id: 'room-1' } as never)

    await deleteRoom('room-1')

    expect(prisma.room.delete).toHaveBeenCalledWith({ where: { id: 'room-1' } })
  })
})
