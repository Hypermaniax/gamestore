// Client IP resolution — X-Forwarded-For is only trusted when the deployment
// explicitly declares how many trusted proxies sit in front of the app
// (TRUST_PROXY_HOPS). With hops=0 the headers are ignored so a direct client can
// never spoof rate-limit buckets or reveal-audit evidence.

import { isIP } from 'node:net'

const MAX_HOPS = 10

export type ClientIpSource = {
  forwardedFor: string | null
  realIp: string | null
}

function pickForwarded(forwarded: string | null, trustedHops: number): string | null {
  if (!forwarded) return null
  const entries = forwarded
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (entries.length < trustedHops) return null
  // The nearest trusted proxy appends the real client chain; with `trustedHops`
  // trusted proxies the client is that many entries from the right.
  const candidate = entries[entries.length - trustedHops]
  return isIP(candidate) === 0 ? null : candidate
}

function pickRealIp(realIp: string | null): string | null {
  if (!realIp || isIP(realIp.trim()) === 0) return null
  return realIp.trim()
}

/** Pure resolver so the trust rules can be unit-tested without a Next request. */
export function resolveClientIp(source: ClientIpSource, trustedHops: number): string {
  if (!Number.isInteger(trustedHops) || trustedHops < 0 || trustedHops > MAX_HOPS)
    return 'unknown'
  if (trustedHops === 0) return 'unknown'
  return pickForwarded(source.forwardedFor, trustedHops) ?? pickRealIp(source.realIp) ?? 'unknown'
}

export function trustedProxyHops(): number {
  const raw = process.env.TRUST_PROXY_HOPS
  if (raw === undefined || raw === '') return 0
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_HOPS) return 0
  return parsed
}
