// PDP data-level operations. User anonymisation uses the app user (business rows
// stay); audit PII anonymisation requires the migration/DDL user.

import { Client } from 'pg'
import { prisma } from '../lib/prisma'

export function hapusDataPribadi(input: {
  userId: bigint
  username: string
  email: string
  passwordHash: string
  at: Date
}) {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: input.userId },
      data: {
        username: input.username,
        email: input.email,
        emailVerified: false,
        passwordHash: input.passwordHash,
        active: false,
        tokenVersion: { increment: 1 },
        totpSecretEncrypted: null,
        totpKeyVersion: null,
        totpLastStep: null,
        totpActive: false,
        totpFailures: 0,
        totpLockedUntil: null,
      },
    }),
    prisma.refreshToken.updateMany({ where: { userId: input.userId }, data: { revoked: true } }),
    prisma.totpRecovery.updateMany({
      where: { userId: input.userId, revokedAt: null },
      data: { revokedAt: input.at },
    }),
    prisma.emailToken.updateMany({ where: { userId: input.userId }, data: { newEmail: null } }),
    prisma.emailOtp.deleteMany({ where: { userId: input.userId } }),
  ])
}

export async function anonimkanAuditReveal(input: {
  connectionString: string
  cutoff: Date
  bulan: number
  dryRun: boolean
}): Promise<{ amount: number }> {
  const client = new Client({ connectionString: input.connectionString })
  await client.connect()
  try {
    const count = await client.query<{ amount: string }>(
      `SELECT count(*)::text AS amount
       FROM audit_reveals
       WHERE revealed_at < $1 AND (ip IS NOT NULL OR user_agent IS NOT NULL)`,
      [input.cutoff],
    )
    const amount = Number(count.rows[0]?.amount ?? 0)
    if (input.dryRun) return { amount }

    await client.query('BEGIN')
    const updated = await client.query(
      `UPDATE audit_reveals
       SET ip = NULL, user_agent = NULL
       WHERE revealed_at < $1 AND (ip IS NOT NULL OR user_agent IS NOT NULL)`,
      [input.cutoff],
    )
    await client.query(
      `INSERT INTO admin_audit_logs (actor_id, action, target, detail)
       VALUES (NULL, 'PDP_AUDIT_ANONYMIZE', 'audit_reveals', $1::jsonb)`,
      [JSON.stringify({ amount, bulan: input.bulan, cutoff: input.cutoff.toISOString() })],
    )
    await client.query('COMMIT')
    return { amount: updated.rowCount ?? amount }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw err
  } finally {
    await client.end()
  }
}
