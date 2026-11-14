// Automatic promo discounts — specificity AKUN > GAME > SEMUA, tie-break by rupiah
// amount then id. CRUD is permission-guarded and audited.

import { authService } from './auth.service'
import { rbacService } from './rbac.service'
import { auditService } from './audit.service'
import * as promotionRepo from '../repositories/promotion-repo'
import * as accountRepo from '../repositories/account-repo'
import * as gameRepo from '../repositories/game-repo'
import {
  promotionCreateSchema,
  promotionIdSchema,
  promotionUpdateSchema,
  discountListSchema,
  type DiscountListInput,
  type PromotionCreateInput,
  type PromotionUpdateInput,
} from '../validation/diskon'
import { parseInput, type UnionError } from '../validation/parse'
import { type DiskonCakupan, type DiskonJenis, type PromotionCandidate, pilihPromo } from '../lib/diskon'
import type { SessionClaims } from '../lib/session'

const fail = (code: string, message: string): UnionError => ({ ok: false, code, message })
const SESSION: UnionError = fail('INVALID_SESSION', 'Your session is no longer valid. Please log in again.')
const FORBIDDEN: UnionError = fail('FORBIDDEN', 'You do not have permission to perform this action.')
const isError = (value: SessionClaims | UnionError): value is UnionError => 'code' in value

async function requirePermission(code: string): Promise<SessionClaims | UnionError> {
  const session = await authService.verifySession()
  if (!session) return SESSION
  if (!(await rbacService.hasPermission(session.userId, code))) return FORBIDDEN
  return session
}

type PromotionRow = {
  id: bigint
  name: string
  type: string
  value: { toString(): string }
  maxDiscount: { toString(): string } | null
  scope: string
  targetId: bigint | null
  startsAt: Date
  endsAt: Date
  active: boolean
}

const serializeAdmin = (promotion: PromotionRow) => ({
  id: promotion.id.toString(),
  name: promotion.name,
  type: promotion.type,
  value: promotion.value.toString(),
  maxDiscount: promotion.maxDiscount?.toString() ?? null,
  scope: promotion.scope,
  targetId: promotion.targetId?.toString() ?? null,
  startsAt: promotion.startsAt.toISOString(),
  endsAt: promotion.endsAt.toISOString(),
  active: promotion.active,
})

async function resolveTargetLabels(rows: PromotionRow[]) {
  const idsFor = (scope: string) => [
    ...new Set(
      rows
        .filter((row) => row.scope === scope && row.targetId !== null)
        .map((row) => row.targetId!),
    ),
  ]
  const [games, accounts] = await Promise.all([
    gameRepo.listNamesByIds(idsFor('GAME')),
    accountRepo.listTitlesByIds(idsFor('AKUN')),
  ])
  return new Map<string, string>([
    ...games.map((game) => [`GAME:${game.id}`, game.name] as const),
    ...accounts.map((account) => [`AKUN:${account.id}`, account.title] as const),
  ])
}

type PromotionRules = {
  type: DiskonJenis
  value: string
  scope: DiskonCakupan
  targetId: bigint | null
  startsAt: Date
  endsAt: Date
}

async function validateRules(rules: PromotionRules): Promise<UnionError | null> {
  if (rules.type === 'PERSEN' && Number(rules.value) > 100)
    return fail('VALUE_INVALID', 'Percentage discount cannot exceed 100.')
  if (rules.startsAt >= rules.endsAt)
    return fail('PERIOD_INVALID', 'Start time must be before end time.')
  if (rules.scope === 'SEMUA') {
    if (rules.targetId !== null) return fail('TARGET_INVALID', 'A promo with SEMUA scope does not use a target.')
    return null
  }
  if (rules.targetId === null)
    return fail('TARGET_INVALID', 'AKUN/GAME promos must select a target.')
  if (rules.scope === 'GAME' && !(await gameRepo.findById(rules.targetId)))
    return fail('TARGET_INVALID', 'Target game not found.')
  if (rules.scope === 'AKUN') {
    const account = await accountRepo.findById(rules.targetId)
    if (!account || account.deletedAt) return fail('TARGET_INVALID', 'Target account not found.')
  }
  return null
}

