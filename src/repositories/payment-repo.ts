// Payment rows — one PENDING invoice per transaction (plus archived attempts).

import { prisma } from '../lib/prisma'
import type { Prisma } from '../../generated/client'
import type { Db } from './transaction-repo'

export type PaymentData = {
  transactionId: bigint
  method: string
  externalId: string
  reference?: string | null
  xenditId?: string | null
  instructions?: Prisma.InputJsonValue
  amount: string
  expiredAt: Date
}

export function create(db: Db, data: PaymentData) {
  return db.payment.create({ data })
}

export function update(
  db: Db,
  id: bigint,
  data: Prisma.PaymentUpdateManyMutationInput,
) {
  return db.payment.updateMany({ where: { id }, data })
}

export function findByExternalId(externalId: string, db: Db = prisma) {
  return db.payment.findUnique({
    where: { externalId },
    include: {
      transaction: { include: { account: true, voucher: true } },
    },
  })
}

export function findById(id: bigint, db: Db = prisma) {
  return db.payment.findUnique({
    where: { id },
    include: { transaction: { include: { account: true, voucher: true } } },
  })
}

export function findByTransactionId(transactionId: bigint, db: Db = prisma) {
  return db.payment.findMany({
    where: { transactionId },
    orderBy: { id: 'desc' },
  })
}

export function findPendingByTransaction(transactionId: bigint, db: Db = prisma) {
  return db.payment.findFirst({
    where: { transactionId, status: 'PENDING' },
    orderBy: { id: 'desc' },
  })
}

export function countByTransaction(transactionId: bigint, db: Db = prisma) {
  return db.payment.count({ where: { transactionId } })
}

export function cancelOtherPending(db: Db, transactionId: bigint, exceptId: bigint) {
  return db.payment.updateMany({
    where: { transactionId, status: 'PENDING', id: { not: exceptId } },
    data: { status: 'CANCELLED' },
  })
}

export function cancelAllPending(db: Db, transactionId: bigint) {
  return db.payment.updateMany({
    where: { transactionId, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  })
}

export function nextExternalId(code: string, sequence: number): string {
  return `${code}-${sequence}`
}
