// refresh_tokens data access — chain semantics live here: rotate() is the atomic
// "create child + point parent at child" pair; theft detection stays in the service.

import { prisma } from '../lib/prisma'
import type { Prisma, RefreshToken } from '../../generated/client'

export type CreateRefresh = {
  userId: bigint
  hash: string
  familyId: string
  device?: string | null
  expiresAt: Date
}

const pick = (c: CreateRefresh) => ({
  userId: c.userId,
  hash: c.hash,
  familyId: c.familyId,
  device: c.device ?? null,
  expiresAt: c.expiresAt,
})

/** New session: create the first token of a family. */
export function create(data: CreateRefresh): Promise<RefreshToken> {
  return prisma.refreshToken.create({ data: pick(data) })
}

/**
 * Rotation: mark parent as replaced (tolerance clock starts) and create child, atomically.
 * `COALESCE` keeps the original `replacedAt` when a parent is replayed inside the
 * tolerance window, so replays can never push the theft-detection deadline forward.
 */
export async function rotate(parentId: bigint, data: CreateRefresh): Promise<RefreshToken> {
  return prisma.$transaction(async (tx) => {
    const child = await tx.refreshToken.create({ data: pick(data) })
    await tx.$executeRaw`
      UPDATE refresh_tokens
      SET replaced_by_token_id = ${child.id},
          replaced_at = COALESCE(replaced_at, NOW())
      WHERE id = ${parentId}
    `
    return child
  })
}

export function findByHash(hash: string): Promise<RefreshToken | null> {
  return prisma.refreshToken.findUnique({ where: { hash } })
}

export function revokeByFamily(familyId: string): Promise<Prisma.BatchPayload> {
  return prisma.refreshToken.updateMany({ where: { familyId }, data: { revoked: true } })
}

export function revokeByHash(hash: string): Promise<Prisma.BatchPayload> {
  return prisma.refreshToken.updateMany({ where: { hash }, data: { revoked: true } })
}
