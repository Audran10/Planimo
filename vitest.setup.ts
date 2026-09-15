import { vi } from 'vitest'

// Mock Prisma pour les tests unitaires
vi.mock('@/core/lib/db', () => ({
  prisma: {
    property: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    unit: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tenant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    room: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workOrder: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    propertyMember: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

// Mock Better Auth — les Server Actions appellent toutes
// `auth.api.getSession({ headers })`.
vi.mock('@/core/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

// Mock next/headers — toujours résolu, le contenu n'a pas d'importance
// puisque `auth.api.getSession` est lui-même mocké.
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

// Mock next/cache — revalidatePath ne doit rien faire pendant les tests.
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Storage — jamais d'appel disque/réseau pendant les tests.
vi.mock('@/core/lib/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/lib/storage')>()
  return {
    ...actual,
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
    readStoredFile: vi.fn(),
  }
})
