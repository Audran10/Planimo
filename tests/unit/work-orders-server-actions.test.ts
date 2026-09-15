import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { uploadFile } from '@/core/lib/storage'
import { checkPropertyAccess } from '@/features/members/actions/members'
import {
  attachFilesToWorkOrder,
  createWorkOrder,
  deleteWorkOrder,
  updateWorkOrder,
} from '@/features/work-orders/actions/work-orders'
import { fakeSession } from './helpers/session'

vi.mock('@/features/members/actions/members', () => ({
  checkPropertyAccess: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(auth.api.getSession).mockReset()
  vi.mocked(checkPropertyAccess).mockReset()
  vi.mocked(prisma.unit.findUnique).mockReset()
  vi.mocked(prisma.room.findUnique).mockReset()
  vi.mocked(prisma.workOrder.findUnique).mockReset()
  vi.mocked(prisma.workOrder.create).mockReset()
  vi.mocked(prisma.workOrder.update).mockReset()
  vi.mocked(prisma.workOrder.delete).mockReset()
  vi.mocked(prisma.document.create).mockReset()
  vi.mocked(uploadFile).mockReset()
})

describe('createWorkOrder', () => {
  it('rejects an invalid payload before resolving the property', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)

    await expect(
      createWorkOrder({ description: 'Fuit', unitId: 'unit-1' })
    ).rejects.toThrow()
    expect(prisma.unit.findUnique).not.toHaveBeenCalled()
  })

  it('resolves the property via unitId when provided', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
      propertyId: 'prop-1',
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(prisma.workOrder.create).mockResolvedValueOnce({ id: 'wo-1' } as never)

    await createWorkOrder({
      description: 'Réparation de la chaudière',
      unitId: 'unit-1',
    })

    expect(prisma.room.findUnique).not.toHaveBeenCalled()
    expect(prisma.workOrder.create).toHaveBeenCalled()
  })

  it('resolves the property via roomId when there is no unitId', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.room.findUnique).mockResolvedValueOnce({
      unit: { propertyId: 'prop-1' },
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(prisma.workOrder.create).mockResolvedValueOnce({ id: 'wo-1' } as never)

    await createWorkOrder({
      description: 'Réparation de la chaudière',
      roomId: 'room-1',
    })

    expect(prisma.workOrder.create).toHaveBeenCalled()
  })

  it('throws when neither unitId nor roomId is provided', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)

    await expect(
      createWorkOrder({ description: 'Réparation de la chaudière' })
    ).rejects.toThrow('Intervention non rattachée à un bien')
  })

  it('throws when the user only has viewer access', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
      propertyId: 'prop-1',
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'viewer',
    })

    await expect(
      createWorkOrder({ description: 'Réparation de la chaudière', unitId: 'unit-1' })
    ).rejects.toThrow('Droits insuffisants pour ajouter une intervention')
    expect(prisma.workOrder.create).not.toHaveBeenCalled()
  })
})

describe('updateWorkOrder', () => {
  it('throws when the work order does not exist', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValueOnce(null as never)

    await expect(updateWorkOrder('wo-1', { status: 'completed' })).rejects.toThrow(
      'Intervention introuvable'
    )
  })

  it('resolves the property from the linked unit', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValueOnce({
      id: 'wo-1',
      unit: { propertyId: 'prop-1' },
      room: null,
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(prisma.workOrder.update).mockResolvedValueOnce({ id: 'wo-1' } as never)

    await updateWorkOrder('wo-1', { status: 'completed' })

    expect(prisma.workOrder.update).toHaveBeenCalledWith({
      where: { id: 'wo-1' },
      data: { status: 'completed' },
    })
  })

  it('resolves the property from the linked room when there is no unit', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValueOnce({
      id: 'wo-1',
      unit: null,
      room: { unit: { propertyId: 'prop-1' } },
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'admin',
    })
    vi.mocked(prisma.workOrder.update).mockResolvedValueOnce({ id: 'wo-1' } as never)

    await updateWorkOrder('wo-1', { status: 'in_progress' })

    expect(checkPropertyAccess).toHaveBeenCalledWith('prop-1', 'user-1')
  })

  it('throws when the user lacks manage rights', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValueOnce({
      id: 'wo-1',
      unit: { propertyId: 'prop-1' },
      room: null,
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'viewer',
    })

    await expect(updateWorkOrder('wo-1', { status: 'completed' })).rejects.toThrow(
      'Droits insuffisants'
    )
  })
})

