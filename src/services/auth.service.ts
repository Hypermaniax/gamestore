// Auth domain service — ref: docs/PLAN.md §7.1, §11 + docs/API.md §1.
// This layer holds ALL business rules (validation, generic anti-enumeration errors,
// refresh-chain theft detection) and touches the DB only through repositories.
// Cookies are read/written via src/lib/session.

import { randomBytes, randomUUID, createHash } from 'node:crypto'
import bcrypt from 'bcrypt'
import { realClock } from '../lib/clock'
import {
  createSessionToken,
  createChallengeToken,
  writeSessionCookie,
  readSession,
  readChallengeToken,
  writeRefreshCookie,
  readRefreshCookie,
  clearAllCookies,
  type SessionClaims,
} from '../lib/session'
import * as userRepo from '../repositories/user-repo'
import * as refreshTokenRepo from '../repositories/refresh-token-repo'
import * as emailTokenRepo from '../repositories/email-token-repo'
import * as totpRepo from '../repositories/totp-repo'
import { findRoleByCode } from '../repositories/rbac-repo'
import { decryptString, encryptString } from '../lib/crypto'
import { guardRateLimit } from '../lib/rate-limit'
import { hashRecoveryCode, newRecoveryCodes, newTotpSecret, totpUri, verifyTotp } from '../lib/totp'
import type { UserWithRole } from '../repositories/user-repo'
import type { User } from '../../generated/client'
import { emailService } from './email.service'
import {
  changePasswordSchema,
  confirmEmailChangeSchema,
  loginSchema,
  registerSchema,
  requestEmailChangeSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  totpActivateSchema,
  totpLoginSchema,
  totpRecoveryRegenerateSchema,
  totpSetupSchema,
  verificationTokenSchema,
  type ChangePasswordInput,
  type ConfirmEmailChangeInput,
  type LoginInput,
  type RegisterInput,
  type RequestEmailChangeInput,
  type RequestPasswordResetInput,
  type ResetPasswordInput,
  type TotpActivateInput,
  type TotpLoginInput,
  type TotpRecoveryRegenerateInput,
  type TotpSetupInput,
} from '../validation/auth'
import { emailSchema } from '../validation/common'
import { parseInput, type UnionError } from '../validation/parse'

export const BCRYPT_ROUNDS = 12
export const REFRESH_TOLERANCE_MS = 30_000

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000
const EMAIL_CHANGE_TTL_MS = 24 * 60 * 60 * 1000
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const MAX_TOTP_FAILURES = 5
const TOTP_LOCK_MS = 15 * 60 * 1000

const fail = (code: string, payload: { message: string }): UnionError => ({ ok: false, code, message: payload.message })

export const AUTH_ERRORS = {
  emailInUse: { code: 'EMAIL_ALREADY_USED', message: 'Email or username is already registered.' },
  invalidCredentials: { code: 'CREDENTIALS_INVALID', message: 'The email/username and password combination does not match.' },
  session: { code: 'INVALID_SESSION', message: 'Your session is no longer valid. Please log in again.' },
} as const

export type Result<T = Record<string, unknown>> = { ok: true } & T

export type UserProfile = {
  username: string
  email: string
  emailVerified: boolean
  totpActive: boolean
  roleKode: string
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex')
const randomToken = (): string => randomBytes(32).toString('hex')

const toSession = (user: UserWithRole): SessionClaims => ({
  userId: user.id,
  username: user.username,
  roleId: user.role.id,
  roleKode: user.role.code,
  tokenVersion: user.tokenVersion,
})

/** Flag read per call so tests can toggle it without re-importing the module. */
function isTotpRequired(): boolean {
  return process.env.TOTP_WAJIB_ADMIN === 'true'
}

function totpAad(userId: bigint): string {
  return `totp:${userId}`
}

/** Decrypt the stored TOTP secret; null when absent or the key version is unknown. */
function readSecret(user: UserWithRole): string | null {
  if (!user.totpSecretEncrypted || !user.totpKeyVersion) return null
  try {
    return decryptString(user.totpSecretEncrypted, user.totpKeyVersion, totpAad(user.id))
  } catch {
    return null
  }
}

/**
 * TOTP setup can run from a normal session (voluntary) or from a `totp-setup`
 * challenge token (forced onboarding, no session yet).
 */
async function resolveTotpActor(challengeToken?: string): Promise<UserWithRole | UnionError> {
  if (challengeToken) {
    const claims = await readChallengeToken(challengeToken, 'totp-setup')
    if (!claims) return fail('TOKEN_INVALID', { message: 'TOTP setup token has expired.' })
    const user = await userRepo.findByIdWithRole(claims.userId)
    if (!user || !user.active || user.tokenVersion !== claims.tokenVersion || user.role.code !== 'ADMIN')
      return fail('TOKEN_INVALID', { message: 'TOTP setup token is invalid.' })
    return user
  }
  const session = await authService.verifySession()
  if (!session) return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)
  const user = await userRepo.findByIdWithRole(session.userId)
  if (!user || !user.active) return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)
  return user
}

