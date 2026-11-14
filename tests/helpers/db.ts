import { prisma } from '../../src/lib/prisma'

export { prisma }

export async function resetDb(): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `
  if (rows.length === 0) return
  const tables = rows.map((row) => `"${row.tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE`)
}
