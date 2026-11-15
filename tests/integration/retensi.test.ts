import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '../helpers/db'
import { dasar } from '../helpers/fixtures'
import { retensiJob } from '../../src/jobs/handlers'

const DAY = 86_400_000
const ago = (days: number) => new Date(Date.now() - days * DAY)
const later = (days: number) => new Date(Date.now() + days * DAY)

beforeEach(resetDb)
afterAll(async () => {
  await prisma.$disconnect()
})

describe('RetensiJob', () => {
  it('membersihkan data teknis lama tanpa menyentuh bukti bisnis', async () => {
    const { user } = await dasar()

    const diprosesLama = await prisma.webhookEvent.create({
      data: {
        type: 'QRIS',
        incomingFundId: 'lama-diproses',
        rawPayload: { rahasia: 'lama' },
        status: 'DIPROSES',
        processedAt: ago(100),
      },
    })
    const gagalLama = await prisma.webhookEvent.create({
      data: {
        type: 'QRIS',
        incomingFundId: 'lama-gagal',
        rawPayload: { rahasia: 'gagal' },
        status: 'GAGAL',
        processedAt: ago(100),
      },
    })
    await prisma.webhookEvent.create({
      data: {
        type: 'QRIS',
        incomingFundId: 'baru-diproses',
        rawPayload: { rahasia: 'baru' },
        status: 'DIPROSES',
        processedAt: ago(10),
      },
    })

    const snapshotLama = {
      userId: user.id,
      key: 'lama',
      status: 'KEDALUWARSA',
      requestHash: 'a'.repeat(64),
      responseSnapshot: { ok: true },
      validUntil: ago(40),
    }
    const snapshotBaru = {
      ...snapshotLama,
      key: 'baru',
      responseSnapshot: { ok: true },
      validUntil: ago(10),
    }
    await prisma.idempotencyKey.createMany({ data: [snapshotLama, snapshotBaru] })

    const familyLama = randomUUID()
    const familyAktif = randomUUID()
    await prisma.refreshToken.createMany({
      data: [
        { userId: user.id, hash: 'r1', familyId: familyLama, expiresAt: ago(40) },
        { userId: user.id, hash: 'r2', familyId: familyLama, expiresAt: ago(39) },
        { userId: user.id, hash: 'r3', familyId: familyAktif, expiresAt: later(10) },
      ],
    })

    await prisma.emailToken.createMany({
      data: [
        { userId: user.id, type: 'VERIFIKASI', tokenHash: 'e1', validUntil: ago(40) },
        { userId: user.id, type: 'RESET', tokenHash: 'e2', validUntil: later(10) },
        {
          userId: user.id,
          type: 'RESET',
          tokenHash: 'e3',
          validUntil: ago(40),
          usedAt: new Date(),
        },
      ],
    })

    await prisma.emailOtp.createMany({
      data: [
        { userId: user.id, purpose: 'VERIFY_EMAIL', codeHash: 'o1', expiresAt: ago(40) },
        {
          userId: user.id,
          purpose: 'VERIFY_EMAIL',
          codeHash: 'o2',
          expiresAt: ago(40),
          consumedAt: ago(35),
        },
        { userId: user.id, purpose: 'VERIFY_EMAIL', codeHash: 'o3', expiresAt: later(10) },
      ],
    })

    const result = await retensiJob()
    expect(result.ok).toBe(true)

    expect(await prisma.webhookEvent.findUniqueOrThrow({ where: { id: diprosesLama.id } })).toMatchObject({
      status: 'DIPROSES',
      rawPayload: null,
    })
    expect(await prisma.webhookEvent.findUniqueOrThrow({ where: { id: gagalLama.id } })).toMatchObject({
      status: 'GAGAL',
      rawPayload: { rahasia: 'gagal' },
    })
    expect(
      (await prisma.idempotencyKey.findUniqueOrThrow({
        where: { userId_key: { userId: user.id, key: 'lama' } },
      })).responseSnapshot,
    ).toBeNull()
    expect(
      (await prisma.idempotencyKey.findUniqueOrThrow({
        where: { userId_key: { userId: user.id, key: 'baru' } },
      })).responseSnapshot,
    ).toEqual({ ok: true })
    expect(await prisma.refreshToken.count({ where: { familyId: familyLama } })).toBe(0)
    expect(await prisma.refreshToken.count({ where: { familyId: familyAktif } })).toBe(1)
    expect(await prisma.emailToken.count()).toBe(2)
    expect(await prisma.emailOtp.count()).toBe(1)
  })
})
