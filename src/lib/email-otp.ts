// Email OTP primitives — codes are generated with the platform CSPRNG and stored
// only as a keyed hash. The HMAC key is the application JWT secret, domain-separated
// so an OTP hash cannot be confused with a JWT signature.

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

const OTP_DIGITS = 6
const OTP_MODULO = 10 ** OTP_DIGITS

export function generateOtpCode(): string {
  return randomInt(0, OTP_MODULO).toString().padStart(OTP_DIGITS, '0')
}

export function hashOtpCode(userId: bigint, code: string, secret: Uint8Array): string {
  return createHmac('sha256', Buffer.from(secret))
    .update(`email-otp:${userId}:${code}`)
    .digest('hex')
}

export function matchesOtpCode(
  userId: bigint,
  code: string,
  expectedHash: string,
  secret: Uint8Array,
): boolean {
  const actual = Buffer.from(hashOtpCode(userId, code, secret), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
