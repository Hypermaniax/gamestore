// Account catalog domain — state machine, write-only credentials, photos, browse.
// Status is never set through a generic update: only the explicit transitions below.

import { authService } from './auth.service'
import { rbacService } from './rbac.service'
import { auditService } from './audit.service'
import * as accountRepo from '../repositories/account-repo'
import * as gameRepo from '../repositories/game-repo'
import { encryptString } from '../lib/crypto'
import { MAX_PHOTO_COUNT, parseLocalPhotoPath } from '../lib/photo'
import { deleteAccountPhoto, saveAccountPhoto } from '../lib/account-photo'
import { realClock } from '../lib/clock'
import { withSuffix } from '../lib/slug'
import {
  accountCreateSchema,
  accountIdSchema,
  accountCredentialsSchema,
  accountListAdminSchema,
  accountRestoreSchema,
  accountUpdateSchema,
  photoAddSchema,
  photoRemoveSchema,
  photoReorderSchema,
  catalogQuerySchema,
  type AccountCreateInput,
  type AccountCredentialsInput,
  type AccountListAdminInput,
  type AccountRestoreInput,
  type AccountUpdateInput,
  type PhotoAddInput,
  type PhotoRemoveInput,
  type PhotoReorderInput,
  type CatalogQueryInput,
} from '../validation/catalog'
import { parseInput, type UnionError } from '../validation/parse'
import type { SessionClaims } from '../lib/session'
import type { Prisma } from '../../generated/client'

export const ACCOUNT_STATUSES = ['AVAILABLE', 'RESERVED', 'SOLD', 'DELISTED'] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

type AttrField = { kunci: string; label: string; tipe: string; wajib: boolean; opsi?: string[] }

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

const accountAad = (id: bigint): string => `akun:${id}`

/** Validate attributes against the game's schema; unknown/missing/typed values are rejected. */
function validateAttributes(
  schemaValue: Prisma.JsonValue,
  attributes: Record<string, string | number | boolean>,
): { ok: true; data: Prisma.InputJsonValue } | UnionError {
  const fields = (Array.isArray(schemaValue) ? schemaValue : []) as AttrField[]
  const allowed = new Set(fields.map((field) => field.kunci))

  for (const key of Object.keys(attributes)) {
    if (!allowed.has(key)) return fail('ATTRIBUTE_INVALID', `Attribute "${key}" is not recognized for this game.`)
  }

  const normalized: Record<string, string | number | boolean> = {}
  for (const field of fields) {
    const raw = attributes[field.kunci]
    const isEmpty = raw === undefined || raw === null || raw === ''
    if (isEmpty) {
      if (field.wajib) return fail('ATTRIBUTE_INVALID', `Attribute "${field.label}" is required.`)
      continue
    }

    if (field.tipe === 'angka') {
      if (typeof raw === 'boolean')
        return fail('ATTRIBUTE_INVALID', `Attribute "${field.label}" must be a number.`)
      const number = typeof raw === 'number' ? raw : Number(raw)
      if (!Number.isFinite(number))
        return fail('ATTRIBUTE_INVALID', `Attribute "${field.label}" must be a number.`)
      normalized[field.kunci] = number
      continue
    }

    if (typeof raw !== 'string')
      return fail('ATTRIBUTE_INVALID', `Attribute "${field.label}" must be text.`)
    if (field.tipe === 'pilihan' && !(field.opsi ?? []).includes(raw))
      return fail('ATTRIBUTE_INVALID', `The selection for "${field.label}" is invalid.`)
    normalized[field.kunci] = raw
  }
  return { ok: true, data: normalized }
}

