import { describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/secret', () => ({
  loadJwtSecret: () => new TextEncoder().encode('test-secret-'.repeat(4)),
}))

import {
  createChallengeToken,
  createSessionToken,
  readChallengeToken,
  verifySessionToken,
} from '../../src/lib/session'

const claims = {
  userId: BigInt(1),
  username: 'dummy-admin',
  roleId: BigInt(1),
  roleKode: 'ADMIN',
  tokenVersion: 7,
}

describe('session token purpose', () => {
  it('rejects a TOTP challenge token as a session', async () => {
    const challenge = await createChallengeToken(claims, 'totp2')

    expect(await verifySessionToken(challenge)).toBeNull()
  })

  it('rejects a session token as a TOTP challenge', async () => {
    const session = await createSessionToken(claims)

    expect(await readChallengeToken(session, 'totp2')).toBeNull()
  })

  it('rejects a challenge token for a different challenge kind', async () => {
    const challenge = await createChallengeToken(claims, 'totp-setup')

    expect(await readChallengeToken(challenge, 'totp2')).toBeNull()
  })

  it('accepts a normal session token', async () => {
    const session = await createSessionToken(claims)

    expect(await verifySessionToken(session)).toEqual(claims)
  })
})
