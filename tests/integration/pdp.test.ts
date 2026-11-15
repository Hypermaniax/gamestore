import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '../helpers/db'
import { buatAkun, buatTransaksi, dasar } from '../helpers/fixtures'
import {
  anonimkanAuditReveal,
  hapusDataPribadi,
  KONFIRMASI_ANONIM_AUDIT,
  KONFIRMASI_HAPUS_USER,
} from '../../src/services/pdp.service'

const DAY = 86_400_000
let previousMigrationUrl: string | undefined

beforeAll(() => {
  previousMigrationUrl = process.env.MIGRATION_DATABASE_URL
  process.env.MIGRATION_DATABASE_URL = process.env.TEST_MIGRATION_DATABASE_URL
})

beforeEach(resetDb)
afterAll(async () => {
  if (previousMigrationUrl === undefined) delete process.env.MIGRATION_DATABASE_URL
  else process.env.MIGRATION_DATABASE_URL = previousMigrationUrl
  await prisma.$disconnect()
})

describe('prosedur PDP', () => {
  it('menganonimkan user tanpa menghapus transaksi', async () => {
    const { user, game } = await dasar()
    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'SOLD' })
    const trx = await buatTransaksi({ accountId: account.id, buyerId: user.id, status: 'PAID' })
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        hash: 'pdp-refresh',
        familyId: randomUUID(),
        expiresAt: new Date(Date.now() + DAY),
      },
    })
    await prisma.totpRecovery.create({ data: { userId: user.id, hash: 'pdp-recovery' } })
    await prisma.emailToken.create({
      data: {
        userId: user.id,
        type: 'GANTI_EMAIL_BARU',
        newEmail: 'rahasia@test.local',
        tokenHash: 'pdp-email',
        validUntil: new Date(Date.now() + DAY),
      },
    })
    await prisma.emailOtp.create({
      data: {
        userId: user.id,
        purpose: 'VERIFY_EMAIL',
        codeHash: 'pdp-otp',
        expiresAt: new Date(Date.now() + DAY),
      },
    })

    const result = await hapusDataPribadi({
      identitas: user.email,
      alasan: 'permintaan pemilik akun',
      konfirmasi: KONFIRMASI_HAPUS_USER,
    })
    expect(result.ok).toBe(true)

    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(fresh).toMatchObject({
      username: `dihapus-${user.id}`,
      email: `dihapus+${user.id}@invalid.local`,
      emailVerified: false,
      active: false,
      totpActive: false,
    })
    expect(fresh.passwordHash.startsWith('pdp-')).toBe(true)
    expect(await prisma.transaction.count({ where: { id: trx.id } })).toBe(1)
    expect(await prisma.refreshToken.count({ where: { userId: user.id, revoked: false } })).toBe(0)
    expect(await prisma.totpRecovery.count({ where: { userId: user.id, revokedAt: null } })).toBe(0)
    expect((await prisma.emailToken.findFirstOrThrow()).newEmail).toBeNull()
    expect(await prisma.emailOtp.count({ where: { userId: user.id } })).toBe(0)
    expect(await prisma.adminAuditLog.count({ where: { action: 'PDP_USER_DELETE' } })).toBe(1)
  })

  it('menganonimkan IP/UA audit lama dan mencatat eksekusi DDL', async () => {
    const { user, game } = await dasar()
    const account = await buatAkun({ gameId: game.id, adminId: user.id, status: 'SOLD' })
    const trx = await buatTransaksi({ accountId: account.id, buyerId: user.id, status: 'PAID' })
    const lama = await prisma.auditReveal.create({
      data: {
        transactionId: trx.id,
        buyerId: user.id,
        revealedAt: new Date(Date.now() - 800 * DAY),
        ip: '203.0.113.9',
        userAgent: 'browser-lama',
      },
    })
    const baru = await prisma.auditReveal.create({
      data: {
        transactionId: trx.id,
        buyerId: user.id,
        ip: '198.51.100.7',
        userAgent: 'browser-baru',
      },
    })

    const dry = await anonimkanAuditReveal({ konfirmasi: KONFIRMASI_ANONIM_AUDIT, dryRun: true })
    expect(dry).toMatchObject({ ok: true, data: { amount: 1, dryRun: 1 } })

    const result = await anonimkanAuditReveal({ konfirmasi: KONFIRMASI_ANONIM_AUDIT })
    expect(result).toMatchObject({ ok: true, data: { amount: 1, dryRun: 0 } })
    expect(await prisma.auditReveal.findUniqueOrThrow({ where: { id: lama.id } })).toMatchObject({
      ip: null,
      userAgent: null,
    })
    expect(await prisma.auditReveal.findUniqueOrThrow({ where: { id: baru.id } })).toMatchObject({
      ip: '198.51.100.7',
      userAgent: 'browser-baru',
    })
    const audit = await prisma.adminAuditLog.findFirstOrThrow({ where: { action: 'PDP_AUDIT_ANONYMIZE' } })
    expect(audit.actorId).toBeNull()
    expect(audit.target).toBe('audit_reveals')
  })
})
