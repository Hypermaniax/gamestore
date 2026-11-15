// email_tokens data access — verification/reset/change-email token rows.

import { prisma } from '../lib/prisma'
import type { EmailToken, Prisma } from '../../generated/client'

export type CreateEmailToken = {
  userId: bigint
  type: string
  tokenHash: string
  validUntil: Date
  newEmail?: string
}

export function create(data: CreateEmailToken): Promise<EmailToken> {
  return prisma.emailToken.create({ data })
}

export function findByHash(tokenHash: string): Promise<EmailToken | null> {
  return prisma.emailToken.findUnique({ where: { tokenHash } })
}

/**
 * Reset password is a single logical write: spend the token, replace the hash,
 * bump token_version (kills every access token), revoke all refresh tokens and
 * invalidate every other pending RESET token.
 */
export function consumePasswordReset(
  userId: bigint,
  passwordHash: string,
  at: Date,
): Promise<unknown> {
  return prisma.$transaction([
    prisma.emailToken.updateMany({
      where: { userId, type: 'RESET', usedAt: null },
      data: { usedAt: at },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } }),
  ])
}

/**
 * Two-token email change: both rows are spent in the same transaction that moves
 * users.email, kills all previous sessions and invalidates pending RESET tokens
 * (old address is notified by the service).
 */
export function consumeEmailChange(
  tokenIds: bigint[],
  userId: bigint,
  email: string,
  at: Date,
): Promise<unknown> {
  return prisma.$transaction([
    prisma.emailToken.updateMany({ where: { id: { in: tokenIds } }, data: { usedAt: at } }),
    prisma.emailToken.updateMany({
      where: { userId, type: 'RESET', usedAt: null },
      data: { usedAt: at },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { email, emailVerified: true, tokenVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } }),
  ])
}

/** Invalidate all pending tokens of one type for a user (resend/regenerate). */
export function markPendingUsed(userId: bigint, type: string, at: Date): Promise<Prisma.BatchPayload> {
  return prisma.emailToken.updateMany({
    where: { userId, type: type, usedAt: null },
    data: { usedAt: at },
  })
}
