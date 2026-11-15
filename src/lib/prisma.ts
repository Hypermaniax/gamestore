// Runtime Prisma client — the single DATABASE_URL connection.
// Prisma 7 uses a driver adapter (no native query engine).

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      options: '-c timezone=UTC',
    }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
