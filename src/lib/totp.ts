// TOTP primitives — ref: docs/PLAN.md §7.9. otplib v13 exposes a functional API;
// replay protection is enforced by the caller via `afterTimeStep`.
//
// Recovery codes are formatted "xxxxx-xxxxx" (hex), stored only as SHA-256 hashes,
// and every character is normalised away before hashing.

import { createHash, randomBytes } from 'node:crypto'
import { generate, generateSecret, generateURI, verify } from 'otplib'

export const TOTP_ISSUER = 'NEXAPLAY'
export const TOTP_PERIOD_SECONDS = 30
export const TOTP_DIGITS = 6
export const RECOVERY_CODE_COUNT = 10

export function newTotpSecret(): string {
  return generateSecret()
}

export function totpUri(secret: string, label: string): string {
  return generateURI({ issuer: TOTP_ISSUER, label, secret })
}

export async function generateTotp(secret: string, epochSeconds?: number): Promise<string> {
  return generate({ secret, epoch: epochSeconds, period: TOTP_PERIOD_SECONDS })
}

export type TotpVerification =
  | { valid: true; timeStep: number }
  | { valid: false }

/**
 * Verify a 6-digit code. `afterTimeStep` rejects already-used steps (anti-replay),
 * `epochTolerance: 1` accepts one 30s window of clock drift in either direction.
 */
export async function verifyTotp(
  secret: string,
  token: string,
  options: { afterTimeStep?: number; epochSeconds?: number } = {},
): Promise<TotpVerification> {
  const result = await verify({
    secret,
    token,
    period: TOTP_PERIOD_SECONDS,
    epoch: options.epochSeconds,
    epochTolerance: 1,
    afterTimeStep: options.afterTimeStep,
  })
  if (!result.valid) return { valid: false }
  // Functional verify returns a HOTP|TOTP union; only TOTP carries a time step.
  if (!('timeStep' in result)) return { valid: false }
  return { valid: true, timeStep: result.timeStep }
}

export function newRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString('hex')
    return `${raw.slice(0, 5)}-${raw.slice(5)}`
  })
}

/** Accepts "ABCDE-12345", "abcde12345", or any spacing — returns the canonical hash. */
export function normalizeRecoveryCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(normalizeRecoveryCode(code)).digest('hex')
}
