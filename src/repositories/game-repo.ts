// game data access — available-account counts are filtered relation counts.

import { prisma } from '../lib/prisma'
import type { Game, Prisma } from '../../generated/client'

const availableCount = {
  _count: {
    select: {
      accounts: { where: { status: 'AVAILABLE', deletedAt: null } },
    },
  },
} satisfies Prisma.GameInclude

const withGameType = { include: { type: true } } as const

export function listAll() {
  return prisma.game.findMany({
    include: { type: true, ...availableCount },
    orderBy: [{ type: { order: 'asc' } }, { name: 'asc' }],
  })
}

export function listActive() {
  return prisma.game.findMany({
    where: { active: true, type: { active: true } },
    include: { type: true, ...availableCount },
    orderBy: [{ type: { order: 'asc' } }, { name: 'asc' }],
  })
}

export function findByCode(code: string) {
  return prisma.game.findUnique({ where: { code: code }, ...withGameType })
}

export function findById(id: bigint) {
  return prisma.game.findUnique({ where: { id }, ...withGameType })
}

export function listNamesByIds(ids: bigint[]) {
  if (ids.length === 0) return Promise.resolve([])
  return prisma.game.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  })
}

export function findActiveByCode(code: string) {
  return prisma.game.findFirst({ where: { code: code, active: true, type: { active: true } }, ...withGameType })
}

export function create(data: {
  code: string
  name: string
  typeId: bigint
  iconUrl?: string | null
  attributeSchema: Prisma.InputJsonValue
  active: boolean
}): Promise<Game> {
  return prisma.game.create({ data })
}

export function update(
  id: bigint,
  data: Partial<{
    code: string
    name: string
    typeId: bigint
    iconUrl: string | null
    attributeSchema: Prisma.InputJsonValue
    active: boolean
  }>,
): Promise<Game> {
  return prisma.game.update({ where: { id }, data })
}
