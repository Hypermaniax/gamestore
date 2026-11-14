import bcrypt from 'bcrypt'
import { TEST_EMAIL_DOMAIN, TEST_PASSWORD } from './config'
import type { SeedDb } from './types'

type EnsureBuyerInput = {
  username: string
  email: string
  roleId: bigint
  verified: boolean
  passwordHash: string
}

async function ensureBuyer(db: SeedDb, input: EnsureBuyerInput) {
  const existing = await db.user.findFirst({ where: { email: input.email } })
  const data = {
    username: input.username,
    emailVerified: input.verified,
    passwordHash: input.passwordHash,
    roleId: input.roleId,
    active: true,
    totpActive: false,
    totpSecretEncrypted: null,
    totpKeyVersion: null,
    totpLastStep: null,
    totpFailures: 0,
    totpLockedUntil: null,
  }
  if (existing) return db.user.update({ where: { id: existing.id }, data })

  return db.user.create({
    data: {
      ...data,
      email: input.email,
    },
  })
}

/** Use the real superadmin from SUPERADMIN_* (.env) — never create a parallel test admin. */
export async function seedAdmin(db: SeedDb) {
  const username = process.env.SUPERADMIN_USERNAME
  const email = process.env.SUPERADMIN_EMAIL

  let admin = email
    ? await db.user.findFirst({ where: { email }, include: { role: true } })
    : null
  if (!admin && username) {
    admin = await db.user.findFirst({ where: { username }, include: { role: true } })
  }
  if (!admin && username && email) {
    admin = await db.user.findFirst({ where: { username }, include: { role: true } })
  }
  if (!admin) {
    admin = await db.user.findFirst({
      where: { role: { code: 'ADMIN' } },
      include: { role: true },
      orderBy: { id: 'asc' },
    })
  }
  if (!admin) throw new Error('No ADMIN user found. Run the base seed with SUPERADMIN_* set first.')
  if (admin.role.code !== 'ADMIN') throw new Error(`Superadmin env user "${admin.username}" is not an ADMIN.`)
  console.log(`Using admin from env: ${admin.username} (${admin.email})`)
  return admin
}

export async function seedBuyers(db: SeedDb) {
  const roleBuyer = await db.role.findUnique({ where: { code: 'PEMBELI' } })
  if (!roleBuyer) throw new Error('Role PEMBELI missing. Run the base seed first: npx tsx prisma/seed.ts')

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10)
  const buyer1 = await ensureBuyer(db, {
    username: 'tester_buyer1',
    email: `buyer1${TEST_EMAIL_DOMAIN}`,
    roleId: roleBuyer.id,
    verified: true,
    passwordHash,
  })
  const buyer2 = await ensureBuyer(db, {
    username: 'tester_buyer2',
    email: `buyer2${TEST_EMAIL_DOMAIN}`,
    roleId: roleBuyer.id,
    verified: true,
    passwordHash,
  })
  await ensureBuyer(db, {
    username: 'tester_unverified',
    email: `unverified${TEST_EMAIL_DOMAIN}`,
    roleId: roleBuyer.id,
    verified: false,
    passwordHash,
  })

  return { buyer1, buyer2 }
}

/** Remove the old parallel test admin once fixtures point at the env superadmin. */
export async function removeLegacyTestAdmin(db: SeedDb, keepId: bigint): Promise<void> {
  const legacy = await db.user.findFirst({ where: { username: 'tester_admin', role: { code: 'ADMIN' } } })
  if (!legacy || legacy.id === keepId) return

  const [accounts, audits, refunds, pages] = await Promise.all([
    db.gameAccount.count({ where: { adminId: legacy.id } }),
    db.adminAuditLog.count({ where: { actorId: legacy.id } }),
    db.refund.count({ where: { adminId: legacy.id } }),
    db.staticPageVersion.count({ where: { publishedBy: legacy.id } }),
  ])
  if (accounts + audits + refunds + pages > 0) {
    console.log(`Legacy tester_admin kept: still referenced (accounts ${accounts}, audits ${audits})`)
    return
  }

  await db.refreshToken.deleteMany({ where: { userId: legacy.id } })
  await db.emailToken.deleteMany({ where: { userId: legacy.id } })
  await db.totpRecovery.deleteMany({ where: { userId: legacy.id } })
  await db.voucherUsage.deleteMany({ where: { userId: legacy.id } })
  await db.user.delete({ where: { id: legacy.id } })
  console.log('Removed legacy tester_admin (fixtures now use the env superadmin)')
}
