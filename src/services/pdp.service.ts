// PDP manual procedures — ref: docs/PLAN.md §6 "Retensi data" + §14.
// User deletion is an app-user UPDATE (business rows stay); audit anonymisation
// must run as the migration/DDL user and is recorded with actor_id NULL.

import { randomBytes } from 'node:crypto'
import { realClock } from '../lib/clock'
import { auditService } from './audit.service'
import * as userRepo from '../repositories/user-repo'
import * as pdpRepo from '../repositories/pdp-repo'
import type { UnionError } from '../validation/parse'

export const KONFIRMASI_HAPUS_USER = 'HAPUS-DATA'
export const KONFIRMASI_ANONIM_AUDIT = 'ANONIMISASI-AUDIT'

export type PdpResult =
  | { ok: true; data: Record<string, string | number> }
  | UnionError

export async function hapusDataPribadi(input: {
  identitas: string
  alasan: string
  konfirmasi: string
}): Promise<PdpResult> {
  if (input.konfirmasi !== KONFIRMASI_HAPUS_USER)
    return { ok: false, code: 'CONFIRMATION_MISMATCH', message: 'PDP procedure confirmation does not match.' }
  const alasan = input.alasan.trim()
  if (!alasan) return { ok: false, code: 'REASON_REQUIRED', message: 'PDP request reason is required.' }

  const user = await userRepo.findByUsernameOrEmail(input.identitas)
  if (!user) return { ok: false, code: 'USER_NOT_FOUND', message: 'User not found.' }
  if (user.role.code === 'ADMIN' && user.active) {
    const admins = await userRepo.countActiveAdmins()
    if (admins <= 1)
      return { ok: false, code: 'LAST_ADMIN', message: 'The last active admin cannot be deleted.' }
  }

  const now = realClock.now()
  const anonUsername = `dihapus-${user.id}`.slice(0, 50)
  const anonEmail = `dihapus+${user.id}@invalid.local`

  await pdpRepo.hapusDataPribadi({
    userId: user.id,
    username: anonUsername,
    email: anonEmail,
    passwordHash: `pdp-${randomBytes(24).toString('hex')}`,
    at: now,
  })

  await auditService.log(null, 'PDP_USER_DELETE', `user:${user.id}`, {
    alasan: alasan.slice(0, 200),
  })
  return { ok: true, data: { userId: user.id.toString(), username: anonUsername } }
}

export async function anonimkanAuditReveal(input: {
  konfirmasi: string
  bulan?: number
  dryRun?: boolean
}): Promise<PdpResult> {
  if (input.konfirmasi !== KONFIRMASI_ANONIM_AUDIT)
    return { ok: false, code: 'CONFIRMATION_MISMATCH', message: 'PDP procedure confirmation does not match.' }
  const bulan = Math.max(1, Math.floor(input.bulan ?? Number(process.env.RETENSI_AUDIT_PII_BULAN ?? 24)))
  const cutoff = new Date(realClock.now().getTime() - bulan * 30 * 86_400_000)
  const url = process.env.MIGRATION_DATABASE_URL
  if (!url)
    return { ok: false, code: 'CONNECTION_NOT_READY', message: 'MIGRATION_DATABASE_URL is not set.' }

  const result = await pdpRepo.anonimkanAuditReveal({
    connectionString: url,
    cutoff,
    bulan,
    dryRun: input.dryRun === true,
  })
  return { ok: true, data: { amount: result.amount, dryRun: input.dryRun ? 1 : 0 } }
}
