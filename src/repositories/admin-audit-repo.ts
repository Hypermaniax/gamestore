// Append-only admin audit trail — data access only. The DB user has INSERT/SELECT
// privileges on this table (REVOKE UPDATE/DELETE in the hardening migration).

import { prisma } from '../lib/prisma'
import type { Prisma } from '../../generated/client'

export type CreateAuditLog = {
  actorId: bigint | null
  action: string
  target: string
  detail?: Prisma.InputJsonValue
}

export function create(data: CreateAuditLog) {
  return prisma.adminAuditLog.create({
    data: {
      actorId: data.actorId,
      action: data.action,
      target: data.target,
      detail: data.detail,
    },
  })
}

export function list({ skip, take }: { skip: number; take: number }) {
  return prisma.adminAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    include: { actor: { select: { id: true, username: true } } },
  })
}

export function count() {
  return prisma.adminAuditLog.count()
}

export function findLatestAction(action: string, since: Date) {
  return prisma.adminAuditLog.findFirst({
    where: { action: action, createdAt: { gte: since } },
    select: { id: true },
  })
}

export function listByAction(
  action: string,
  { skip, take }: { skip: number; take: number },
) {
  return prisma.adminAuditLog.findMany({
    where: { action: action },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    include: { actor: { select: { id: true, username: true } } },
  })
}

export function countByAction(action: string) {
  return prisma.adminAuditLog.count({ where: { action } })
}
