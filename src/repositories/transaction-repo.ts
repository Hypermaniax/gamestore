// Transaction data access. The checkout phase-1 transaction lives here so the
// service can keep business rules while row locks and optimistic updates stay SQL.

import { prisma } from '../lib/prisma'
import type { Prisma, PrismaClient } from '../../generated/client'

export type Db = PrismaClient | Prisma.TransactionClient

export function run<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn)
}

/** Serialize checkouts per buyer so the pending-transaction limit is race-free. */
export async function lockUser(db: Db, userId: bigint): Promise<void> {
  await db.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`
}

/** Serialize method changes and payment settlement for one transaction. */
export async function lockTransaction(db: Db, id: bigint): Promise<void> {
  await db.$queryRaw`SELECT id FROM transactions WHERE id = ${id} FOR UPDATE`
}

export function countPending(db: Db, userId: bigint) {
  return db.transaction.count({ where: { buyerId: userId, status: 'RESERVED' } })
}

export function findAccountForCheckout(db: Db, accountId: bigint) {
  return db.gameAccount.findUnique({
    where: { id: accountId },
    include: { game: { select: { id: true, code: true, name: true } } },
  })
}

/** Atomic AVAILABLE -> RESERVED. False means another buyer won. */
export async function reserveAccount(db: Db, accountId: bigint): Promise<boolean> {
  const result = await db.gameAccount.updateMany({
    where: { id: accountId, status: 'AVAILABLE', deletedAt: null },
    data: { status: 'RESERVED', version: { increment: 1 } },
  })
  return result.count === 1
}

/** RESERVED -> AVAILABLE for expiry/failure/cancellation. */
export async function releaseAccount(db: Db, accountId: bigint): Promise<boolean> {
  const result = await db.gameAccount.updateMany({
    where: { id: accountId, status: 'RESERVED', deletedAt: null },
    data: { status: 'AVAILABLE', version: { increment: 1 } },
  })
  return result.count === 1
}

/** RESERVED -> SOLD after a settled payment. */
export async function markAccountSold(db: Db, accountId: bigint): Promise<boolean> {
  const result = await db.gameAccount.updateMany({
    where: { id: accountId, status: 'RESERVED', deletedAt: null },
    data: { status: 'SOLD', version: { increment: 1 } },
  })
  return result.count === 1
}

export type TransactionData = {
  code: string
  accountId: bigint
  buyerId: bigint
  initialPrice: string
  promotionId: bigint | null
  promotionDiscount: string
  voucherId: bigint | null
  voucherDiscount: string
  total: string
  termsVersion: number
  termsAcceptedAt: Date
  expiredAt: Date
}

export function create(db: Db, data: TransactionData) {
  return db.transaction.create({ data })
}

export function findByCode(code: string, db: Db = prisma) {
  return db.transaction.findUnique({
    where: { code },
    include: {
      account: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          game: { select: { code: true, name: true } },
        },
      },
      promotion: { select: { id: true, name: true } },
      voucher: { select: { id: true, code: true } },
      payments: {
        orderBy: { id: 'asc' },
        select: {
          id: true,
          method: true,
          externalId: true,
          xenditId: true,
          incomingFundId: true,
          status: true,
          reference: true,
          instructions: true,
          amount: true,
          expiredAt: true,
          createdAt: true,
        },
      },
    },
  })
}

export function findOwnedByCode(code: string, buyerId: bigint, db: Db = prisma) {
  return db.transaction.findFirst({ where: { code, buyerId } })
}

export function listByBuyer(
  buyerId: bigint,
  filter: { status?: string; skip: number; take: number },
  db: Db = prisma,
) {
  return db.transaction.findMany({
    where: { buyerId, ...(filter.status ? { status: filter.status } : {}) },
    orderBy: { createdAt: 'desc' },
    skip: filter.skip,
    take: filter.take,
    include: {
      account: { select: { slug: true, title: true } },
      payments: { select: { method: true, status: true, expiredAt: true } },
    },
  })
}

export function countByBuyer(buyerId: bigint, status: string | undefined, db: Db = prisma) {
  return db.transaction.count({
    where: { buyerId, ...(status ? { status } : {}) },
  })
}

const adminInclude = {
  account: {
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      game: { select: { code: true, name: true } },
    },
  },
  buyer: { select: { id: true, username: true, email: true } },
  payments: {
    orderBy: { id: 'desc' as const },
    take: 1,
    select: { id: true, method: true, status: true, amount: true },
  },
} as const

export function listAdmin(filter: {
  q?: string
  status?: string
  skip: number
  take: number
}) {
  return prisma.transaction.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.q
        ? {
            OR: [
              { code: { contains: filter.q, mode: 'insensitive' as const } },
              { buyer: { username: { contains: filter.q, mode: 'insensitive' as const } } },
              { buyer: { email: { contains: filter.q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    skip: filter.skip,
    take: filter.take,
    include: adminInclude,
  })
}

export function countAdmin(filter: { q?: string; status?: string }) {
  return prisma.transaction.count({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.q
        ? {
            OR: [
              { code: { contains: filter.q, mode: 'insensitive' as const } },
              { buyer: { username: { contains: filter.q, mode: 'insensitive' as const } } },
              { buyer: { email: { contains: filter.q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    },
  })
}

export function findAdminByCode(code: string) {
  return prisma.transaction.findUnique({
    where: { code },
    include: {
      account: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          credentialsEncrypted: true,
          game: { select: { code: true, name: true } },
        },
      },
      buyer: { select: { id: true, username: true, email: true } },
      promotion: { select: { id: true, name: true } },
      voucher: { select: { id: true, code: true } },
      payments: {
        orderBy: { id: 'asc' },
        select: {
          id: true,
          method: true,
          externalId: true,
          xenditId: true,
          incomingFundId: true,
          status: true,
          reference: true,
          instructions: true,
          amount: true,
          expiredAt: true,
          createdAt: true,
          refunds: {
            orderBy: { refundedAt: 'desc' },
            select: {
              id: true,
              amount: true,
              fee: true,
              reference: true,
              note: true,
              refundedAt: true,
              admin: { select: { username: true } },
            },
          },
        },
      },
      refunds: {
        orderBy: { refundedAt: 'desc' },
        select: {
          id: true,
          amount: true,
          fee: true,
          reference: true,
          note: true,
          refundedAt: true,
          paymentId: true,
          admin: { select: { username: true } },
        },
      },
      auditReveals: {
        orderBy: { revealedAt: 'desc' },
        take: 20,
        select: { revealedAt: true, ip: true, userAgent: true },
      },
    },
  })
}

export function listWebhookForPayments(paymentIds: string[]) {
  if (paymentIds.length === 0) return Promise.resolve([])
  return prisma.webhookEvent.findMany({
    where: {
      OR: paymentIds.map((id) => ({ incomingFundId: { startsWith: `${id}:` } })),
    },
    orderBy: { id: 'asc' },
    select: { id: true, type: true, incomingFundId: true, status: true, processedAt: true },
  })
}

export function listForRefund(statuses: string[]) {
  return prisma.transaction.findMany({
    where: { status: { in: statuses } },
    select: {
      id: true,
      code: true,
      status: true,
      payments: {
        where: { status: 'PAID' },
        select: {
          id: true,
          amount: true,
          refunds: { select: { amount: true } },
        },
      },
    },
  })
}

export function listUnrefundedDuplicates() {
  return prisma.payment.findMany({
    where: { status: 'DUPLIKAT' },
    select: {
      id: true,
      amount: true,
      transaction: { select: { code: true } },
      refunds: { select: { amount: true } },
    },
  })
}

export function countByStatus(status: string) {
  return prisma.transaction.count({ where: { status } })
}

export function sumRevenue(from: Date, to: Date) {
  return prisma.transaction.aggregate({
    where: { status: { in: ['PAID', 'DISPUTED'] }, paidAt: { gte: from, lt: to } },
    _sum: { total: true },
    _count: true,
  })
}

export async function lockPayment(db: Db, id: bigint): Promise<void> {
  await db.$queryRaw`SELECT id FROM payments WHERE id = ${id} FOR UPDATE`
}

export function setRevealUntil(db: Db, id: bigint, at: Date) {
  return db.transaction.updateMany({
    where: { id, status: 'PAID' },
    data: { revealUntil: at },
  })
}

/** Lightweight polling row — never includes payment instructions or credentials. */
export function findStatus(code: string, buyerId: bigint, db: Db = prisma) {
  return db.transaction.findFirst({
    where: { code, buyerId },
    select: {
      code: true,
      status: true,
      total: true,
      expiredAt: true,
      payments: {
        select: { status: true, method: true, expiredAt: true },
        orderBy: { id: 'desc' },
        take: 1,
      },
    },
  })
}

export function updateStatus(
  db: Db,
  id: bigint,
  from: string[],
  data: Prisma.TransactionUpdateManyMutationInput,
) {
  return db.transaction.updateMany({ where: { id, status: { in: from } }, data })
}

export function findById(id: bigint, db: Db = prisma) {
  return db.transaction.findUnique({ where: { id }, include: { account: true } })
}

export function linkIdempotency(
  db: Db,
  userId: bigint,
  key: string,
  transactionId: bigint,
) {
  return db.idempotencyKey.update({
    where: { userId_key: { userId, key } },
    data: { transactionId },
  })
}

export function findOwnedForReveal(code: string, buyerId: bigint, db: Db = prisma) {
  return db.transaction.findFirst({
    where: { code, buyerId },
    include: {
      account: {
        select: {
          id: true,
          title: true,
          status: true,
          credentialsEncrypted: true,
          keyVersion: true,
        },
      },
    },
  })
}

export async function claimWarrantyStart(db: Db, id: bigint, at: Date): Promise<void> {
  await db.transaction.updateMany({
    where: { id, warrantyStart: null },
    data: { warrantyStart: at },
  })
}


export function listExpired(now: Date, limit = 100) {
  return prisma.transaction.findMany({
    where: { status: 'RESERVED', expiredAt: { lte: now } },
    orderBy: { expiredAt: 'asc' },
    take: limit,
    select: { id: true, code: true },
  })
}

export function countExpired(now: Date) {
  return prisma.transaction.count({
    where: { status: 'RESERVED', expiredAt: { lte: now } },
  })
}

export function listWarrantyNotStarted(cutoff: Date, limit = 100) {
  return prisma.transaction.findMany({
    where: {
      status: 'PAID',
      receiptConfirmed: false,
      warrantyStart: null,
      paidAt: { lte: cutoff },
    },
    orderBy: { paidAt: 'asc' },
    take: limit,
    select: { id: true },
  })
}

export function listWarrantyExpired(cutoff: Date, limit = 100) {
  return prisma.transaction.findMany({
    where: {
      status: 'PAID',
      receiptConfirmed: false,
      warrantyStart: { lte: cutoff },
    },
    orderBy: { warrantyStart: 'asc' },
    take: limit,
    select: { id: true },
  })
}

export async function setWarrantyStart(
  id: bigint,
  startsAt: Date,
  db: Db = prisma,
): Promise<boolean> {
  const result = await db.transaction.updateMany({
    where: { id, status: 'PAID', warrantyStart: null, receiptConfirmed: false },
    data: { warrantyStart: startsAt },
  })
  return result.count === 1
}

export async function autoConfirm(
  id: bigint,
  cutoff: Date,
  now: Date,
  db: Db = prisma,
): Promise<boolean> {
  const result = await db.transaction.updateMany({
    where: {
      id,
      status: 'PAID',
      receiptConfirmed: false,
      warrantyStart: { lte: cutoff },
    },
    data: {
      receiptConfirmed: true,
      confirmedAt: now,
      confirmedBy: 'OTOMATIS',
    },
  })
  return result.count === 1
}
