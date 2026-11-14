// Webhook inbox — phase-1 insert is committed before processing (docs/PLAN §7.6).

import { prisma } from '../lib/prisma'
import { Prisma } from '../../generated/client'
import type { Db } from './transaction-repo'

export type WebhookData = {
  type: string
  incomingFundId: string
  rawPayload: Prisma.InputJsonValue
}

export async function insert(data: WebhookData) {
  return prisma.webhookEvent.create({ data })
}

export function findById(id: bigint) {
  return prisma.webhookEvent.findUnique({ where: { id } })
}

export function findByKey(type: string, incomingFundId: string) {
  return prisma.webhookEvent.findUnique({
    where: { type_incomingFundId: { type, incomingFundId } },
  })
}

export function lockByKey(db: Db, type: string, incomingFundId: string) {
  return db.webhookEvent.findUnique({
    where: { type_incomingFundId: { type, incomingFundId } },
  })
}

export function updateStatus(db: Db, id: bigint, status: string, at = new Date()) {
  return db.webhookEvent.update({
    where: { id },
    data: { status, ...(status === 'DIPROSES' ? { processedAt: at } : {}) },
  })
}


export function listFailed(limit = 20) {
  return prisma.webhookEvent.findMany({
    where: { status: 'GAGAL', rawPayload: { not: Prisma.DbNull } },
    orderBy: { id: 'asc' },
    take: limit,
  })
}

export function countFailed() {
  return prisma.webhookEvent.count({ where: { status: 'GAGAL' } })
}

export function listAdmin(filter: { status?: string; skip: number; take: number }) {
  return prisma.webhookEvent.findMany({
    where: filter.status ? { status: filter.status } : undefined,
    orderBy: { id: 'desc' },
    skip: filter.skip,
    take: filter.take,
    select: {
      id: true,
      type: true,
      incomingFundId: true,
      status: true,
      processedAt: true,
    },
  })
}

export function countAdmin(filter: { status?: string }) {
  return prisma.webhookEvent.count({
    where: filter.status ? { status: filter.status } : undefined,
  })
}
