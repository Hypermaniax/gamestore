import { prisma } from '../lib/prisma'
import type { Db } from './transaction-repo'

export function sumByPayment(paymentId: bigint, db: Db = prisma) {
  return db.refund.aggregate({
    where: { paymentId },
    _sum: { amount: true, fee: true },
  })
}

export function create(
  db: Db,
  data: {
    paymentId: bigint
    transactionId: bigint
    amount: string
    fee: string
    ref?: string | null
    note?: string | null
    adminId: bigint
    refundedAt: Date
  },
) {
  return db.refund.create({ data })
}

export function listByTransaction(transactionId: bigint, db: Db = prisma) {
  return db.refund.findMany({
    where: { transactionId },
    orderBy: { refundedAt: 'desc' },
  })
}
