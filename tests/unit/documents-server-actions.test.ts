import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/core/lib/db'
import { auth } from '@/core/lib/auth'
import { uploadFile } from '@/core/lib/supabase'
import { checkPropertyAccess } from '@/features/members/actions/members'
import {
  createDocument,
  deleteDocument,
  uploadDocumentFile,
} from '@/features/documents/actions/documents'
import { fakeSession } from './helpers/session'

vi.mock('@/features/members/actions/members', () => ({
  checkPropertyAccess: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(auth.api.getSession).mockReset()
  vi.mocked(checkPropertyAccess).mockReset()
  vi.mocked(prisma.unit.findUnique).mockReset()
  vi.mocked(prisma.room.findUnique).mockReset()
  vi.mocked(prisma.tenant.findUnique).mockReset()
  vi.mocked(prisma.document.findUnique).mockReset()
  vi.mocked(prisma.document.create).mockReset()
  vi.mocked(prisma.document.delete).mockReset()
  vi.mocked(uploadFile).mockReset()
})

describe('createDocument', () => {
  it('resolves the property via unitId', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
      propertyId: 'prop-1',
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(prisma.document.create).mockResolvedValueOnce({ id: 'doc-1' } as never)

    await createDocument({
      name: 'Facture',
      type: 'invoice',
      unitId: 'unit-1',
      fileUrl: 'https://x/y.pdf',
      fileType: 'application/pdf',
      fileSize: 100,
    })

    expect(prisma.room.findUnique).not.toHaveBeenCalled()
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled()
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
    vi.mocked(prisma.document.create).mockResolvedValueOnce({ id: 'doc-1' } as never)

    await createDocument({
      name: 'Diagnostic',
      type: 'diagnostic',
      roomId: 'room-1',
      fileUrl: 'https://x/y.pdf',
      fileType: 'application/pdf',
      fileSize: 100,
    })

    expect(prisma.document.create).toHaveBeenCalled()
  })

  it('resolves the property via tenantId when there is no unitId or roomId', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce({
      unit: { propertyId: 'prop-1' },
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'editor',
    })
    vi.mocked(prisma.document.create).mockResolvedValueOnce({ id: 'doc-1' } as never)

    await createDocument({
      name: 'Bail',
      type: 'lease',
      tenantId: 'tenant-1',
      fileUrl: 'https://x/y.pdf',
      fileType: 'application/pdf',
      fileSize: 100,
    })

    expect(prisma.document.create).toHaveBeenCalled()
  })

  it('throws when the document is not attached to anything', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)

    await expect(
      createDocument({
        name: 'Orphelin',
        type: 'other',
        fileUrl: 'https://x/y.pdf',
        fileType: 'application/pdf',
        fileSize: 100,
      })
    ).rejects.toThrow()
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
      createDocument({
        name: 'Facture',
        type: 'invoice',
        unitId: 'unit-1',
        fileUrl: 'https://x/y.pdf',
        fileType: 'application/pdf',
        fileSize: 100,
      })
    ).rejects.toThrow('Droits insuffisants pour ajouter un document')
    expect(prisma.document.create).not.toHaveBeenCalled()
  })
})

describe('deleteDocument', () => {
  it('throws when the document does not exist', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.document.findUnique).mockResolvedValueOnce(null as never)

    await expect(deleteDocument('doc-1')).rejects.toThrow('Document introuvable')
  })

  it('throws when the user only has viewer access', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(prisma.document.findUnique).mockResolvedValueOnce({
      id: 'doc-1',
      unitId: 'unit-1',
      roomId: null,
      tenantId: null,
      fileUrl: 'https://x/object/public/documents/user-1/a.pdf',
    } as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
      propertyId: 'prop-1',
    } as never)
    vi.mocked(checkPropertyAccess).mockResolvedValueOnce({
      hasAccess: true,
      role: 'viewer',
    })

    await expect(deleteDocument('doc-1')).rejects.toThrow(
      'Droits insuffisants pour supprimer ce document'
    )
    expect(prisma.document.delete).not.toHaveBeenCalled()
  })
})

describe('uploadDocumentFile', () => {
  function fakeFile(name: string, type: string, size = 100) {
    return new File([new Uint8Array(size)], name, { type })
  }

  function formDataFor(file: File, bucket: string, path: string) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)
    formData.append('path', path)
    return formData
  }

  it('throws when the path does not start with the session user id', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)

    const formData = formDataFor(
      fakeFile('bail.pdf', 'application/pdf'),
      'documents',
      'other-user/floor-plans/unit-1/bail.pdf'
    )

    await expect(uploadDocumentFile(formData)).rejects.toThrow(
      'Chemin de fichier invalide'
    )
    expect(uploadFile).not.toHaveBeenCalled()
  })

  it('throws for a dangerous file extension even with an allowed MIME type', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)

    const formData = formDataFor(
      fakeFile('payload.js', 'application/pdf'),
      'documents',
      'user-1/floor-plans/unit-1/payload.js'
    )

    await expect(uploadDocumentFile(formData)).rejects.toThrow(
      'Type de fichier non autorisé'
    )
  })

  it('throws for a disallowed content type', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)

    const formData = formDataFor(
      fakeFile('archive.zip', 'application/zip'),
      'documents',
      'user-1/floor-plans/unit-1/archive.zip'
    )

    await expect(uploadDocumentFile(formData)).rejects.toThrow(
      'Type de fichier non autorisé (PDF ou image uniquement)'
    )
  })

  it('throws when the file exceeds the 10 Mo limit', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)

    const formData = formDataFor(
      fakeFile('scan.pdf', 'application/pdf', 11 * 1024 * 1024),
      'documents',
      'user-1/floor-plans/unit-1/scan.pdf'
    )

    await expect(uploadDocumentFile(formData)).rejects.toThrow(
      'Le fichier dépasse la taille maximale de 10 Mo'
    )
  })

  it('uploads a valid file within the user own path', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(fakeSession('user-1') as never)
    vi.mocked(uploadFile).mockResolvedValueOnce('https://x/y/bail.pdf')

    const formData = formDataFor(
      fakeFile('bail.pdf', 'application/pdf'),
      'documents',
      'user-1/floor-plans/unit-1/bail.pdf'
    )

    const result = await uploadDocumentFile(formData)

    expect(result).toEqual({
      url: 'https://x/y/bail.pdf',
      fileType: 'application/pdf',
      fileSize: 100,
    })
  })
})
