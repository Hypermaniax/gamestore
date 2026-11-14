// AES-256-GCM envelope helpers — ref: docs/PLAN.md §6/§13.
// Ciphertext layout: [iv(12) | authTag(16) | data]. The key identifier is stored
// next to the ciphertext (keyring rotation), and the AAD binds it to its owner.

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto'
import { loadKeyring } from './secret'

const IV_BYTES = 12
const TAG_BYTES = 16

export type EncryptedValue = {
  ciphertext: Uint8Array<ArrayBuffer>
  keyVersion: string
}

/** Active encryption key — explicit env wins, otherwise the first entry in the keyring. */
export function currentKeyVersion(): string {
  const keyring = loadKeyring()
  const preferred = process.env.AES_KEY_VERSION
  if (preferred && keyring[preferred]) return preferred
  const first = Object.keys(keyring)[0]
  if (!first) throw new Error('AES keyring is empty')
  return first
}

export function encrypt(plaintext: Uint8Array, aad: string): EncryptedValue {
  const keyVersion = currentKeyVersion()
  const key = loadKeyring()[keyVersion]
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(aad, 'utf8'))
  const data = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  const ciphertext = new Uint8Array(iv.length + tag.length + data.length)
  ciphertext.set(iv, 0)
  ciphertext.set(tag, iv.length)
  ciphertext.set(data, iv.length + tag.length)
  return { ciphertext, keyVersion }
}

export function decrypt(
  ciphertext: Uint8Array<ArrayBufferLike>,
  keyVersion: string,
  aad: string,
): Uint8Array<ArrayBuffer> {
  const key = loadKeyring()[keyVersion]
  if (!key) throw new Error(`Unknown AES key version "${keyVersion}"`)
  if (ciphertext.length < IV_BYTES + TAG_BYTES + 1) throw new Error('Ciphertext is too short')
  const buf = Buffer.from(ciphertext)
  const iv = buf.subarray(0, IV_BYTES)
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const data = buf.subarray(IV_BYTES + TAG_BYTES)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAAD(Buffer.from(aad, 'utf8'))
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(data), decipher.final()])
  const out = new Uint8Array(plain.length)
  out.set(plain)
  return out
}

export function encryptString(plaintext: string, aad: string): EncryptedValue {
  return encrypt(new TextEncoder().encode(plaintext), aad)
}

export function decryptString(
  ciphertext: Uint8Array<ArrayBufferLike>,
  keyVersion: string,
  aad: string,
): string {
  return new TextDecoder().decode(decrypt(ciphertext, keyVersion, aad))
}

/** Constant-time comparison for token-style secrets. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
