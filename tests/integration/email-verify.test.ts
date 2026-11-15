import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma, resetDb } from '../helpers/db'
import { authService } from '../../src/services/auth.service'
import { emailService } from '../../src/services/email.service'
import { resetRateLimits } from '../../src/lib/rate-limit'

const DAY = 86_400_000

beforeEach(async () => {
  await resetDb()
  resetRateLimits()
  vi.restoreAllMocks()
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function registerAndCapture() {
  await prisma.role.create({ data: { code: 'PEMBELI', name: 'Buyer' } })
  const sent: string[] = []
  vi.spyOn(emailService, 'sendEmail').mockImplementation(async (_to, _subject, body) => {
    sent.push(body)
  })

  const email = `otp-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`
  const result = await authService.register({
    username: `otp${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
    email,
    password: 'StrongPass1',
  })
  expect(result.ok).toBe(true)

  const code = sent[0]?.match(/verification code is (\d{6})/)?.[1]
  expect(code).toMatch(/^\d{6}$/)
  const user = await prisma.user.findFirstOrThrow({ where: { email } })
  return { email, code: code!, user }
}

describe('verifikasi email via OTP', () => {
  it('memverifikasi kode yang benar dan mengonsumsi OTP', async () => {
    const { email, code, user } = await registerAndCapture()

    await expect(authService.verifyEmail({ email, code })).resolves.toEqual({ ok: true })
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).toBe(true)
    expect(await prisma.emailOtp.count({ where: { userId: user.id, consumedAt: null } })).toBe(0)
  })

  it('menolak kode salah dan mengunci setelah lima percobaan', async () => {
    const { email, code, user } = await registerAndCapture()

    for (let i = 0; i < 5; i++) {
      const result = await authService.verifyEmail({ email, code: '000000' })
      expect(result.ok).toBe(false)
    }

    expect(await prisma.emailOtp.count({ where: { userId: user.id, consumedAt: null } })).toBe(0)
    await expect(authService.verifyEmail({ email, code })).resolves.toMatchObject({ ok: false })
  })

  it('menginvalidasi kode lama saat kirim ulang', async () => {
    const { email, code, user } = await registerAndCapture()

    await prisma.emailOtp.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { createdAt: new Date(Date.now() - 61_000) },
    })

    await expect(authService.resendVerification(email)).resolves.toEqual({ ok: true })
    await expect(authService.verifyEmail({ email, code })).resolves.toMatchObject({ ok: false })

    const active = await prisma.emailOtp.findFirstOrThrow({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    expect(active.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('menunda kirim ulang selama satu menit', async () => {
    const { email, code, user } = await registerAndCapture()

    const before = await prisma.emailOtp.findFirstOrThrow({
      where: { userId: user.id, consumedAt: null },
    })

    await expect(authService.resendVerification(email)).resolves.toEqual({ ok: true })

    const after = await prisma.emailOtp.findFirstOrThrow({
      where: { userId: user.id, consumedAt: null },
    })
    expect(after.id).toBe(before.id)
    expect(after.codeHash).toBe(before.codeHash)
    await expect(authService.verifyEmail({ email, code })).resolves.toEqual({ ok: true })
  })

  it('menolak kode kedaluwarsa', async () => {
    const { email, code, user } = await registerAndCapture()

    await prisma.emailOtp.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { expiresAt: new Date(Date.now() - DAY) },
    })

    await expect(authService.verifyEmail({ email, code })).resolves.toMatchObject({ ok: false })
  })
})
