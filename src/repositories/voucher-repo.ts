// vouchers + voucher_usages data access. Quota consumption is a single atomic UPDATE;
// usage rows are never deleted (DIPULIHKAN flips status and releases the quota).

import { prisma } from '../lib/prisma'
import type { Prisma, PrismaClient } from '../../generated/client'

export type Db = PrismaClient | Prisma.TransactionClient

export type VoucherData = {
  code: string
  type: string
  value: string
  quota: number
  minPurchase: string | null
  maxDiscount: string | null
  validUntil: Date
  active: boolean
}

export function create(data: VoucherData) {
  return prisma.voucher.create({ data })
}

export function update(id: bigint, data: Partial<VoucherData>) {
  return prisma.voucher.update({ where: { id }, data })
}

export function findById(id: bigint) {
  return prisma.voucher.findUnique({ where: { id } })
}

export function findByCode(code: string, db: Db = prisma) {
  return db.voucher.findUnique({ where: { code: code } })
}

export function findUsage(voucherId: bigint, userId: bigint, db: Db = prisma) {
  return db.voucherUsage.findUnique({
    where: { voucherId_userId: { voucherId, userId } },
  })
}

export type VoucherAdminFilter = { q?: string; active?: boolean }

function adminWhere(filter: VoucherAdminFilter): Prisma.VoucherWhereInput {
  return {
    ...(filter.q ? { code: { contains: filter.q, mode: 'insensitive' } } : {}),
    ...(filter.active !== undefined ? { active: filter.active } : {}),
  }
}

export function listAdmin(filter: VoucherAdminFilter & { skip: number; take: number }) {
  return prisma.voucher.findMany({
    where: adminWhere(filter),
    orderBy: { id: 'desc' },
    skip: filter.skip,
    take: filter.take,
    include: { _count: { select: { usages: { where: { status: 'TERPAKAI' } } } } },
  })
}

export function countAdmin(filter: VoucherAdminFilter) {
  return prisma.voucher.count({ where: adminWhere(filter) })
}

export type ConsumeResult = 'OK' | 'HABIS' | 'SUDAH_DIPAKAI'

/** Atomic: quota increment + per-user claim. Caller supplies the transaction. */
export async function consumeInTx(
  db: Db,
  voucherId: bigint,
  userId: bigint,
  transactionId: bigint | null,
): Promise<ConsumeResult> {
  const quota = await db.$queryRaw<{ id: bigint }[]>`
      UPDATE vouchers SET used = used + 1
      WHERE id = ${voucherId}
        AND active = true
        AND valid_until > now()
        AND used < quota
      RETURNING id
  `
  if (quota.length === 0) return 'HABIS'

  const usages = await db.$queryRaw<{ voucher_id: bigint }[]>`
      INSERT INTO voucher_usages (voucher_id, user_id, transaction_id, status, used_at)
      VALUES (${voucherId}, ${userId}, ${transactionId}, 'TERPAKAI', now())
      ON CONFLICT (voucher_id, user_id) DO UPDATE
        SET status = 'TERPAKAI',
            transaction_id = EXCLUDED.transaction_id,
            used_at = now(),
            restored_at = NULL
        WHERE voucher_usages.status = 'DIPULIHKAN'
      RETURNING voucher_id
  `
  if (usages.length === 0) {
    await db.$executeRaw`UPDATE vouchers SET used = used - 1 WHERE id = ${voucherId}`
    return 'SUDAH_DIPAKAI'
  }
  return 'OK'
}

/** Convenience wrapper for callers that do not already own a transaction. */
export function consume(voucherId: bigint, userId: bigint, transactionId: bigint | null) {
  return prisma.$transaction((tx) => consumeInTx(tx, voucherId, userId, transactionId))
}

/** Flip usage to DIPULIHKAN inside the caller's transaction. */
export async function releaseInTx(db: Db, voucherId: bigint, userId: bigint): Promise<boolean> {
  const rows = await db.$queryRaw<{ voucher_id: bigint }[]>`
      UPDATE voucher_usages
      SET status = 'DIPULIHKAN', restored_at = now()
      WHERE voucher_id = ${voucherId} AND user_id = ${userId} AND status = 'TERPAKAI'
      RETURNING voucher_id
  `
  if (rows.length === 0) return false
  await db.$executeRaw`UPDATE vouchers SET used = used - 1 WHERE id = ${voucherId} AND used > 0`
  return true
}

/** Flip usage to DIPULIHKAN; returns false when it was not TERPAKAI. */
export function release(voucherId: bigint, userId: bigint): Promise<boolean> {
  return prisma.$transaction((tx) => releaseInTx(tx, voucherId, userId))
}
