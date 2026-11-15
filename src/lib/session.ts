// Admin & buyer session — access JWT stored in an httpOnly cookie (PLAN v12: session cookie).
// The refresh token lives in a separate cookie; token_version verification happens in the
// auth layer (Fase 2).

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { loadJwtSecret } from './secret'

const SESSION_COOKIE = 'session'
const TTL_MINUTES = 30
const REFRESH_COOKIE = 'refresh'
const REFRESH_TTL_DAYS = 30
const TOTP_CHALLENGE_TTL_MINUTES = 5
const TOTP_SETUP_CHALLENGE_TTL_MINUTES = 15
const TOTP_SETUP_COOKIE = 'totp_setup'

export type ChallengeKind = 'totp2' | 'totp-setup'

export interface SessionClaims {
  userId: bigint
  username: string
  roleId: bigint
  roleKode: string
  tokenVersion: number
}

interface JwtClaims extends Record<string, unknown> {
  uname: string
  rid: string
  rkode: string
  tv: number
  typ?: 'session' | 'challenge'
  kind?: ChallengeKind
}

export async function createSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({
    typ: 'session',
    uname: claims.username,
    rid: claims.roleId.toString(),
    rkode: claims.roleKode,
    tv: claims.tokenVersion,
  } satisfies JwtClaims)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId.toString())
    .setIssuedAt()
    .setExpirationTime(`${TTL_MINUTES}m`)
    .sign(loadJwtSecret())
}

export async function writeSessionCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: TTL_MINUTES * 60,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function writeRefreshCookie(rawToken: string): Promise<void> {
  const store = await cookies()
  store.set(REFRESH_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60,
  })
}

export async function readRefreshCookie(): Promise<string | null> {
  const store = await cookies()
  return store.get(REFRESH_COOKIE)?.value ?? null
}

export async function clearRefreshCookie(): Promise<void> {
  const store = await cookies()
  store.delete(REFRESH_COOKIE)
}

/** Forced-TOTP setup challenge is HttpOnly and never sent through the URL. */
export async function writeTotpSetupCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(TOTP_SETUP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: TOTP_SETUP_CHALLENGE_TTL_MINUTES * 60,
  })
}

export async function readTotpSetupCookie(): Promise<string | null> {
  const store = await cookies()
  return store.get(TOTP_SETUP_COOKIE)?.value ?? null
}

export async function clearTotpSetupCookie(): Promise<void> {
  const store = await cookies()
  store.delete(TOTP_SETUP_COOKIE)
}

export function clearAllCookies(): Promise<void> {
  return Promise.all([clearSessionCookie(), clearRefreshCookie(), clearTotpSetupCookie()]).then(() => undefined)
}

// TOTP second-step challenge token — 5 minutes, purpose-bound (kind claim), NOT a cookie.
// Client passes it as an argument to the loginTotp action; checks kt (token_version) on use.
export async function createChallengeToken(
  claims: SessionClaims,
  kind: ChallengeKind,
): Promise<string> {
  return new SignJWT({
    typ: 'challenge',
    kind,
    uname: claims.username,
    rid: claims.roleId.toString(),
    rkode: claims.roleKode,
    tv: claims.tokenVersion,
  } satisfies JwtClaims)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId.toString())
    .setIssuedAt()
    .setExpirationTime(
      `${kind === 'totp-setup' ? TOTP_SETUP_CHALLENGE_TTL_MINUTES : TOTP_CHALLENGE_TTL_MINUTES}m`,
    )
    .sign(loadJwtSecret())
}

export async function readChallengeToken(
  token: string,
  kind: ChallengeKind,
): Promise<SessionClaims | null> {
  try {
    const verified = await jwtVerify<JwtClaims>(token, loadJwtSecret())
    if (verified.payload.typ !== undefined && verified.payload.typ !== 'challenge') return null
    if (verified.payload.kind !== kind) return null
    return {
      userId: BigInt(verified.payload.sub!),
      username: verified.payload.uname,
      roleId: BigInt(verified.payload.rid),
      roleKode: verified.payload.rkode,
      tokenVersion: verified.payload.tv,
    }
  } catch {
    return null
  }
}

/**
 * Verify a session JWT — null when invalid or when a challenge token is passed.
 * Kept separate from cookie access so token-purpose checks are directly testable.
 */
export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const verified = await jwtVerify<JwtClaims>(token, loadJwtSecret())
    if (verified.payload.kind !== undefined) return null
    if (verified.payload.typ !== undefined && verified.payload.typ !== 'session') return null
    return {
      userId: BigInt(verified.payload.sub!),
      username: verified.payload.uname,
      roleId: BigInt(verified.payload.rid),
      roleKode: verified.payload.rkode,
      tokenVersion: verified.payload.tv,
    }
  } catch {
    return null
  }
}

/** Read & verify the session cookie — null when missing or invalid. */
export async function readSession(): Promise<SessionClaims | null> {
  let value: string | undefined
  try {
    const store = await cookies()
    value = store.get(SESSION_COOKIE)?.value
  } catch {
    return null
  }
  if (!value) return null
  return verifySessionToken(value)
}
