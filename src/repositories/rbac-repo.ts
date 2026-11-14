// RBAC data access — pure queries (ref: docs/PLAN.md §9; ERD §3.1). No business logic here.

import { prisma } from '../lib/prisma'
import type { PrismaClient, Prisma } from '../../generated/client'

type Db = PrismaClient | Prisma.TransactionClient

export async function findPermissionCodesByUser(userId: bigint, db: Db = prisma): Promise<Set<string>> {
  const row = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: { select: { rolePermissions: { where: { revokedAt: null }, select: { permission: { select: { code: true } } } } } },
    },
  })
  if (!row) return new Set()
  return new Set(row.role.rolePermissions.map((grant) => grant.permission.code))
}

export function findMenusByRole(roleId: bigint) {
  return prisma.menu.findMany({
    where: {
      active: true,
      grants: { some: { roleId, revokedAt: null } },
    },
    orderBy: { order: 'asc' },
    select: { id: true, code: true, name: true, path: true, icon: true, parentId: true },
  })
}

export function findRoleByCode(code: string) {
  return prisma.role.findUnique({ where: { code: code } })
}
