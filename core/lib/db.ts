import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/client'

/**
 * Sécurité : Prisma utilise des requêtes paramétrées qui protègent
 * nativement contre les injections SQL (OWASP A03:2021).
 * Ne jamais construire de requêtes SQL brutes avec des données utilisateur.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })
}

function getPrisma() {
  if (process.env.NODE_ENV === 'production') {
    return globalForPrisma.prisma ?? createPrismaClient()
  }

  // En HMR, un client créé avant `prisma generate` ignore les nouveaux champs
  // (`floorPlanCells`, etc.) et fait échouer les updates. On le recrée dès
  // que ce module est réévalué.
  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect()
  }
  return createPrismaClient()
}

export const prisma = getPrisma()
globalForPrisma.prisma = prisma
