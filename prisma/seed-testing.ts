// Deterministic test fixture seeder — NEVER run against production.
//
//   npm run db:seed:test          # idempotent: refresh accounts/photos/promos/vouchers
//   npm run db:seed:test:reset    # delete test fixture rows first (refuses if transactions exist)
//
// Requires the base seed (roles, games, permissions): npx tsx prisma/seed.ts
// Admin accounts are owned by the real superadmin from SUPERADMIN_* (.env).
// Test rows are namespaced: emails @nexaplay.test, account slugs test-*,
// promo names [TEST] *, voucher codes NEXA*.
//
// Modules: prisma/seed/testing/{config,data-games,users,accounts,promos,vouchers,reset}.ts

import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/client'
import { TEST_EMAIL_DOMAIN, TEST_PASSWORD } from './seed/testing/config'
import { removeLegacyTestAdmin, seedAdmin, seedBuyers } from './seed/testing/users'
import { seedAccounts } from './seed/testing/accounts'
import { seedPromos } from './seed/testing/promos'
import { seedVouchers } from './seed/testing/vouchers'
import { resetFixtures } from './seed/testing/reset'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_SEED !== '1') {
  throw new Error('Refusing to seed test fixtures in production (set ALLOW_TEST_SEED=1 to override).')
}

const RESET = process.argv.includes('--reset')

async function main(): Promise<void> {
  if (RESET) await resetFixtures(prisma)

  const admin = await seedAdmin(prisma)
  const { buyer1, buyer2 } = await seedBuyers(prisma)
  const { akunIds, akunCount, availableCount } = await seedAccounts(prisma, admin.id)
  await seedPromos(prisma, akunIds)
  await seedVouchers(prisma)
  await removeLegacyTestAdmin(prisma, admin.id)

  console.log('\nTest fixtures ready')
  console.log(`  accounts: ${akunCount} (${availableCount} AVAILABLE, ${akunCount - availableCount} RESERVED/DELISTED)`)
  console.log('  promos: 5 (3 active, 1 expired, 1 inactive)')
  console.log('  vouchers: NEXA10, NEXAHEMAT50K, NEXAMAKS25K, NEXAHABIS, NEXAKEDALUWARSA, NEXANONAKTIF')
  console.log('\nLogin')
  console.log(`  admin  : ${admin.username} / ${admin.email} (password dari SUPERADMIN_PASSWORD di .env)`)
  console.log(`  buyer  : ${buyer1.username} / ${buyer1.email}`)
  console.log(`  buyer  : ${buyer2.username} / ${buyer2.email}`)
  console.log(`  buyer password: ${TEST_PASSWORD}`)
  console.log(`  unverified buyer: tester_unverified / unverified${TEST_EMAIL_DOMAIN}`)
  console.log('\nWARNING: test data only — never enable in production.\n')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
