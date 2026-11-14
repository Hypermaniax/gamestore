// Catalog master data — public reads (cacheable) + admin CRUD. Attribute schemas may
// only grow: existing keys/types are immutable so old accounts stay valid.

import { authService } from './auth.service'
import { rbacService } from './rbac.service'
import { auditService } from './audit.service'
import * as gameTypeRepo from '../repositories/game-type-repo'
import * as gameRepo from '../repositories/game-repo'
import {
  attributeFieldSchema,
  gameCreateSchema,
  gameUpdateSchema,
  gameTypeCreateSchema,
  gameTypeUpdateSchema,
  type GameCreateInput,
  type GameUpdateInput,
  type GameTypeCreateInput,
  type GameTypeUpdateInput,
} from '../validation/catalog'
import { parseInput, type UnionError } from '../validation/parse'
import type { SessionClaims } from '../lib/session'
import type { Prisma } from '../../generated/client'

const fail = (code: string, message: string): UnionError => ({ ok: false, code, message })
const INVALID_SESSION: UnionError = fail('INVALID_SESSION', 'Your session is no longer valid. Please log in again.')
const FORBIDDEN: UnionError = fail('FORBIDDEN', 'You do not have permission to perform this action.')
const isError = (value: SessionClaims | UnionError): value is UnionError => 'code' in value

async function requirePermission(code: string): Promise<SessionClaims | UnionError> {
  const session = await authService.verifySession()
  if (!session) return INVALID_SESSION
  if (!(await rbacService.hasPermission(session.userId, code))) return FORBIDDEN
  return session
}

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002'

function parseSchema(value: Prisma.JsonValue): { kunci: string; tipe: string }[] {
  if (!Array.isArray(value)) return []
  const fields: { kunci: string; tipe: string }[] = []
  for (const field of value) {
    const parsed = attributeFieldSchema.safeParse(field)
    if (parsed.success) fields.push({ kunci: parsed.data.kunci, tipe: parsed.data.tipe })
  }
  return fields
}

/** Existing attribute keys/types cannot be removed or retyped (accounts rely on them). */
function schemaEvolutionError(oldValue: Prisma.JsonValue, next: { kunci: string; tipe: string }[]): UnionError | null {
  const nextByKey = new Map(next.map((field) => [field.kunci, field]))
  for (const field of parseSchema(oldValue)) {
    const updated = nextByKey.get(field.kunci)
    if (!updated) return fail('ATTRIBUTE_SCHEMA_INVALID', `Attribute "${field.kunci}" cannot be removed.`)
    if (updated.tipe !== field.tipe)
      return fail('ATTRIBUTE_SCHEMA_INVALID', `The type of attribute "${field.kunci}" cannot be changed.`)
  }
  return null
}

const serializeGameType = (gameType: { code: string; name: string; order: number }) => ({
  code: gameType.code,
  name: gameType.name,
  order: gameType.order,
})

