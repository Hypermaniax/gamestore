// promotions data access — automatic discounts. Selection/specificity lives in services.

import { prisma } from '../lib/prisma'
import type { Prisma, PrismaClient } from '../../generated/client'

export type Db = PrismaClient | Prisma.TransactionClient

export type PromotionData = {
  name: string
  type: string
  value: string
  maxDiscount: string | null
  scope: string
  targetId: bigint | null
  startsAt: Date
  endsAt: Date
  active: boolean
}

export function create(data: PromotionData) {
  return prisma.promotion.create({ data })
}

export function update(id: bigint, data: Partial<PromotionData>) {
  return prisma.promotion.update({ where: { id }, data })
}

export function findById(id: bigint) {
  return prisma.promotion.findUnique({ where: { id } })
}

export function listActiveAt(now: Date, db: Db = prisma) {
  return db.promotion.findMany({
    where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { id: 'desc' },
    select: {
      id: true,
      name: true,
      type: true,
      value: true,
      maxDiscount: true,
      scope: true,
      targetId: true,
      startsAt: true,
      endsAt: true,
    },
  })
}

export type PromotionAdminFilter = { q?: string; active?: boolean }

function adminWhere(filter: PromotionAdminFilter): Prisma.PromotionWhereInput {
  return {
    ...(filter.q ? { name: { contains: filter.q, mode: 'insensitive' } } : {}),
    ...(filter.active !== undefined ? { active: filter.active } : {}),
  }
}

export function listAdmin(filter: PromotionAdminFilter & { skip: number; take: number }) {
  return prisma.promotion.findMany({
    where: adminWhere(filter),
    orderBy: { id: 'desc' },
    skip: filter.skip,
    take: filter.take,
  })
}

export function countAdmin(filter: PromotionAdminFilter) {
  return prisma.promotion.count({ where: adminWhere(filter) })
}
