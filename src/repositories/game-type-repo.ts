// game_types data access — pure queries (master catalog, no business rules).

import { prisma } from '../lib/prisma'
import type { GameType } from '../../generated/client'

export function listAll() {
  return prisma.gameType.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] })
}

export function listActive() {
  return prisma.gameType.findMany({ where: { active: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }] })
}

export function findById(id: bigint) {
  return prisma.gameType.findUnique({ where: { id } })
}

export function findByCode(code: string) {
  return prisma.gameType.findUnique({ where: { code: code } })
}

export function create(data: { code: string; name: string; order: number; active: boolean }): Promise<GameType> {
  return prisma.gameType.create({ data })
}

export function update(
  id: bigint,
  data: Partial<{ code: string; name: string; order: number; active: boolean }>,
): Promise<GameType> {
  return prisma.gameType.update({ where: { id }, data })
}
