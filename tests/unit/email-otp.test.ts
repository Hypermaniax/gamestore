import { describe, expect, it } from 'vitest'
import { generateOtpCode, hashOtpCode, matchesOtpCode } from '../../src/lib/email-otp'

const secret = new TextEncoder().encode('test-secret-'.repeat(4))

describe('email OTP', () => {
  it('generates six digits', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/)
    }
  })

  it('hashes deterministically per user and rejects another user', () => {
    const code = '123456'
    expect(hashOtpCode(BigInt(1), code, secret)).toBe(hashOtpCode(BigInt(1), code, secret))
    expect(hashOtpCode(BigInt(1), code, secret)).not.toBe(hashOtpCode(BigInt(2), code, secret))
    expect(hashOtpCode(BigInt(1), code, secret)).not.toBe(hashOtpCode(BigInt(1), '654321', secret))
  })

  it('matches only the exact code and hash', () => {
    const hash = hashOtpCode(BigInt(7), '000123', secret)
    expect(matchesOtpCode(BigInt(7), '000123', hash, secret)).toBe(true)
    expect(matchesOtpCode(BigInt(7), '000124', hash, secret)).toBe(false)
    expect(matchesOtpCode(BigInt(8), '000123', hash, secret)).toBe(false)
    expect(matchesOtpCode(BigInt(7), '000123', 'not-hex', secret)).toBe(false)
  })
})