export const catalogService = {
  /* ------------------------------------------------------------ publik */

  async listGameTypesPublic() {
    const rows = await gameTypeRepo.listActive()
    return { ok: true as const, data: rows.map(serializeGameType) }
  },

  async listGamesPublic() {
    const rows = await gameRepo.listActive()
    return {
      ok: true as const,
      data: rows.map((game) => ({
        code: game.code,
        name: game.name,
        iconUrl: game.iconUrl,
        attributeSchema: game.attributeSchema,
        type: { code: game.type.code, name: game.type.name },
        jumlahAkun: game._count.accounts,
      })),
    }
  },

  async getGamePublic(code: string) {
    const game = await gameRepo.findActiveByCode(code)
    if (!game) return fail('GAME_NOT_FOUND', 'Game not found.')
    return {
      ok: true as const,
      data: {
        code: game.code,
        name: game.name,
        iconUrl: game.iconUrl,
        type: { code: game.type.code, name: game.type.name },
        attributeSchema: game.attributeSchema,
      },
    }
  },

  /* --------------------------------------------------------- admin baca */

  async listGameTypesAdmin() {
    const session = await requirePermission('game:read')
    if (isError(session)) return session
    const rows = await gameTypeRepo.listAll()
    return {
      ok: true as const,
      data: rows.map((gameType) => ({
        id: gameType.id.toString(),
        code: gameType.code,
        name: gameType.name,
        order: gameType.order,
        active: gameType.active,
      })),
    }
  },

  async listGamesAdmin() {
    const session = await requirePermission('game:read')
    if (isError(session)) return session
    const rows = await gameRepo.listAll()
    return {
      ok: true as const,
      data: rows.map((game) => ({
        id: game.id.toString(),
        code: game.code,
        name: game.name,
        type: { id: game.type.id.toString(), code: game.type.code, name: game.type.name },
        iconUrl: game.iconUrl,
        attributeSchema: game.attributeSchema,
        active: game.active,
        jumlahAkun: game._count.accounts,
      })),
    }
  },

  /* ----------------------------------------------------- admin: jenis */

  async createGameType(input: GameTypeCreateInput) {
    const session = await requirePermission('game:write')
    if (isError(session)) return session
    const parsed = parseInput(gameTypeCreateSchema, input)
    if (!parsed.ok) return parsed

    if (await gameTypeRepo.findByCode(parsed.data.code))
      return fail('CODE_ALREADY_USED', 'Game type code is already in use.')
    try {
      const row = await gameTypeRepo.create(parsed.data)
      await auditService.log(session.userId, 'game.type-create', `gameType:${row.id}`, { code: row.code })
      return { ok: true as const, id: row.id.toString() }
    } catch (err) {
      if (isUniqueViolation(err)) return fail('CODE_ALREADY_USED', 'Game type code is already in use.')
      throw err
    }
  },

  async updateGameType(input: GameTypeUpdateInput) {
    const session = await requirePermission('game:write')
    if (isError(session)) return session
    const parsed = parseInput(gameTypeUpdateSchema, input)
    if (!parsed.ok) return parsed
    const { id, ...data } = parsed.data

    const existing = await gameTypeRepo.findById(id)
    if (!existing) return fail('GAME_TYPE_NOT_FOUND', 'Game type not found.')
    if (data.code && data.code !== existing.code && (await gameTypeRepo.findByCode(data.code)))
      return fail('CODE_ALREADY_USED', 'Game type code is already in use.')

    try {
      await gameTypeRepo.update(id, data)
      await auditService.log(session.userId, 'game.type-update', `gameType:${id}`, data)
      return { ok: true as const }
    } catch (err) {
      if (isUniqueViolation(err)) return fail('CODE_ALREADY_USED', 'Game type code is already in use.')
      throw err
    }
  },

  /* ------------------------------------------------------ admin: game */

  async createGame(input: GameCreateInput) {
    const session = await requirePermission('game:write')
    if (isError(session)) return session
    const parsed = parseInput(gameCreateSchema, input)
    if (!parsed.ok) return parsed

    if (!(await gameTypeRepo.findById(parsed.data.typeId)))
      return fail('GAME_TYPE_NOT_FOUND', 'Game type not found.')
    if (await gameRepo.findByCode(parsed.data.code))
      return fail('CODE_ALREADY_USED', 'Game code is already in use.')

    try {
      const row = await gameRepo.create({
        ...parsed.data,
        iconUrl: parsed.data.iconUrl ?? null,
        attributeSchema: parsed.data.attributeSchema as Prisma.InputJsonValue,
      })
      await auditService.log(session.userId, 'game.create', `game:${row.id}`, { code: row.code })
      return { ok: true as const, id: row.id.toString() }
    } catch (err) {
      if (isUniqueViolation(err)) return fail('CODE_ALREADY_USED', 'Game code is already in use.')
      throw err
    }
  },

  async updateGame(input: GameUpdateInput) {
    const session = await requirePermission('game:write')
    if (isError(session)) return session
    const parsed = parseInput(gameUpdateSchema, input)
    if (!parsed.ok) return parsed
    const { id, ...data } = parsed.data

    const existing = await gameRepo.findById(id)
    if (!existing) return fail('GAME_NOT_FOUND', 'Game not found.')
    if (data.typeId && !(await gameTypeRepo.findById(data.typeId)))
      return fail('GAME_TYPE_NOT_FOUND', 'Game type not found.')
    if (data.code && data.code !== existing.code && (await gameRepo.findByCode(data.code)))
      return fail('CODE_ALREADY_USED', 'Game code is already in use.')

    if (data.attributeSchema) {
      const evolution = schemaEvolutionError(existing.attributeSchema, data.attributeSchema)
      if (evolution) return evolution
    }

    try {
      await gameRepo.update(id, {
        ...data,
        attributeSchema: data.attributeSchema as Prisma.InputJsonValue | undefined,
      })
      await auditService.log(session.userId, 'game.update', `game:${id}`, {
        fields: Object.keys(data),
      })
      return { ok: true as const }
    } catch (err) {
      if (isUniqueViolation(err)) return fail('CODE_ALREADY_USED', 'Game code is already in use.')
      throw err
    }
  },

  /** DELETE semantics for master data = flip `aktif`. */
  async setGameTypeActive(input: { id: string; active: boolean }) {
    return catalogService.updateGameType({ id: input.id, active: input.active })
  },

  async setGameActive(input: { id: string; active: boolean }) {
    return catalogService.updateGame({ id: input.id, active: input.active })
  },
}
