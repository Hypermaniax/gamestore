import { afterAll, describe, expect, it } from 'vitest'
import { prisma } from '../helpers/db'

afterAll(async () => {
  await prisma.$disconnect()
})

describe('migrasi dari nol', () => {
  it('menerapkan seluruh migration dan tabel inti tersedia', async () => {
    const migrations = await prisma.$queryRaw<Array<{ amount: bigint }>>`
      SELECT count(*) AS amount FROM _prisma_migrations WHERE finished_at IS NOT NULL
    `
    expect(Number(migrations[0]?.amount ?? 0)).toBeGreaterThanOrEqual(3)

    const tabel = await prisma.$queryRaw<Array<{ amount: bigint }>>`
      SELECT count(*) AS amount FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'users', 'roles', 'menus', 'permissions', 'role_menus', 'role_permissions',
          'email_tokens', 'refresh_tokens', 'totp_recoveries',
          'promotions', 'vouchers', 'voucher_usages', 'transactions', 'payments', 'refunds', 'webhook_events', 'idempotency_keys', 'game_types', 'games', 'game_accounts', 'account_photos',
          'themes', 'static_pages', 'static_page_versions', 'admin_audit_logs', 'audit_reveals', 'settings'
        )
    `
    expect(Number(tabel[0]?.amount ?? 0)).toBe(27)
  })
})
