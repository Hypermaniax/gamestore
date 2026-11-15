// Email OTP persistence — one active code per user/purpose. Verification is a
// conditional claim so concurrent submissions cannot both consume the same code.

import { prisma } from '../lib/prisma'
import type { EmailOtp } from '../../generated/client'

export const EMAIL_OTP_PURPOSE = 'VERIFY_EMAIL'

export function replaceActive(input: {
  userId: bigint
  purpose: string
  codeHash: string
  expiresAt: Date
  at: Date
}): Promise<EmailOtp> {
  return prisma.$transaction(async (tx) => {
    await tx.emailOtp.updateMany({
      where: { userId: input.userId, purpose: input.purpose, consumedAt: null },
      data: { consumedAt: input.at },
    })
    return tx.emailOtp.create({
      data: {
        userId: input.userId,
        purpose: input.purpose,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        createdAt: input.at,
      },
    })
  })
}

export function findLatestActive(
  userId: bigint,
  purpose: string,
  at: Date,
): Promise<EmailOtp | null> {
  return prisma.emailOtp.findFirst({
    where: {
      userId,
      purpose,
      consumedAt: null,
      expiresAt: { gt: at },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export function recordFailure(
  id: bigint,
  userId: bigint,
  purpose: string,
  maxAttempts: number,
  at: Date,
): Promise<{ locked: boolean }> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.emailOtp.updateMany({
      where: { id, userId, purpose, consumedAt: null },
      data: { attempts: { increment: 1 } },
    })
    if (updated.count !== 1) return { locked: true }

    const row = await tx.emailOtp.findUnique({ where: { id }, select: { attempts: true } })
    const locked = (row?.attempts ?? maxAttempts) >= maxAttempts
    if (locked) {
      await tx.emailOtp.update({ where: { id }, data: { consumedAt: at } })
    }
    return { locked }
  })
}

export function consumeVerification(
  id: bigint,
  userId: bigint,
  purpose: string,
  maxAttempts: number,
  at: Date,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.emailOtp.updateMany({
      where: {
        id,
        userId,
        purpose,
        consumedAt: null,
        expiresAt: { gt: at },
        attempts: { lt: maxAttempts },
      },
      data: { consumedAt: at },
    })
    if (claimed.count !== 1) return false

    await tx.user.update({ where: { id: userId }, data: { emailVerified: true } })
    return true
  })
}