describe('deleteWorkOrder', () => {
  it('throws when the work order does not exist', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValueOnce(null as never)

    await expect(deleteWorkOrder('wo-1')).rejects.toThrow('Intervention introuvable')
  })

  it('throws when the user only has viewer access', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValueOnce({
      id: 'wo-1',
      unit: { propertyId: 'prop-1' },
      room: null,
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'viewer',
    })

    await expect(deleteWorkOrder('wo-1')).rejects.toThrow(
      'Droits insuffisants pour supprimer cette intervention'
    )
    expect(prisma.workOrder.delete).not.toHaveBeenCalled()
  })

  it('allows an editor to delete a work order', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValueOnce({
      id: 'wo-1',
      unit: { propertyId: 'prop-1' },
      room: null,
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(prisma.workOrder.delete).mockResolvedValueOnce({ id: 'wo-1' } as never)

    await deleteWorkOrder('wo-1')

    expect(prisma.workOrder.delete).toHaveBeenCalledWith({ where: { id: 'wo-1' } })
  })
})

describe('attachFilesToWorkOrder', () => {
  function fakeFile(name: string, type: string, size = 100) {
    return new File([new Uint8Array(size)], name, { type })
  }

  function filesFormData(...files: File[]) {
    const formData = new FormData()
    for (const file of files) formData.append('files', file)
    return formData
  }

  const workOrderWithUnit = {
    id: 'wo-1',
    unit: {
      id: 'unit-1',
      slug: 'apt-1',
      propertyId: 'prop-1',
      property: { slug: 'maison' },
    },
    room: null,
  }

  it('uploads selected files without asking for a name or type', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValueOnce(workOrderWithUnit as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(uploadFile).mockResolvedValueOnce('https://files/devis.pdf')
    vi.mocked(prisma.document.create).mockResolvedValueOnce({
      id: 'doc-1',
      name: 'Devis plomberie',
      type: 'other',
    } as never)

    const created = await attachFilesToWorkOrder(
      'wo-1',
      filesFormData(fakeFile('Devis plomberie.pdf', 'application/pdf'))
    )

    expect(created).toHaveLength(1)
    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Devis plomberie',
        type: 'other',
        workOrderId: 'wo-1',
        unitId: 'unit-1',
        fileType: 'application/pdf',
        fileSize: 100,
      }),
    })
  })

  it('attaches several files to the same work order', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValueOnce(workOrderWithUnit as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(uploadFile)
      .mockResolvedValueOnce('https://files/a.pdf')
      .mockResolvedValueOnce('https://files/b.jpg')
    vi.mocked(prisma.document.create)
      .mockResolvedValueOnce({ id: 'doc-1', name: 'a', type: 'other' } as never)
      .mockResolvedValueOnce({ id: 'doc-2', name: 'b', type: 'other' } as never)

    const created = await attachFilesToWorkOrder(
      'wo-1',
      filesFormData(
        fakeFile('a.pdf', 'application/pdf'),
        fakeFile('b.jpg', 'image/jpeg')
      )
    )

    expect(created).toHaveLength(2)
    expect(uploadFile).toHaveBeenCalledTimes(2)
    expect(prisma.document.create).toHaveBeenCalledTimes(2)
  })

  it('rejects a viewer', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValueOnce(workOrderWithUnit as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'viewer',
    })

    await expect(
      attachFilesToWorkOrder('wo-1', filesFormData(fakeFile('a.pdf', 'application/pdf')))
    ).rejects.toThrow('Droits insuffisants')
    expect(uploadFile).not.toHaveBeenCalled()
  })

  it('throws when no file is selected', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValueOnce(workOrderWithUnit as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })

    await expect(attachFilesToWorkOrder('wo-1', new FormData())).rejects.toThrow(
      'Aucun fichier sélectionné'
    )
  })
})
