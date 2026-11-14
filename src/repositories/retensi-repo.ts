// Retention data access — ref: docs/PLAN.md §6 "Retensi data" + §7.8.
// Rows are never deleted when they are business records; only technical data is purged.

import { Prisma } from '../../generated/client'
import { prisma } from '../lib/prisma'

/** Null raw webhook payloads only after a successful process; GAGAL is retained. */
export function kosongkanWebhookPayload(cutoff: Date): Promise<Prisma.BatchPayload> {
  return prisma.webhookEvent.updateMany({
    where: { status: 'DIPROSES', processedAt: { lte: cutoff } },
    data: { rawPayload: Prisma.DbNull },
  })
}

/** Final response snapshots are no longer replayable after the retention window. */
export function kosongkanSnapshotIdempotency(cutoff: Date): Promise<Prisma.BatchPayload> {
  return prisma.idempotencyKey.updateMany({
    where: { status: 'KEDALUWARSA', validUntil: { lte: cutoff } },
    data: { responseSnapshot: Prisma.DbNull },
  })
}

/** Physical delete only when every member of a refresh family expired before the cutoff. */
export async function hapusRefreshKedaluwarsa(cutoff: Date): Promise<number> {
  return prisma.$executeRaw`
    WITH families AS (
      SELECT family_id
      FROM refresh_tokens
      GROUP BY family_id
      HAVING bool_and(expires_at <= ${cutoff})
    )
    DELETE FROM refresh_tokens r
    USING families f
    WHERE r.family_id = f.family_id
  `
}

/** Delete email tokens 30 days after both expiry and (when present) use. */
export function hapusEmailToken(cutoff: Date): Promise<Prisma.BatchPayload> {
  return prisma.emailToken.deleteMany({
    where: {
      validUntil: { lte: cutoff },
      OR: [{ usedAt: null }, { usedAt: { lte: cutoff } }],
    },
  })
}