function isPhotoDomainAllowed(url: string): boolean {
  if (parseLocalPhotoPath(url)) return true
  const whitelist = (process.env.FOTO_DOMAIN_WHITELIST ?? '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)
  if (whitelist.length === 0) return true
  try {
    const host = new URL(url).hostname.toLowerCase()
    return whitelist.some((domain) => host === domain || host.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

/** Server-side photo cap — the client-side limit is advisory only. */
async function photoCapError(accountId: bigint): Promise<UnionError | null> {
  const active = await accountRepo.countActivePhotos(accountId)
  if (active >= MAX_PHOTO_COUNT)
    return fail('PHOTO_LIMIT', `An account can have at most ${MAX_PHOTO_COUNT} photos.`)
  return null
}

const serializePublic = (row: {
  id: bigint
  slug: string
  title: string
  description: string | null
  price: { toString(): string }
  attributes: Prisma.JsonValue
  listedAt: Date | null
  game: { id: bigint; code: string; name: string; type: { code: string; name: string } }
  photos: { url: string; order: number }[]
}) => ({
  id: row.id.toString(),
  slug: row.slug,
  title: row.title,
  description: row.description,
  price: row.price.toString(),
  attributes: row.attributes,
  listedAt: row.listedAt?.toISOString() ?? null,
  game: { id: row.game.id.toString(), code: row.game.code, name: row.game.name },
  type: { code: row.game.type.code, name: row.game.type.name },
  photos: row.photos.map((photo) => photo.url),
})

const serializeAdmin = (row: {
  id: bigint
  slug: string
  title: string
  description: string | null
  price: { toString(): string }
  attributes: Prisma.JsonValue
  status: string
  credentialsEncrypted: Uint8Array | null
  listedAt: Date | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  version: number
  game: { id: bigint; code: string; name: string }
  photos: { id: bigint; url: string; order: number }[]
}) => ({
  id: row.id.toString(),
  slug: row.slug,
  title: row.title,
  description: row.description,
  price: row.price.toString(),
  attributes: row.attributes,
  status: row.status,
  kredensialTerisi: row.credentialsEncrypted !== null,
  listedAt: row.listedAt?.toISOString() ?? null,
  deletedAt: row.deletedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  version: row.version,
  game: { id: row.game.id.toString(), code: row.game.code, name: row.game.name },
  photos: row.photos.map((photo) => ({ id: photo.id.toString(), url: photo.url, order: photo.order })),
})

export const accountService = {
  /* ------------------------------------------------------------- publik */

  async listPublic(input: CatalogQueryInput) {
    const parsed = parseInput(catalogQuerySchema, input)
    if (!parsed.ok) return parsed
    const {
      type: typeCode,
      game: gameCode,
      hargaMin: minPrice,
      hargaMax: maxPrice,
      q,
      sort,
      page,
      size,
    } = parsed.data

    const ids = q ? await accountRepo.searchIds(q) : undefined
    if (ids && ids.length === 0)
      return { ok: true as const, data: { items: [], page, size, total: 0 } }

    const filter = {
      typeCode,
      gameCode,
      minPrice: minPrice === undefined ? undefined : BigInt(minPrice),
      maxPrice: maxPrice === undefined ? undefined : BigInt(maxPrice),
      ids,
    }
    const [rows, total] = await Promise.all([
      accountRepo.listPublic({ ...filter, sort, skip: (page - 1) * size, take: size }),
      accountRepo.countPublic(filter),
    ])
    return { ok: true as const, data: { items: rows.map(serializePublic), page, size, total } }
  },

  async getBySlug(slug: string) {
    const row = await accountRepo.findBySlugPublic(slug)
    if (!row) return fail('ACCOUNT_NOT_FOUND', 'Account not found or no longer available.')
    return { ok: true as const, data: serializePublic(row) }
  },

  /* --------------------------------------------------------------- admin */

  async listAdmin(input: AccountListAdminInput) {
    const session = await requirePermission('account:read')
    if (isError(session)) return session
    const parsed = parseInput(accountListAdminSchema, input)
    if (!parsed.ok) return parsed
    const { q, gameId, status, page, size } = parsed.data

    const filter = { q, gameId, status }
    const [rows, total] = await Promise.all([
      accountRepo.listAdmin({ ...filter, skip: (page - 1) * size, take: size }),
      accountRepo.countAdmin(filter),
    ])
    return { ok: true as const, data: { items: rows.map(serializeAdmin), page, size, total } }
  },

  async summaryAdmin(input: { q?: string; gameId?: string }) {
    const session = await requirePermission('account:read')
    if (isError(session)) return session
    const parsed = parseInput(accountListAdminSchema.pick({ q: true, gameId: true }), input)
    if (!parsed.ok) return parsed
    const { q, gameId } = parsed.data

    const rows = await accountRepo.countAdminByStatus({ q, gameId })
    const data = { total: 0, AVAILABLE: 0, RESERVED: 0, SOLD: 0, DELISTED: 0 }
    for (const row of rows) {
      if (row.status in data) {
        data[row.status as keyof typeof data] = row.total
        data.total += row.total
      }
    }
    return { ok: true as const, data }
  },

  async getAdmin(input: { id: string }) {
    const session = await requirePermission('account:read')
    if (isError(session)) return session
    const parsed = parseInput(accountIdSchema, input)
    if (!parsed.ok) return parsed
    const row = await accountRepo.findById(parsed.data.id)
    if (!row) return fail('ACCOUNT_NOT_FOUND', 'Account not found.')
    return { ok: true as const, data: serializeAdmin(row) }
  },

  async create(input: AccountCreateInput) {
    const session = await requirePermission('account:write')
    if (isError(session)) return session
    const parsed = parseInput(accountCreateSchema, input)
    if (!parsed.ok) return parsed
    const { gameId, title, description, price, attributes: inputAttributes } = parsed.data

    const game = await gameRepo.findById(gameId)
    if (!game) return fail('GAME_NOT_FOUND', 'Game not found.')

    const validatedAttributes = validateAttributes(game.attributeSchema, inputAttributes)
    if (!validatedAttributes.ok) return validatedAttributes

    let slug = withSuffix(title)
    for (let attempt = 0; attempt < 5; attempt++) {
      if (!(await accountRepo.findBySlugAny(slug))) break
      slug = withSuffix(title)
    }
    if (await accountRepo.findBySlugAny(slug))
      return fail('SLUG_UNAVAILABLE', 'Account slug conflicts; try another title.')

    const row = await accountRepo.create({
      slug,
      gameId,
      title: title,
      description: description ?? null,
      price: price.toString(),
      attributes: validatedAttributes.data,
      adminId: session.userId,
    })
    await auditService.log(session.userId, 'account.create', `account:${row.id}`, { slug: row.slug })
    return { ok: true as const, id: row.id.toString(), slug: row.slug, status: row.status }
  },

  async update(input: AccountUpdateInput) {
    const session = await requirePermission('account:write')
    if (isError(session)) return session
    const parsed = parseInput(accountUpdateSchema, input)
    if (!parsed.ok) return parsed
    const { id, gameId, title, description, price, attributes: inputAttributes } = parsed.data

    const existing = await accountRepo.findById(id)
    if (!existing || existing.deletedAt) return fail('ACCOUNT_NOT_FOUND', 'Account not found.')
    if (existing.status === 'RESERVED')
      return fail('ACCOUNT_LOCKED', 'This account is reserved; editing is blocked until the transaction finishes.')

    let newAttributes = inputAttributes
    let gameSchema = existing.game.attributeSchema
    if (gameId && gameId !== existing.game.id) {
      const game = await gameRepo.findById(gameId)
      if (!game) return fail('GAME_NOT_FOUND', 'Game not found.')
      gameSchema = game.attributeSchema
      newAttributes = inputAttributes ?? (existing.attributes as Record<string, string | number | boolean>)
    }

    let normalized: Prisma.InputJsonValue | undefined
    if (newAttributes !== undefined) {
      const validatedAttributes = validateAttributes(gameSchema, newAttributes)
      if (!validatedAttributes.ok) return validatedAttributes
      normalized = validatedAttributes.data
    }

    const updated = await accountRepo.updateFields(id, {
      ...(gameId ? { gameId } : {}),
      ...(title ? { title: title } : {}),
      ...(description !== undefined ? { description: description } : {}),
      ...(price ? { price: price.toString() } : {}),
      ...(normalized ? { attributes: normalized } : {}),
    })
    if (!updated) return fail('ACCOUNT_LOCKED', 'Account status changed; edit cancelled.')
    await auditService.log(session.userId, 'account.update', `account:${id}`, { fields: Object.keys(parsed.data) })
    return { ok: true as const }
  },

  /** Write-only credentials — never returned by any read path. */
  async setCredentials(input: AccountCredentialsInput) {
    const session = await requirePermission('credential:write')
    if (isError(session)) return session
    const parsed = parseInput(accountCredentialsSchema, input)
    if (!parsed.ok) return parsed
    const { id, credentials } = parsed.data

    const existing = await accountRepo.findById(id)
    if (!existing || existing.deletedAt) return fail('ACCOUNT_NOT_FOUND', 'Account not found.')
    if (existing.status === 'RESERVED' || existing.status === 'SOLD')
      return fail('CREDENTIALS_FORBIDDEN', 'Credentials cannot be changed while the account is RESERVED/SOLD.')

    const encrypted = encryptString(credentials, accountAad(id))
    const saved = await accountRepo.setCredentials(id, encrypted.ciphertext, encrypted.keyVersion)
    if (!saved)
      return fail('CREDENTIALS_FORBIDDEN', 'Credentials cannot be changed while the account is RESERVED/SOLD.')

    await auditService.log(session.userId, 'account.credentials', `account:${id}`)
    return { ok: true as const }
  },

  async delist(input: { id: string }) {
    const session = await requirePermission('account:write')
    if (isError(session)) return session
    const parsed = parseInput(accountIdSchema, input)
    if (!parsed.ok) return parsed

    const existing = await accountRepo.findById(parsed.data.id)
    if (!existing || existing.deletedAt) return fail('ACCOUNT_NOT_FOUND', 'Account not found.')
    if (existing.status !== 'AVAILABLE')
      return fail('STATUS_INVALID', 'Only AVAILABLE accounts can be delisted.')

    await accountRepo.transition(parsed.data.id, 'AVAILABLE', 'DELISTED')
    await auditService.log(session.userId, 'account.delist', `account:${parsed.data.id}`)
    return { ok: true as const }
  },

  async relist(input: { id: string }) {
    const session = await requirePermission('account:write')
    if (isError(session)) return session
    const parsed = parseInput(accountIdSchema, input)
    if (!parsed.ok) return parsed

    const existing = await accountRepo.findById(parsed.data.id)
    if (!existing || existing.deletedAt) return fail('ACCOUNT_NOT_FOUND', 'Account not found.')
    if (existing.status !== 'DELISTED')
      return fail('STATUS_INVALID', 'Only DELISTED accounts can be relisted.')
    if (!existing.credentialsEncrypted)
      return fail('CREDENTIALS_MISSING', 'Fill in credentials before relisting.')

    await accountRepo.transition(parsed.data.id, 'DELISTED', 'AVAILABLE', { listedAt: realClock.now() })
    await auditService.log(session.userId, 'account.relist', `account:${parsed.data.id}`)
    return { ok: true as const }
  },

  /** SOLD → AVAILABLE after a refund; a new credential is mandatory. */
  async restore(input: AccountRestoreInput) {
    const session = await requirePermission('account:write')
    if (isError(session)) return session
    const credential = await requirePermission('credential:write')
    if (isError(credential)) return credential
    const parsed = parseInput(accountRestoreSchema, input)
    if (!parsed.ok) return parsed

    const existing = await accountRepo.findById(parsed.data.id)
    if (!existing || existing.deletedAt) return fail('ACCOUNT_NOT_FOUND', 'Account not found.')
    if (existing.status !== 'SOLD')
      return fail('STATUS_INVALID', 'Only SOLD accounts can be restored.')

    const credentials = parsed.data.credentials
    const encrypted = encryptString(credentials, accountAad(parsed.data.id))
    const restored = await accountRepo.restore(
      parsed.data.id,
      encrypted.ciphertext,
      encrypted.keyVersion,
      realClock.now(),
    )
    if (!restored) return fail('STATUS_INVALID', 'Account status changed; restore cancelled.')

    await auditService.log(session.userId, 'account.restore', `account:${parsed.data.id}`)
    return { ok: true as const }
  },

  /** Soft delete — only DELISTED rows; SOLD keeps its transaction history. */
  async delete(input: { id: string }) {
    const session = await requirePermission('account:write')
    if (isError(session)) return session
    const parsed = parseInput(accountIdSchema, input)
    if (!parsed.ok) return parsed

    const existing = await accountRepo.findById(parsed.data.id)
    if (!existing || existing.deletedAt) return fail('ACCOUNT_NOT_FOUND', 'Account not found.')
    if (existing.status !== 'DELISTED')
      return fail('STATUS_INVALID', 'Accounts can only be deleted while DELISTED.')

    const deleted = await accountRepo.softDelete(parsed.data.id, realClock.now())
    if (!deleted) return fail('STATUS_INVALID', 'Account status changed; delete cancelled.')
    await auditService.log(session.userId, 'account.delete', `account:${parsed.data.id}`)
    return { ok: true as const }
  },

  /* --------------------------------------------------------------- photos */

  async uploadPhoto(input: { accountId: string; file: File }) {
    const session = await requirePermission('account:write')
    if (isError(session)) return session
    const parsed = parseInput(accountIdSchema, { id: input.accountId })
    if (!parsed.ok) return parsed

    const account = await accountRepo.findById(parsed.data.id)
    if (!account || account.deletedAt) return fail('ACCOUNT_NOT_FOUND', 'Account not found.')

    const cap = await photoCapError(parsed.data.id)
    if (cap) return cap

    let url: string
    try {
      url = await saveAccountPhoto(input.file, input.accountId)
    } catch (error) {
      return fail('PHOTO_INVALID', error instanceof Error ? error.message : 'Invalid photo.')
    }

    let photo: { id: bigint }
    try {
      const order = await accountRepo.nextPhotoOrder(parsed.data.id)
      photo = await accountRepo.addPhoto(parsed.data.id, url, order)
    } catch {
      await deleteAccountPhoto(url)
      return fail('PHOTO_SAVE_FAILED', 'Failed to save the photo. Try again.')
    }

    await auditService.log(session.userId, 'account.photo-add', `account:${parsed.data.id}`, {
      fotoId: photo.id.toString(),
      sumber: 'upload',
    })
    return { ok: true as const, id: photo.id.toString(), url }
  },

  async addPhoto(input: PhotoAddInput) {
    const session = await requirePermission('account:write')
    if (isError(session)) return session
    const parsed = parseInput(photoAddSchema, input)
    if (!parsed.ok) return parsed
    if (!isPhotoDomainAllowed(parsed.data.url))
      return fail('PHOTO_DOMAIN_NOT_ALLOWED', 'Photo domain is not in the whitelist.')

    const account = await accountRepo.findById(parsed.data.accountId)
    if (!account || account.deletedAt) return fail('ACCOUNT_NOT_FOUND', 'Account not found.')

    const local = parseLocalPhotoPath(parsed.data.url)
    if (local && local.accountId !== parsed.data.accountId.toString())
      return fail('PHOTO_INVALID', 'The photo path does not belong to this account.')

    const cap = await photoCapError(parsed.data.accountId)
    if (cap) return cap

    const order = parsed.data.order ?? (await accountRepo.nextPhotoOrder(parsed.data.accountId))
    const photo = await accountRepo.addPhoto(parsed.data.accountId, parsed.data.url, order)
    await auditService.log(session.userId, 'account.photo-add', `account:${parsed.data.accountId}`, {
      fotoId: photo.id.toString(),
    })
    return { ok: true as const, id: photo.id.toString() }
  },

  async removePhoto(input: PhotoRemoveInput) {
    const session = await requirePermission('account:write')
    if (isError(session)) return session
    const parsed = parseInput(photoRemoveSchema, input)
    if (!parsed.ok) return parsed

    const account = await accountRepo.findById(parsed.data.accountId)
    const url = account?.photos.find((photo) => photo.id === parsed.data.fotoId)?.url

    const removed = await accountRepo.softDeletePhoto(
      parsed.data.accountId,
      parsed.data.fotoId,
      realClock.now(),
    )
    if (!removed) return fail('PHOTO_NOT_FOUND', 'Photo not found.')
    if (url) await deleteAccountPhoto(url)
    await auditService.log(session.userId, 'account.photo-remove', `account:${parsed.data.accountId}`, {
      fotoId: parsed.data.fotoId.toString(),
    })
    return { ok: true as const }
  },

  async reorderPhotos(input: PhotoReorderInput) {
    const session = await requirePermission('account:write')
    if (isError(session)) return session
    const parsed = parseInput(photoReorderSchema, input)
    if (!parsed.ok) return parsed

    const activeIds = new Set((await accountRepo.listActivePhotoIds(parsed.data.accountId)).map(String))
    for (const photo of parsed.data.photos) {
      if (!activeIds.has(photo.id.toString()))
        return fail('PHOTO_NOT_FOUND', 'One of the photos does not belong to this account.')
    }

    await accountRepo.reorderPhotos(
      parsed.data.accountId,
      parsed.data.photos.map((photo) => ({ id: photo.id, order: photo.order })),
    )
    await auditService.log(session.userId, 'account.photo-order', `account:${parsed.data.accountId}`)
    return { ok: true as const }
  },

  /* --------------------------------------------- internal transitions */

  /** AVAILABLE → RESERVED (checkout). Atomic; false = someone else won. */
  reserve(id: bigint): Promise<boolean> {
    return accountRepo.transition(id, 'AVAILABLE', 'RESERVED')
  },

  /** RESERVED → AVAILABLE (expired/failed/cancelled transaction). */
  release(id: bigint): Promise<boolean> {
    return accountRepo.transition(id, 'RESERVED', 'AVAILABLE')
  },

  /** RESERVED → SOLD (payment settled). */
  markSold(id: bigint): Promise<boolean> {
    return accountRepo.transition(id, 'RESERVED', 'SOLD')
  },
}
