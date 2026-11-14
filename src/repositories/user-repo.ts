// users table data access — pure queries. Wire multi-table transactions here
// (data-level operations), business rules stay in services.

import { prisma } from '../lib/prisma'
import type { PrismaClient, Prisma, User } from '../../generated/client'

type Db = PrismaClient | Prisma.TransactionClient

const withRole = { include: { role: true } } as const

export type UserWithRole = User & { role: { id: bigint; code: string } }

export function findByEmail(email: string) {
  // lower(email) uniqueness is a partial index in SQL (not a Prisma scalar) → insensitive lookup.
  return prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
}

export function findByUsername(username: string) {
  return prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    include: { role: true },
  })
}

export function findByUsernameOrEmail(identity: string) {
  return prisma.user.findFirst({
    where: { OR: [{ email: identity }, { username: { equals: identity, mode: 'insensitive' } }] },
    include: { role: true },
  })
}

export function findById(id: bigint) {
  return prisma.user.findUnique({ where: { id } })
}

export function findByIdWithRole(id: bigint) {
  return prisma.user.findUnique({ where: { id }, ...withRole })
}

export function create(data: { username: string; email: string; passwordHash: string; roleId: bigint }) {
  return prisma.user.create({ data })
}

/** Mark email as verified (used inside the verification transaction). */
export function markVerified(userId: bigint, db: Db): Promise<User> {
  return db.user.update({ where: { id: userId }, data: { emailVerified: true } })
}

/** Change password: swap the hash and invalidate every session except the one re-issued by the caller. */
export function updatePasswordAndRevokeAll(userId: bigint, passwordHash: string): Promise<unknown> {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } }),
  ])
}

/** Logout-all: revoke every refresh token of the user + bump token_version, atomically. */
export async function revokeAllSessions(userId: bigint): Promise<void> {
  await prisma.$transaction([
    prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } }),
    prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } }),
  ])
}

/* ------------------------------------------------------------ admin readers */

export type UserListFilter = {
  q?: string
  skip: number
  take: number
}

function userWhere(q?: string): Prisma.UserWhereInput | undefined {
  if (!q) return undefined
  return {
    OR: [
      { username: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ],
  }
}

export function list({ q, skip, take }: UserListFilter) {
  return prisma.user.findMany({
    where: userWhere(q),
    orderBy: { id: 'asc' },
    skip,
    take,
    include: { role: true },
  })
}

export function count(q?: string): Promise<number> {
  return prisma.user.count({ where: userWhere(q) })
}

export function countActiveAdmins(): Promise<number> {
  return prisma.user.count({ where: { active: true, role: { code: 'ADMIN' } } })
}

export function updateRole(userId: bigint, roleId: bigint): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { roleId } })
}

/** Flip aktif; when deactivating, all sessions are revoked in the same write. */
export function updateActive(userId: bigint, active: boolean): Promise<unknown> {
  if (active) return prisma.user.update({ where: { id: userId }, data: { active: true } })
  return prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { active: false, tokenVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } }),
  ])
}
