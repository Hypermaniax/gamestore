import { describe, expect, it } from 'vitest'

import { safeNextPath } from '../../src/lib/safe-next'

describe('safeNextPath', () => {
  it('accepts normal internal paths', () => {
    expect(safeNextPath('/account')).toBe('/account')
    expect(safeNextPath('/orders/abc?x=1')).toBe('/orders/abc?x=1')
  })

  it('takes the first value from repeated params', () => {
    expect(safeNextPath(['/orders', '/account'])).toBe('/orders')
  })

  it('rejects protocol-relative and absolute URLs', () => {
    expect(safeNextPath('//evil.com')).toBeNull()
    expect(safeNextPath('https://evil.com')).toBeNull()
  })

  it('rejects backslash tricks', () => {
    expect(safeNextPath('/\\evil.com')).toBeNull()
    expect(safeNextPath('\\evil.com')).toBeNull()
  })

  it('rejects control characters', () => {
    expect(safeNextPath('/\t/evil.com')).toBeNull()
    expect(safeNextPath('/\n')).toBeNull()
    expect(safeNextPath('/a\u007fb')).toBeNull()
  })

  it('rejects empty values', () => {
    expect(safeNextPath(null)).toBeNull()
    expect(safeNextPath(undefined)).toBeNull()
    expect(safeNextPath('')).toBeNull()
    expect(safeNextPath([])).toBeNull()
  })
})
