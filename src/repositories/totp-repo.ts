// TOTP persistence — user columns + one-time recovery codes.
// Atomic step consumption lives here so concurrent requests cannot replay a code.

import { prisma } from '../lib/prisma'
import type { Prisma } from '../../generated/client'

export type TotpSetup = {
  ciphertext: Uint8Array<ArrayBuffer>
  keyVersion: string
}

/** Store a pending (not yet active) secret; any previous pending secret is replaced. */
export function saveSetupSecret(userId: bigint, setup: TotpSetup): Promise<unknown> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      totpSecretEncrypted: setup.ciphertext,
      totpKeyVersion: setup.keyVersion,
      totpActive: false,
      totpLastStep: null,
    },
  })
}

/** Activate TOTP: store the secret, mark active, clear failures, revoke old codes. */
export function activate(
  userId: bigint,
  setup: TotpSetup,
  timeStep: number,
  recoveryHashes: string[],
  at: Date,
): Promise<unknown> {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        totpSecretEncrypted: setup.ciphertext,
        totpKeyVersion: setup.keyVersion,
        totpActive: true,
        totpLastStep: BigInt(timeStep),
        totpFailures: 0,
        totpLockedUntil: null,
      },
    }),
    prisma.totpRecovery.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    }),
    prisma.totpRecovery.createMany({
      data: recoveryHashes.map((hash) => ({ userId, hash })),
    }),
  ])
}

/**
 * Atomically claim a TOTP step. Returns false when another request already used
 * this step (or a later one) — the caller treats that as a replay.
 */
export async function consumeStep(userId: bigint, timeStep: number): Promise<boolean> {
  const claimed = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ totpLastStep: null }, { totpLastStep: { lt: BigInt(timeStep) } }],
    },
    data: {
      totpLastStep: BigInt(timeStep),
      totpFailures: 0,
      totpLockedUntil: null,
    },
  })
  return claimed.count === 1
}

/** Successful recovery-code login clears the failure counter without touching the step. */
export async function clearFailures(userId: bigint): Promise<unknown> {
  return prisma.user.update({
    where: { id: userId },
    data: { totpFailures: 0, totpLockedUntil: null },
  })
}

/** Increment the persisted failure counter; lock for `lockMs` once `max` is reached. */
export async function recordFailure(userId: bigint, max: number, lockMs: number, at: Date) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { totpFailures: true },
    })
    const failures = (user?.totpFailures ?? 0) + 1
    const lockUntil = failures >= max ? new Date(at.getTime() + lockMs) : null
    await tx.user.update({
      where: { id: userId },
      data: { totpFailures: failures, totpLockedUntil: lockUntil },
    })
    return { failures, lockedUntil: lockUntil }
  })
}

/** Atomic: revoke every active recovery code + create a fresh batch. */
export function replaceRecoveryCodes(userId: bigint, hashes: string[], at: Date): Promise<unknown> {
  return prisma.$transaction([
    prisma.totpRecovery.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    }),
    prisma.totpRecovery.createMany({ data: hashes.map((hash) => ({ userId, hash })) }),
  ])
}

export function findActiveRecovery(userId: bigint, hash: string) {
  return prisma.totpRecovery.findFirst({
    where: { userId, hash, usedAt: null, revokedAt: null },
  })
}

export function consumeRecovery(id: bigint, at: Date): Promise<unknown> {
  return prisma.totpRecovery.update({ where: { id }, data: { usedAt: at } })
}

/** Admin reset — wipe the secret, deactivate, clear counters, revoke recovery codes. */
export function resetTotp(userId: bigint, at: Date): Promise<unknown> {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        totpSecretEncrypted: null,
        totpKeyVersion: null,
        totpLastStep: null,
        totpActive: false,
        totpFailures: 0,
        totpLockedUntil: null,
      },
    }),
    prisma.totpRecovery.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    }),
  ])
}

/** CLI-only break-glass: wipe TOTP, revoke every session/recovery code atomically. */
export function resetDarurat(userId: bigint, at: Date): Promise<unknown> {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        totpSecretEncrypted: null,
        totpKeyVersion: null,
        totpLastStep: null,
        totpActive: false,
        totpFailures: 0,
        totpLockedUntil: null,
        tokenVersion: { increment: 1 },
      },
    }),
    prisma.totpRecovery.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    }),
    prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } }),
  ])
}

/** The cached user row is stale after writes inside this module; callers re-read. */
export type TotpUpdates = Prisma.UserUpdateManyMutationInput
