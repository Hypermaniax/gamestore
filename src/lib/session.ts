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
}

export async function createSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({
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

export function clearAllCookies(): Promise<void> {
  return Promise.all([clearSessionCookie(), clearRefreshCookie()]).then(() => undefined)
}

// TOTP second-step challenge token — 5 minutes, purpose-bound (kind claim), NOT a cookie.
// Client passes it as an argument to the loginTotp action; checks kt (token_version) on use.
export async function createChallengeToken(
  claims: SessionClaims,
  kind: ChallengeKind,
): Promise<string> {
  return new SignJWT({
    kind,
    uname: claims.username,
    rid: claims.roleId.toString(),
    rkode: claims.roleKode,
    tv: claims.tokenVersion,
  } satisfies JwtClaims & { kind: string })
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
    const verified = await jwtVerify<JwtClaims & { kind: string }>(token, loadJwtSecret())
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

/** Read & verify the session cookie — null when missing or invalid. */
export async function readSession(): Promise<SessionClaims | null> {
  const store = await cookies()
  const value = store.get(SESSION_COOKIE)?.value
  if (!value) return null
  try {
    const verified = await jwtVerify<JwtClaims>(value, loadJwtSecret())
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
