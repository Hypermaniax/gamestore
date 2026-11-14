import { randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDb } from '../helpers/db'
import { totpDarurat } from '../../src/services/totp-darurat.service'

let dir: string
let tokenFile: string
const TOKEN = 'token-darurat-uji-yang-panjang'

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'gamestore-totp-'))
  tokenFile = join(dir, 'emergency.token')
  await writeFile(tokenFile, `${TOKEN}\n`, { mode: 0o600 })
  process.env.TOTP_EMERGENCY_TOKEN_FILE = tokenFile
})

beforeEach(resetDb)

afterAll(async () => {
  delete process.env.TOTP_EMERGENCY_TOKEN_FILE
  await prisma.$disconnect()
  await rm(dir, { recursive: true, force: true })
})

async function adminDenganTotp() {
  const role = await prisma.role.create({ data: { code: 'ADMIN', name: 'Admin' } })
  const user = await prisma.user.create({
    data: {
      username: 'admin-darurat',
      email: 'admin-darurat@test.local',
      emailVerified: true,
      passwordHash: 'hash',
      roleId: role.id,
      totpActive: true,
      totpSecretEncrypted: Buffer.from('secret'),
      totpKeyVersion: 'v1',
      totpLastStep: BigInt(100),
    },
  })
  await prisma.totpRecovery.create({
    data: { userId: user.id, hash: 'recovery-hash' },
  })
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      hash: 'refresh-hash',
      familyId: randomUUID(),
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  })
  return user
}

describe('prosedur darurat TOTP', () => {
  it('menolak token yang salah tanpa mengubah data', async () => {
    const user = await adminDenganTotp()
    const result = await totpDarurat({ username: user.username, alasan: 'uji', token: 'salah' })

    expect(result).toMatchObject({ ok: false, code: 'EMERGENCY_TOKEN_INVALID' })
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).totpActive).toBe(true)
  })

  it('mereset TOTP, mencabut sesi/recovery, dan menulis audit tanpa aktor', async () => {
    const user = await adminDenganTotp()
    const result = await totpDarurat({ username: 'ADMIN-DARURAT', alasan: 'perangkat hilang', token: TOKEN })

    expect(result).toMatchObject({ ok: true, data: { username: user.username } })
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(fresh).toMatchObject({
      totpActive: false,
      totpSecretEncrypted: null,
      totpKeyVersion: null,
      totpLastStep: null,
      totpFailures: 0,
      totpLockedUntil: null,
      tokenVersion: 1,
    })
    expect(await prisma.refreshToken.count({ where: { userId: user.id, revoked: false } })).toBe(0)
    expect(await prisma.totpRecovery.count({ where: { userId: user.id, revokedAt: null } })).toBe(0)
    const audit = await prisma.adminAuditLog.findFirstOrThrow({ where: { action: 'TOTP_EMERGENCY' } })
    expect(audit.actorId).toBeNull()
    expect(audit.target).toBe(`user:${user.id}`)
  })
})