export const promotionService = {
  /* ------------------------------------------------------------ publik */

  async listActive() {
    const rows = await promotionRepo.listActiveAt(new Date())
    return {
      ok: true as const,
      data: rows.map((promotion) => ({
        id: promotion.id.toString(),
        name: promotion.name,
        type: promotion.type as DiskonJenis,
        value: promotion.value.toString(),
        maxDiscount: promotion.maxDiscount?.toString() ?? null,
        scope: promotion.scope as DiskonCakupan,
        targetId: promotion.targetId?.toString() ?? null,
        startsAt: promotion.startsAt.toISOString(),
        endsAt: promotion.endsAt.toISOString(),
      })),
    }
  },

  /** Internal pricing hook: the single winning promo for this account/price. */
  async calculatePromo(
    price: bigint,
    accountId: bigint,
    gameId: bigint,
    db?: promotionRepo.Db,
    now = new Date(),
  ) {
    const rows = await promotionRepo.listActiveAt(now, db)
    const candidates: PromotionCandidate[] = rows.map((promotion) => ({
      id: promotion.id,
      type: promotion.type as DiskonJenis,
      value: promotion.value.toString(),
      maxDiscount: promotion.maxDiscount?.toString() ?? null,
      scope: promotion.scope as DiskonCakupan,
      targetId: promotion.targetId,
    }))
    const winner = pilihPromo(candidates, { price, accountId, gameId })
    if (!winner) return { promotion: null, potongan: '0' }
    return {
      promotion: {
        id: winner.promotion.id.toString(),
        name: rows.find((row) => row.id === winner.promotion.id)?.name ?? '',
        type: winner.promotion.type,
        scope: winner.promotion.scope,
      },
      potongan: winner.potongan.toString(),
    }
  },

  /* --------------------------------------------------------------- admin */

  async listAdmin(input: DiscountListInput) {
    const session = await requirePermission('promotion:read')
    if (isError(session)) return session
    const parsed = parseInput(discountListSchema, input)
    if (!parsed.ok) return parsed

    const filter = { q: parsed.data.q, active: parsed.data.active }
    const [rows, total] = await Promise.all([
      promotionRepo.listAdmin({
        ...filter,
        skip: (parsed.data.page - 1) * parsed.data.size,
        take: parsed.data.size,
      }),
      promotionRepo.countAdmin(filter),
    ])
    const labels = await resolveTargetLabels(rows)
    return {
      ok: true as const,
      data: {
        items: rows.map((row) => ({
          ...serializeAdmin(row),
          targetLabel:
            row.targetId === null
              ? null
              : (labels.get(`${row.scope}:${row.targetId}`) ?? null),
        })),
        page: parsed.data.page,
        size: parsed.data.size,
        total,
      },
    }
  },

  async create(input: PromotionCreateInput) {
    const session = await requirePermission('promotion:write')
    if (isError(session)) return session
    const parsed = parseInput(promotionCreateSchema, input)
    if (!parsed.ok) return parsed

    const rules: PromotionRules = {
      type: parsed.data.type,
      value: parsed.data.value,
      scope: parsed.data.scope,
      targetId: parsed.data.scope === 'SEMUA' ? null : (parsed.data.targetId ?? null),
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
    }
    const invalid = await validateRules(rules)
    if (invalid) return invalid

    const row = await promotionRepo.create({
      name: parsed.data.name,
      type: parsed.data.type,
      value: parsed.data.value,
      maxDiscount: parsed.data.maxDiscount?.toString() ?? null,
      scope: parsed.data.scope,
      targetId: rules.targetId,
      startsAt: rules.startsAt,
      endsAt: rules.endsAt,
      active: parsed.data.active,
    })
    await auditService.log(session.userId, 'promotion.create', `promotion:${row.id}`, {
      name: row.name,
      scope: row.scope,
    })
    return { ok: true as const, id: row.id.toString() }
  },

  async update(input: PromotionUpdateInput) {
    const session = await requirePermission('promotion:write')
    if (isError(session)) return session
    const parsed = parseInput(promotionUpdateSchema, input)
    if (!parsed.ok) return parsed

    const existing = await promotionRepo.findById(parsed.data.id)
    if (!existing) return fail('PROMOTION_NOT_FOUND', 'Promo not found.')

    const scope = (parsed.data.scope ?? existing.scope) as DiskonCakupan
    let targetId =
      parsed.data.targetId !== undefined ? parsed.data.targetId : existing.targetId
    if (scope === 'SEMUA') targetId = null

    const rules: PromotionRules = {
      type: (parsed.data.type ?? existing.type) as DiskonJenis,
      value: parsed.data.value ?? existing.value.toString(),
      scope,
      targetId,
      startsAt: parsed.data.startsAt ?? existing.startsAt,
      endsAt: parsed.data.endsAt ?? existing.endsAt,
    }
    const invalid = await validateRules(rules)
    if (invalid) return invalid

    await promotionRepo.update(existing.id, {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      type: rules.type,
      value: rules.value,
      ...(parsed.data.maxDiscount !== undefined
        ? { maxDiscount: parsed.data.maxDiscount?.toString() ?? null }
        : {}),
      scope: rules.scope,
      targetId: rules.targetId,
      startsAt: rules.startsAt,
      endsAt: rules.endsAt,
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
    })
    await auditService.log(session.userId, 'promotion.update', `promotion:${existing.id}`, {
      fields: Object.keys(parsed.data),
    })
    return { ok: true as const }
  },

  async setActive(input: { id: string; active: boolean }) {
    const session = await requirePermission('promotion:write')
    if (isError(session)) return session
    const parsed = parseInput(promotionIdSchema.extend({ active: promotionCreateSchema.shape.active }), input)
    if (!parsed.ok) return parsed
    const existing = await promotionRepo.findById(parsed.data.id)
    if (!existing) return fail('PROMOTION_NOT_FOUND', 'Promo not found.')
    await promotionRepo.update(existing.id, { active: parsed.data.active })
    await auditService.log(session.userId, 'promotion.active', `promotion:${existing.id}`, { active: parsed.data.active })
    return { ok: true as const }
  },
}
