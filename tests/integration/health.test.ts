import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '../helpers/db'
import { healthService } from '../../src/services/health.service'
import { runJob } from '../../src/jobs/run'

const DAY = 86_400_000

beforeEach(resetDb)
afterAll(async () => {
  await prisma.$disconnect()
})

describe('health & heartbeat', () => {
  it('sehat tanpa heartbeat dan mendeteksi heartbeat basi', async () => {
    expect(await healthService.status()).toEqual({ ok: true })

    await prisma.setting.create({
      data: {
        key: 'job_heartbeat:expiry-job',
        value: 'OK',
        updatedAt: new Date(Date.now() - DAY),
      },
    })
    expect(await healthService.status()).toEqual({ ok: false })

    await prisma.setting.update({
      where: { key: 'job_heartbeat:expiry-job' },
      data: { updatedAt: new Date(), value: 'OK' },
    })
    expect(await healthService.status()).toEqual({ ok: true })
  })

  it('runJob mencatat heartbeat sukses dan gagal', async () => {
    const ok = await runJob('uji-sukses', async () => ({ ok: true, processed: 3 }))
    expect(ok).toEqual({ ok: true, processed: 3 })
    expect(
      (await prisma.setting.findUniqueOrThrow({ where: { key: 'job_heartbeat:uji-sukses' } })).value,
    ).toBe('OK')

    const gagal = await runJob('uji-gagal', async () => {
      throw new Error('sengaja')
    })
    expect(gagal).toBeNull()
    expect(
      (await prisma.setting.findUniqueOrThrow({ where: { key: 'job_heartbeat:uji-gagal' } })).value,
    ).toBe('GAGAL')
    expect(await prisma.adminAuditLog.count({ where: { action: 'ALERT_JOB_uji-gagal' } })).toBe(1)
  })
})
