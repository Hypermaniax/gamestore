import { describe, expect, it } from 'vitest'

import { resolveClientIp, trustedProxyHops } from '../../src/lib/client-ip'

describe('resolveClientIp', () => {
  it('ignores all headers when hops is 0', () => {
    expect(resolveClientIp({ forwardedFor: '1.2.3.4', realIp: '5.6.7.8' }, 0)).toBe('unknown')
  })

  it('takes the client from the left when there is one trusted proxy', () => {
    expect(resolveClientIp({ forwardedFor: '203.0.113.7', realIp: null }, 1)).toBe('203.0.113.7')
  })

  it('does not trust a spoofed leftmost value behind one proxy', () => {
    expect(
      resolveClientIp({ forwardedFor: '9.9.9.9, 203.0.113.7', realIp: '203.0.113.7' }, 1),
    ).toBe('203.0.113.7')
  })

  it('resolves two trusted proxies by counting from the right', () => {
    expect(
      resolveClientIp({ forwardedFor: '198.51.100.1, 203.0.113.7', realIp: null }, 2),
    ).toBe('198.51.100.1')
  })

  it('falls back to a valid X-Real-IP', () => {
    expect(resolveClientIp({ forwardedFor: null, realIp: '198.51.100.1' }, 1)).toBe('198.51.100.1')
  })

  it('rejects non-IP header values', () => {
    expect(resolveClientIp({ forwardedFor: 'not-an-ip', realIp: 'also-bogus' }, 1)).toBe('unknown')
  })

  it('supports IPv6', () => {
    expect(resolveClientIp({ forwardedFor: '2001:db8::1', realIp: null }, 1)).toBe('2001:db8::1')
  })

  it('rejects chains shorter than the configured hops', () => {
    expect(resolveClientIp({ forwardedFor: '203.0.113.7', realIp: null }, 2)).toBe('unknown')
  })

  it('rejects out-of-range hop counts', () => {
    expect(resolveClientIp({ forwardedFor: '203.0.113.7', realIp: null }, 11)).toBe('unknown')
    expect(resolveClientIp({ forwardedFor: '203.0.113.7', realIp: null }, -1)).toBe('unknown')
    expect(resolveClientIp({ forwardedFor: '203.0.113.7', realIp: null }, 1.5)).toBe('unknown')
  })
})

describe('trustedProxyHops', () => {
  const original = process.env.TRUST_PROXY_HOPS

  function withEnv(value: string | undefined, run: () => void) {
    if (value === undefined) delete process.env.TRUST_PROXY_HOPS
    else process.env.TRUST_PROXY_HOPS = value
    try {
      run()
    } finally {
      if (original === undefined) delete process.env.TRUST_PROXY_HOPS
      else process.env.TRUST_PROXY_HOPS = original
    }
  }

  it('defaults to 0 when unset or empty', () => {
    withEnv(undefined, () => expect(trustedProxyHops()).toBe(0))
    withEnv('', () => expect(trustedProxyHops()).toBe(0))
  })

  it('parses a valid integer', () => {
    withEnv('2', () => expect(trustedProxyHops()).toBe(2))
  })

  it('fails closed on garbage input', () => {
    withEnv('evil', () => expect(trustedProxyHops()).toBe(0))
    withEnv('11', () => expect(trustedProxyHops()).toBe(0))
    withEnv('-1', () => expect(trustedProxyHops()).toBe(0))
  })
})
