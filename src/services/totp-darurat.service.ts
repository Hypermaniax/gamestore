// Break-glass TOTP reset for the last admin — ref: docs/PLAN.md §11/§14.
// CLI-only: never exposed through a controller/Server Action.

import { readFileSync } from 'node:fs'
import { safeEqual } from '../lib/crypto'
import { realClock } from '../lib/clock'
import { auditService } from './audit.service'
import { emailService } from './email.service'
import * as totpRepo from '../repositories/totp-repo'
import * as userRepo from '../repositories/user-repo'
import type { UnionError } from '../validation/parse'

export type DaruratResult =
  | { ok: true; data: { username: string; userId: string } }
  | UnionError

class DaruratError extends Error {}

function bacaToken(path: string | undefined): string {
  if (!path) throw new DaruratError('TOTP_EMERGENCY_TOKEN_FILE is not set.')
  const token = readFileSync(path, 'utf8').trim()
  if (!token) throw new DaruratError('Emergency token file is empty.')
  return token
}

export async function totpDarurat(input: {
  username: string
  alasan: string
  token: string
}): Promise<DaruratResult> {
  const alasan = input.alasan.trim()
  if (!alasan) {
    return { ok: false, code: 'REASON_REQUIRED', message: 'Emergency procedure reason is required.' }
  }

  let expected: string
  try {
    expected = bacaToken(process.env.TOTP_EMERGENCY_TOKEN_FILE)
  } catch (err) {
    return {
      ok: false,
      code: 'EMERGENCY_TOKEN_NOT_READY',
      message: err instanceof DaruratError ? err.message : 'Emergency token cannot be read.',
    }
  }
  if (!safeEqual(input.token, expected)) {
    return { ok: false, code: 'EMERGENCY_TOKEN_INVALID', message: 'Emergency token does not match.' }
  }

  const user = await userRepo.findByUsername(input.username)
  if (!user || user.role.code !== 'ADMIN') {
    return { ok: false, code: 'ADMIN_NOT_FOUND', message: 'ADMIN user not found.' }
  }

  const now = realClock.now()
  await totpRepo.resetDarurat(user.id, now)
  await auditService.log(null, 'TOTP_EMERGENCY', `user:${user.id}`, {
    username: user.username,
    alasan: alasan.slice(0, 200),
  })
  await emailService.sendAdminAlert(
    'Emergency TOTP reset',
    `TOTP for admin ${user.username} was reset via CLI at ${now.toISOString()}. All sessions were revoked; the password must be changed and TOTP set up again.`,
  )

  return { ok: true, data: { username: user.username, userId: user.id.toString() } }
}
