// Idempotency keys — claim/finish must be visible to parallel requests, so the
// claim is its own short transaction (REQUIRES_NEW pattern in docs/PLAN §7.3).

import { prisma } from '../lib/prisma'
import type { Prisma } from '../../generated/client'

type RawRow = {
  status: string
  transactionId: bigint | null
  requestHash: string
  responseSnapshot: Prisma.JsonValue | null
  validUntil: Date
}

export type ClaimResult =
  | { status: 'CLAIMED' }
  | { status: 'REPLAY'; snapshot: Prisma.JsonValue | null }
  | { status: 'SEDANG_DIPROSES' }
  | { status: 'KONTRAS_ISI' }

/** Insert a PROCESSING row, replay a finished result, or take over an expired key. */
export function claim(
  userId: bigint,
  key: string,
  requestHash: string,
  now: Date,
  ttlMs: number,
): Promise<ClaimResult> {
  const expiresAt = new Date(now.getTime() + ttlMs)
  return prisma.$transaction(async (tx) => {
    const inserted = await tx.$queryRaw<{ key: string }[]>`
      INSERT INTO idempotency_keys (user_id, key, status, request_hash, valid_until)
      VALUES (${userId}, ${key}, 'PROCESSING', ${requestHash}, ${expiresAt})
      ON CONFLICT (user_id, key) DO NOTHING
      RETURNING key
    `
    if (inserted.length === 1) return { status: 'CLAIMED' as const }

    const rows = await tx.$queryRaw<RawRow[]>`
      SELECT status,
             transaction_id AS "transactionId",
             request_hash AS "requestHash",
             response_snapshot AS "responseSnapshot",
             valid_until AS "validUntil"
      FROM idempotency_keys
      WHERE user_id = ${userId} AND key = ${key}
      FOR UPDATE
    `
    const row = rows[0]
    if (!row) throw new Error('Idempotency claim vanished')

    if (row.requestHash !== requestHash) return { status: 'KONTRAS_ISI' as const }
    if (row.status === 'SELESAI') return { status: 'REPLAY' as const, snapshot: row.responseSnapshot }

    const expired = row.validUntil.getTime() <= now.getTime()
    if (row.status === 'PROCESSING' && !expired) return { status: 'SEDANG_DIPROSES' as const }
    if (row.status === 'PROCESSING' && row.transactionId !== null)
      return { status: 'SEDANG_DIPROSES' as const }

    const reclaimed = await tx.$queryRaw<{ key: string }[]>`
      UPDATE idempotency_keys
      SET status = 'PROCESSING',
          request_hash = ${requestHash},
          transaction_id = NULL,
          response_status = NULL,
          response_snapshot = NULL,
          valid_until = ${expiresAt},
          created_at = ${now}
      WHERE user_id = ${userId} AND key = ${key}
      RETURNING key
    `
    return reclaimed.length === 1 ? { status: 'CLAIMED' as const } : { status: 'SEDANG_DIPROSES' as const }
  })
}

export async function linkTransaction(userId: bigint, key: string, transactionId: bigint): Promise<void> {
  await prisma.idempotencyKey.update({
    where: { userId_key: { userId, key } },
    data: { transactionId },
  })
}

export async function finish(
  userId: bigint,
  key: string,
  snapshot: Prisma.InputJsonValue,
  status = 200,
  now = new Date(),
): Promise<void> {
  const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  await prisma.idempotencyKey.update({
    where: { userId_key: { userId, key } },
    data: {
      status: 'SELESAI',
      responseStatus: status,
      responseSnapshot: snapshot,
      validUntil,
    },
  })
}


/** Mark finished keys whose replay window ended as KEDALUWARSA (row is retained). */
export function expireSelesai(now: Date): Promise<Prisma.BatchPayload> {
  return prisma.idempotencyKey.updateMany({
    where: { status: 'SELESAI', validUntil: { lte: now } },
    data: { status: 'KEDALUWARSA' },
  })
}

/** Mark expired PROCESSING claims that never reached phase-1 as KEDALUWARSA. */
export function expireProcessing(now: Date): Promise<Prisma.BatchPayload> {
  return prisma.idempotencyKey.updateMany({
    where: {
      status: 'PROCESSING',
      transactionId: null,
      validUntil: { lte: now },
    },
    data: { status: 'KEDALUWARSA' },
  })
}
