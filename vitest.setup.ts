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
    propertyMember: {
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))