function isUnionError(value: UserWithRole | UnionError): value is UnionError {
  return 'code' in value
}

/** Internal: mint a verification token row and email the link. */
async function sendVerification(user: User): Promise<void> {
  const token = randomToken()
  await emailTokenRepo.create({
    userId: user.id,
    type: 'VERIFIKASI',
    tokenHash: sha256(token),
    validUntil: new Date(realClock.now().getTime() + VERIFY_TOKEN_TTL_MS),
  })
  await emailService.sendEmail(
    user.email,
    'Store email verification',
    `Verify your email: ${emailService.verificationLink(token)}\nThe link is valid for 24 hours.`,
  )
}

export const authService = {
  /* -------------------------------------------------------------- register */

  async register(input: RegisterInput): Promise<Result | UnionError> {
    const parsed = parseInput(registerSchema, input)
    if (!parsed.ok) return parsed
    const { username, email, password } = parsed.data

    const limited = await guardRateLimit('register', [`id:${email}`])
    if (limited) return limited

    const role = await findRoleByCode('PEMBELI')
    if (!role) throw new Error('Seed missing: role PEMBELI')

    let user: User
    try {
      user = await userRepo.create({
        username,
        email,
        passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
        roleId: role.id,
      })
    } catch (err) {
      // Unique violation on users.username / lower(email) (partial index) — data constraint.
      const isP2002 = 'code' in (err as object) && (err as { code?: string }).code === 'P2002'
      if (isP2002) return fail('EMAIL_ALREADY_USED', AUTH_ERRORS.emailInUse)
      throw err
    }
    await sendVerification(user)
    return { ok: true }
  },

  /* ------------------------------------------------- email verification */

  async verifyEmail(token: string): Promise<Result | UnionError> {
    const parsed = parseInput(verificationTokenSchema, token)
    if (!parsed.ok) return fail('TOKEN_INVALID', { message: 'The verification link is invalid.' })

    const limited = await guardRateLimit('token')
    if (limited) return limited

    const row = await emailTokenRepo.findByHash(sha256(parsed.data))
    if (!row || row.usedAt || row.type !== 'VERIFIKASI')
      return fail('TOKEN_INVALID', { message: 'The verification link is invalid.' })

    const now = realClock.now()
    if (row.validUntil < now)
      return fail('TOKEN_EXPIRED', { message: 'The verification link has expired. Request a new one.' })

    await emailTokenRepo.consumeVerification(row.id, row.userId, now)
    return { ok: true }
  },

  async resendVerification(email: string): Promise<Result | UnionError> {
    const parsed = parseInput(emailSchema, email)
    if (!parsed.ok) return parsed

    const limited =
      (await guardRateLimit('email', [`id:${parsed.data}`])) ?? (await guardRateLimit('emailIp'))
    if (limited) return limited

    const user = await userRepo.findByEmail(parsed.data)

    if (user && user.active && !user.emailVerified) {
      await emailTokenRepo.markPendingUsed(user.id, 'VERIFIKASI', realClock.now())
      await sendVerification(user)
    }

    // Same answer regardless — do not reveal which emails exist.
    return { ok: true }
  },

  /* ---------------------------------------------------- password reset */

  /** Always answers the same, whether or not the address exists (anti-enumeration). */
  async requestPasswordReset(input: RequestPasswordResetInput): Promise<Result | UnionError> {
    const parsed = parseInput(requestPasswordResetSchema, input)
    // Shape errors must not reveal anything either — answer exactly like a valid request.
    if (!parsed.ok) return { ok: true }

    const limited =
      (await guardRateLimit('email', [`id:${parsed.data.email}`])) ?? (await guardRateLimit('emailIp'))
    if (limited) return limited

    const user = await userRepo.findByEmail(parsed.data.email)
    if (user && user.active) {
      const now = realClock.now()
      await emailTokenRepo.markPendingUsed(user.id, 'RESET', now)
      const token = randomToken()
      await emailTokenRepo.create({
        userId: user.id,
        type: 'RESET',
        tokenHash: sha256(token),
        validUntil: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
      })
      await emailService.sendEmail(
        user.email,
        'Reset your NEXAPLAY password',
        `Reset your password: ${emailService.passwordResetLink(token)}\nThe link is valid for 1 hour. Ignore this email if it was not you.`,
      )
    }
    return { ok: true }
  },

  async resetPassword(input: ResetPasswordInput): Promise<Result | UnionError> {
    const parsed = parseInput(resetPasswordSchema, input)
    if (!parsed.ok) return parsed
    const { token, password } = parsed.data

    const limited = await guardRateLimit('token')
    if (limited) return limited

    const row = await emailTokenRepo.findByHash(sha256(token))
    if (!row || row.type !== 'RESET' || row.usedAt)
      return fail('TOKEN_INVALID', { message: 'The reset link is invalid.' })

    const now = realClock.now()
    if (row.validUntil < now)
      return fail('TOKEN_EXPIRED', { message: 'The reset link has expired. Request a new link.' })

    const user = await userRepo.findById(row.userId)
    if (!user || !user.active) return fail('TOKEN_INVALID', { message: 'The reset link is invalid.' })

    await emailTokenRepo.consumePasswordReset(
      row.id,
      user.id,
      await bcrypt.hash(password, BCRYPT_ROUNDS),
      now,
    )
    await clearAllCookies()
    return { ok: true }
  },

  /* ------------------------------------------------- change password */

  async changePassword(input: ChangePasswordInput): Promise<Result | UnionError> {
    const session = await authService.verifySession()
    if (!session) return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)

    const parsed = parseInput(changePasswordSchema, input)
    if (!parsed.ok) return parsed
    const { passwordLama: oldPassword, passwordBaru: newPassword } = parsed.data

    const user = await userRepo.findByIdWithRole(session.userId)
    if (!user || !user.active) return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)
    const matches = await bcrypt.compare(oldPassword, user.passwordHash)
    if (!matches) return fail('PASSWORD_INVALID', { message: 'The current password does not match.' })

    await userRepo.updatePasswordAndRevokeAll(
      user.id,
      await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
    )

    // token_version changed → re-issue the session so this device stays logged in.
    const fresh = await userRepo.findByIdWithRole(user.id)
    if (fresh) await authService.issueSession(fresh)
    return { ok: true }
  },

  /* ---------------------------------------------------- change email */

  async requestEmailChange(input: RequestEmailChangeInput): Promise<Result | UnionError> {
    const session = await authService.verifySession()
    if (!session) return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)

    const parsed = parseInput(requestEmailChangeSchema, input)
    if (!parsed.ok) return parsed
    const { newEmail: newEmail, password } = parsed.data

    const user = await userRepo.findByIdWithRole(session.userId)
    if (!user || !user.active) return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)
    const matches = await bcrypt.compare(password, user.passwordHash)
    if (!matches) return fail('PASSWORD_INVALID', { message: 'The current password does not match.' })

    if (newEmail === user.email.toLowerCase())
      return fail('EMAIL_SAME', { message: 'The new email is the same as the current email.' })

    const now = realClock.now()
    await emailTokenRepo.markPendingUsed(user.id, 'GANTI_EMAIL_LAMA', now)
    await emailTokenRepo.markPendingUsed(user.id, 'GANTI_EMAIL_BARU', now)

    const existing = await userRepo.findByEmail(newEmail)
    if (existing) {
      // Do not reveal that the address is taken; notify the current owner only.
      await emailService.sendEmail(
        user.email,
        'Email change request',
        'The destination email cannot be used. Your account email has not changed.',
      )
      return { ok: true }
    }

    const oldToken = randomToken()
    const newToken = randomToken()
    const expiresAt = new Date(now.getTime() + EMAIL_CHANGE_TTL_MS)

    await emailTokenRepo.create({
      userId: user.id,
      type: 'GANTI_EMAIL_LAMA',
      tokenHash: sha256(oldToken),
      validUntil: expiresAt,
      newEmail: newEmail,
    })
    await emailTokenRepo.create({
      userId: user.id,
      type: 'GANTI_EMAIL_BARU',
      tokenHash: sha256(newToken),
      validUntil: expiresAt,
      newEmail: newEmail,
    })

    await emailService.sendEmail(
      user.email,
      'Confirm email change (old email)',
      `Open from the old email: ${emailService.emailChangeLink(oldToken)}\nThe second link was sent to ${newEmail}; both must be opened.`,
    )
    await emailService.sendEmail(
      newEmail,
      'Confirm email change (new email)',
      `Open from the new email: ${emailService.emailChangeLink(newToken)}\nThe second link was sent to the old email; both must be opened.`,
    )
    return { ok: true }
  },

  async confirmEmailChange(input: ConfirmEmailChangeInput): Promise<Result | UnionError> {
    const parsed = parseInput(confirmEmailChangeSchema, input)
    if (!parsed.ok) return parsed
    const { tokenLama: oldToken, tokenBaru: newToken } = parsed.data

    const invalid = (): UnionError =>
      fail('TOKEN_INVALID', { message: 'The confirmation link is invalid.' })
    const [a, b] = await Promise.all([
      emailTokenRepo.findByHash(sha256(oldToken)),
      emailTokenRepo.findByHash(sha256(newToken)),
    ])
    if (!a || !b) return invalid()

    // Accept the two links in any order — the token kind tells us which mailbox it came from.
    const oldRow = a.type === 'GANTI_EMAIL_LAMA' ? a : b.type === 'GANTI_EMAIL_LAMA' ? b : null
    const newRow = a.type === 'GANTI_EMAIL_BARU' ? a : b.type === 'GANTI_EMAIL_BARU' ? b : null
    if (!oldRow || !newRow || oldRow === newRow) return invalid()
    if (oldRow.usedAt || newRow.usedAt) return invalid()

    const now = realClock.now()
    if (oldRow.validUntil < now || newRow.validUntil < now)
      return fail('TOKEN_EXPIRED', { message: 'The confirmation link has expired. Repeat the request.' })
    if (oldRow.userId !== newRow.userId) return invalid()
    if (!oldRow.newEmail || oldRow.newEmail !== newRow.newEmail) return invalid()

    const user = await userRepo.findByIdWithRole(oldRow.userId)
    if (!user || !user.active) return invalid()

    const newEmail = oldRow.newEmail.toLowerCase()
    const existing = await userRepo.findByEmail(newEmail)
    if (existing && existing.id !== user.id) return fail(AUTH_ERRORS.emailInUse.code, AUTH_ERRORS.emailInUse)

    await emailTokenRepo.consumeEmailChange([oldRow.id, newRow.id], user.id, newEmail, now)
    await emailService.sendEmail(
      user.email,
      'NEXAPLAY account email changed',
      `Your account email is now ${newEmail}. All old sessions have been signed out. If this was not you, contact support immediately.`,
    )
    await clearAllCookies()
    return { ok: true }
  },

  /* --------------------------------------------------------------- login */

  async login(
    input: LoginInput,
  ): Promise<
    | Result<{ jalur: 'langsung'; peran: string; username: string; emailVerified: boolean }>
    | Result<{ jalur: 'perlu-totp'; token: string }>
    | Result<{ jalur: 'perlu-setup-totp'; token: string }>
    | UnionError
  > {
    const parsed = parseInput(loginSchema, input)
    if (!parsed.ok) return parsed
    const { usernameOrEmail, password, device: device } = parsed.data

    const limited =
      (await guardRateLimit('login')) ??
      (await guardRateLimit('loginIdentity', [`id:${usernameOrEmail}`]))
    if (limited) return limited

    const user = await userRepo.findByUsernameOrEmail(usernameOrEmail)
    const matches = user && user.active && (await bcrypt.compare(password, user.passwordHash))
    if (!user || !matches) return fail(AUTH_ERRORS.invalidCredentials.code, AUTH_ERRORS.invalidCredentials)

    if (user.totpActive) {
      const token = await createChallengeToken(toSession(user as UserWithRole), 'totp2')
      return { ok: true, jalur: 'perlu-totp', token }
    }
    if (user.role.code === 'ADMIN' && isTotpRequired()) {
      const token = await createChallengeToken(toSession(user as UserWithRole), 'totp-setup')
      return { ok: true, jalur: 'perlu-setup-totp', token }
    }
    await authService.issueSession(user as UserWithRole, device)
    return {
      ok: true,
      jalur: 'langsung',
      peran: user.role.code,
      username: user.username,
      emailVerified: user.emailVerified,
    }
  },

  /* ----------------------------------------------------------- login TOTP */

  async loginTotp(
    input: TotpLoginInput,
  ): Promise<
    Result<{ jalur: 'langsung'; peran: string; username: string; emailVerified: boolean }>
    | UnionError
  > {
    const parsed = parseInput(totpLoginSchema, input)
    if (!parsed.ok) return parsed
    const { challengeToken, code: code, device: device } = parsed.data

    const claims = await readChallengeToken(challengeToken, 'totp2')
    if (!claims) return fail('TOKEN_INVALID', { message: 'TOTP verification has expired. Log in again.' })

    const user = await userRepo.findByIdWithRole(claims.userId)
    if (!user || !user.active || user.tokenVersion !== claims.tokenVersion)
      return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)
    if (!user.totpActive)
      return fail('TOTP_NOT_ACTIVE', { message: 'TOTP is not active for this account.' })

    const limited =
      (await guardRateLimit('totp', [`user:${user.id}`])) ?? (await guardRateLimit('totpIp'))
    if (limited) return limited

    const now = realClock.now()
    if (user.totpLockedUntil && user.totpLockedUntil > now) {
      const seconds = Math.ceil((user.totpLockedUntil.getTime() - now.getTime()) / 1000)
      return fail('TOTP_LOCKED', { message: `Too many incorrect codes. Try again in ${seconds} seconds.` })
    }

    const secret = readSecret(user)
    if (!secret) return fail('TOTP_CORRUPTED', { message: 'The TOTP secret cannot be decrypted. Ask an admin to reset it.' })

    const isSixDigitCode = /^\d{6}$/.test(code)
    if (isSixDigitCode) {
      const result = await verifyTotp(secret, code, {
        afterTimeStep: user.totpLastStep === null ? undefined : Number(user.totpLastStep),
        epochSeconds: Math.floor(now.getTime() / 1000),
      })
      if (result.valid) {
        const claimed = await totpRepo.consumeStep(user.id, result.timeStep)
        if (!claimed)
          return fail('TOTP_CODE_REUSED', { message: 'This code has already been used. Wait for the next code.' })
        await authService.issueSession(user, device)
        return {
          ok: true,
          jalur: 'langsung',
          peran: user.role.code,
          username: user.username,
          emailVerified: user.emailVerified,
        }
      }
    } else {
      const recovery = await totpRepo.findActiveRecovery(user.id, hashRecoveryCode(code))
      if (recovery) {
        await totpRepo.consumeRecovery(recovery.id, now)
        await totpRepo.clearFailures(user.id)
        await authService.issueSession(user, device)
        return {
          ok: true,
          jalur: 'langsung',
          peran: user.role.code,
          username: user.username,
          emailVerified: user.emailVerified,
        }
      }
    }

    const failure = await totpRepo.recordFailure(user.id, MAX_TOTP_FAILURES, TOTP_LOCK_MS, now)
    if (failure.lockedUntil) {
      const seconds = Math.ceil((failure.lockedUntil.getTime() - now.getTime()) / 1000)
      return fail('TOTP_LOCKED', { message: `Too many incorrect codes. Try again in ${seconds} seconds.` })
    }
    return fail('TOTP_INVALID', { message: 'Incorrect TOTP code or recovery code.' })
  },

  /* ---------------------------------------------------------- TOTP setup */

  async setupTotp(
    input: TotpSetupInput,
  ): Promise<Result<{ secret: string; otpauthUri: string }> | UnionError> {
    const parsed = parseInput(totpSetupSchema, input)
    if (!parsed.ok) return parsed

    const limited = await guardRateLimit('totpIp')
    if (limited) return limited

    const actor = await resolveTotpActor(parsed.data.challengeToken)
    if (isUnionError(actor)) return actor
    if (actor.totpActive)
      return fail('TOTP_ALREADY_ACTIVE', { message: 'TOTP is already active. Reset it first to create a new secret.' })

    const secret = newTotpSecret()
    const encrypted = encryptString(secret, totpAad(actor.id))
    await totpRepo.saveSetupSecret(actor.id, encrypted)
    return { ok: true, secret, otpauthUri: totpUri(secret, actor.email) }
  },

  async activateTotp(
    input: TotpActivateInput,
  ): Promise<Result<{ recoveryCodes: string[] }> | UnionError> {
    const parsed = parseInput(totpActivateSchema, input)
    if (!parsed.ok) return parsed

    const limited =
      (await guardRateLimit('totpIp')) ?? (await guardRateLimit('totp'))
    if (limited) return limited

    const actor = await resolveTotpActor(parsed.data.challengeToken)
    if (isUnionError(actor)) return actor
    if (!actor.totpSecretEncrypted || !actor.totpKeyVersion)
      return fail('TOTP_NOT_SETUP', { message: 'Request a TOTP secret first.' })

    const secret = readSecret(actor)
    if (!secret) return fail('TOTP_CORRUPTED', { message: 'The TOTP secret cannot be decrypted.' })

    const now = realClock.now()
    const result = await verifyTotp(secret, parsed.data.code, {
      epochSeconds: Math.floor(now.getTime() / 1000),
    })
    if (!result.valid) return fail('TOTP_INVALID', { message: 'Incorrect TOTP code.' })

    const recoveryCodes = newRecoveryCodes()
    await totpRepo.activate(
      actor.id,
      { ciphertext: actor.totpSecretEncrypted, keyVersion: actor.totpKeyVersion },
      result.timeStep,
      recoveryCodes.map(hashRecoveryCode),
      now,
    )

    // Forced onboarding (challenge path) completes the login.
    if (parsed.data.challengeToken) await authService.issueSession(actor)
    return { ok: true, recoveryCodes }
  },

  async regenerateRecoveryCodes(
    input: TotpRecoveryRegenerateInput,
  ): Promise<Result<{ recoveryCodes: string[] }> | UnionError> {
    const session = await authService.verifySession()
    if (!session) return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)

    const parsed = parseInput(totpRecoveryRegenerateSchema, input)
    if (!parsed.ok) return parsed

    const user = await userRepo.findByIdWithRole(session.userId)
    if (!user || !user.active) return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)
    if (!user.totpActive) return fail('TOTP_NOT_ACTIVE', { message: 'TOTP is not active for this account.' })

    const limited =
      (await guardRateLimit('totp', [`user:${user.id}`])) ?? (await guardRateLimit('totpIp'))
    if (limited) return limited

    if (!(await bcrypt.compare(parsed.data.password, user.passwordHash)))
      return fail('PASSWORD_INVALID', { message: 'The current password does not match.' })

    const now = realClock.now()
    if (user.totpLockedUntil && user.totpLockedUntil > now)
      return fail('TOTP_LOCKED', { message: 'TOTP is temporarily locked. Try again later.' })

    const secret = readSecret(user)
    if (!secret) return fail('TOTP_CORRUPTED', { message: 'The TOTP secret cannot be decrypted.' })

    const result = await verifyTotp(secret, parsed.data.code, {
      afterTimeStep: user.totpLastStep === null ? undefined : Number(user.totpLastStep),
      epochSeconds: Math.floor(now.getTime() / 1000),
    })
    if (!result.valid) return fail('TOTP_INVALID', { message: 'Incorrect TOTP code.' })

    const claimed = await totpRepo.consumeStep(user.id, result.timeStep)
    if (!claimed)
      return fail('TOTP_CODE_REUSED', { message: 'This code has already been used. Wait for the next code.' })

    const recoveryCodes = newRecoveryCodes()
    await totpRepo.replaceRecoveryCodes(user.id, recoveryCodes.map(hashRecoveryCode), now)
    return { ok: true, recoveryCodes }
  },

  async issueSession(user: UserWithRole, device?: string): Promise<void> {
    const now = realClock.now()
    const raw = randomBytes(48).toString('base64url')
    await refreshTokenRepo.create({
      userId: user.id,
      hash: sha256(raw),
      familyId: randomUUID(),
      device: device?.slice(0, 150),
      expiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
    })
    await writeSessionCookie(await createSessionToken(toSession(user)))
    await writeRefreshCookie(raw)
  },

  /* -------------------------------------------------------------- refresh */

  async refresh(): Promise<Result | UnionError> {
    const limited = await guardRateLimit('refresh')
    if (limited) return limited

    const raw = await readRefreshCookie()
    if (!raw) return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)
    const row = await refreshTokenRepo.findByHash(sha256(raw))
    const now = realClock.now()

    const revokeFamily = async () => {
      if (row) await refreshTokenRepo.revokeByFamily(row.familyId)
      await clearAllCookies()
    }

    if (!row || row.revoked || row.expiresAt < now) {
      await revokeFamily()
      return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)
    }
    if (row.replacedAt && now.getTime() - row.replacedAt.getTime() > REFRESH_TOLERANCE_MS) {
      // Reuse beyond the tolerance window = token theft signature; kill the whole family.
      await revokeFamily()
      return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)
    }

    const user = await userRepo.findByIdWithRole(row.userId)
    const session = user ? toSession(user) : null
    if (!user || !user.active || !session || user.tokenVersion !== session.tokenVersion) {
      await revokeFamily()
      return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)
    }

    const newRaw = randomBytes(48).toString('base64url')
    const child = await refreshTokenRepo.rotate(row.id, {
      userId: row.userId,
      hash: sha256(newRaw),
      familyId: row.familyId,
      device: row.device,
      expiresAt: row.expiresAt,
    })
    void child
    await writeRefreshCookie(newRaw)
    await writeSessionCookie(await createSessionToken(session))
    return { ok: true }
  },

  /* --------------------------------------------------------------- logout */

  async logout(): Promise<void> {
    const raw = await readRefreshCookie()
    if (raw) await refreshTokenRepo.revokeByHash(sha256(raw))
    await clearAllCookies()
  },

  async logoutAll(): Promise<Result | UnionError> {
    const session = await authService.verifySession()
    if (!session) return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)
    await userRepo.revokeAllSessions(session.userId)
    await clearAllCookies()
    return { ok: true }
  },

  /* -------------------------------------------------------------- session */

  /** Safe profile for the account page — never exposes hashes or TOTP secrets. */
  async profile(): Promise<Result<UserProfile> | UnionError> {
    const session = await authService.verifySession()
    if (!session) return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)

    const user = await userRepo.findByIdWithRole(session.userId)
    if (!user || !user.active) return fail(AUTH_ERRORS.session.code, AUTH_ERRORS.session)

    return {
      ok: true,
      username: user.username,
      email: user.email,
      emailVerified: user.emailVerified,
      totpActive: user.totpActive,
      roleKode: user.role.code,
    }
  },

  /** Verify access session against the DB: aktif + token_version + role consistency. */
  async verifySession(): Promise<SessionClaims | null> {
    const session = await readSession()
    if (!session) return null
    const user = await userRepo.findByIdWithRole(session.userId)
    if (!user || !user.active) return null
    if (user.tokenVersion !== session.tokenVersion) return null
    if (user.roleId !== session.roleId || user.role.code !== session.roleKode) return null
    return session
  },
}
