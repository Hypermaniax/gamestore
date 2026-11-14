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

/** Rotation: mark parent as replaced (tolerance clock starts) and create child, atomically. */
export async function rotate(parentId: bigint, data: CreateRefresh): Promise<RefreshToken> {
  return prisma.$transaction(async (tx) => {
    const child = await tx.refreshToken.create({ data: pick(data) })
    await tx.refreshToken.update({
      where: { id: parentId },
      data: { replacedAt: new Date(), replacedByTokenId: child.id },
    })
    return child
  })
}

/** Tolerant reuse: re-point an already-replaced parent at a fresh sibling. */
export async function fork(parentId: bigint, data: CreateRefresh): Promise<RefreshToken> {
  // Same shape as rotate — the parent simply gets a new child.
  return rotate(parentId, data)
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
