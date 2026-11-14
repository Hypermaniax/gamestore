// Fail-fast secret loader — ref: docs/PLAN.md §13/§14.
// Secrets are read from files (chmod 600 in prod). Loaded once, then cached.
// Throws when the file is missing, the secret is too short, or a malformed keyring.

import { readFileSync } from 'node:fs'

let cachedJwtSecret: Uint8Array | null = null

export function loadJwtSecret(): Uint8Array {
  if (cachedJwtSecret) return cachedJwtSecret
  const path = process.env.JWT_SECRET_FILE
  if (!path) throw new Error('JWT_SECRET_FILE is not set — refusing to start')
  const contents = readFileSync(path, 'utf8').trim()
  if (contents.length === 0) throw new Error(`JWT secret file is empty: ${path}`)
  const bits = Buffer.byteLength(contents, 'utf8') * 8
  if (bits < 256) throw new Error(`JWT secret too short (${bits} bits) — minimum 256 bits`)
  cachedJwtSecret = new TextEncoder().encode(contents)
  return cachedJwtSecret
}

export type Keyring = Record<string, Uint8Array>

let cachedKeyring: Keyring | null = null

export function loadKeyring(): Keyring {
  if (cachedKeyring) return cachedKeyring
  const path = process.env.AES_KEYRING_FILE
  if (!path) throw new Error('AES_KEYRING_FILE is not set — refusing to start')
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`AES keyring file is not a JSON object { key_version: base64 }`)
  }
  const keyring: Keyring = {}
  for (const [version, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== 'string') throw new Error(`Keyring entry "${version}" is not a base64 string`)
    const key = Buffer.from(value, 'base64')
    if (key.length !== 32) throw new Error(`Keyring "${version}" is not 32-byte AES-256 (got ${key.length})`)
    keyring[version] = new Uint8Array(key)
  }
  if (Object.keys(keyring).length === 0) throw new Error('AES keyring is empty')
  cachedKeyring = keyring
  return cachedKeyring
}
