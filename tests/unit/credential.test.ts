import { describe, expect, it } from 'vitest'
import { EMPTY_CREDENTIALS, formatCredentials, isCredentialComplete } from '../../src/lib/credential'

describe('account credentials', () => {
  it('requires email/username and password', () => {
    expect(isCredentialComplete(EMPTY_CREDENTIALS)).toBe(false)
    expect(isCredentialComplete({ email: 'player@example.com', password: '', note: '' })).toBe(false)
    expect(isCredentialComplete({ email: 'player@example.com', password: 'rahasia', note: '' })).toBe(true)
  })

  it('formats credentials with an optional note', () => {
    expect(
      formatCredentials({
        email: ' player@example.com ',
        password: 'rahasia',
        note: 'Email pemulihan: lama@example.com',
      }),
    ).toBe(
      'Email/Username: player@example.com\nPassword: rahasia\nNote: Email pemulihan: lama@example.com',
    )
    expect(formatCredentials({ email: 'player@example.com', password: 'rahasia', note: '  ' })).toBe(
      'Email/Username: player@example.com\nPassword: rahasia',
    )
  })
})
