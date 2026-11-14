// Rate limiting — ref: docs/API.md §0 "Rate limit" (bucket per IP & identity).
// In-memory by design for the single-process MVP; every bucket answers with the
// same typed-union error so callers never learn which limit tripped.

import { RateLimiterMemory, type RateLimiterRes } from 'rate-limiter-flexible'
import { headers } from 'next/headers'
import type { UnionError } from '../validation/parse'

type Bucket = {
  points: number
  durationSeconds: number
  perIp: boolean
}

export const RATE_LIMITS = {
  login: { points: 10, durationSeconds: 300, perIp: true },
  loginIdentity: { points: 5, durationSeconds: 300, perIp: false },
  register: { points: 5, durationSeconds: 3600, perIp: true },
  email: { points: 5, durationSeconds: 900, perIp: false },
  emailIp: { points: 20, durationSeconds: 3600, perIp: true },
  token: { points: 20, durationSeconds: 3600, perIp: true },
  refresh: { points: 60, durationSeconds: 3600, perIp: true },
  totp: { points: 10, durationSeconds: 900, perIp: false },
  reveal: { points: 30, durationSeconds: 900, perIp: true },
  checkout: { points: 20, durationSeconds: 3600, perIp: false },
  changeMethod: { points: 20, durationSeconds: 3600, perIp: false },
  totpIp: { points: 30, durationSeconds: 900, perIp: true },
  admin: { points: 60, durationSeconds: 3600, perIp: false },
} satisfies Record<string, Bucket>

export type BucketName = keyof typeof RATE_LIMITS

const store = globalThis as unknown as { __rateLimiters?: Map<string, RateLimiterMemory> }
const limiters = (store.__rateLimiters ??= new Map<string, RateLimiterMemory>())

function limiterFor(name: BucketName): RateLimiterMemory {
  const existing = limiters.get(name)
  if (existing) return existing
  const config = RATE_LIMITS[name]
  const limiter = new RateLimiterMemory({
    points: config.points,
    duration: config.durationSeconds,
    keyPrefix: name,
  })
  limiters.set(name, limiter)
  return limiter
}

/** Best-effort client IP — Server Actions run in a request context, smoke scripts do not. */
export async function clientIp(): Promise<string> {
  try {
    const h = await headers()
    const forwarded = h.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
    return h.get('x-real-ip') ?? 'unknown'
  } catch {
    return 'local'
  }
}

function terlaluSering(retryAfterSeconds: number): UnionError {
  return {
    ok: false,
    code: 'TOO_MANY_REQUESTS',
    message: `Too many attempts. Try again in ${retryAfterSeconds} seconds.`,
  }
}

async function consume(name: BucketName, key: string): Promise<UnionError | null> {
  try {
    await limiterFor(name).consume(`${name}:${key}`)
    return null
  } catch (rejection) {
    const ms = (rejection as RateLimiterRes | undefined)?.msBeforeNext ?? 60_000
    return terlaluSering(Math.max(1, Math.ceil(ms / 1000)))
  }
}

/**
 * Apply one or more buckets. Identifiers are hashed-free prefixes chosen by the
 * service (`id:<identity>`); the IP bucket is added automatically when configured.
 */
export async function guardRateLimit(
  bucket: BucketName,
  identifiers: string[] = [],
): Promise<UnionError | null> {
  const config = RATE_LIMITS[bucket]
  const keys = [...identifiers]
  if (config.perIp) keys.push(`ip:${await clientIp()}`)
  for (const key of keys) {
    const rejected = await consume(bucket, key)
    if (rejected) return rejected
  }
  return null
}

/** Test helper — clears every in-memory counter. */
export function resetRateLimits(): void {
  limiters.clear()
}
