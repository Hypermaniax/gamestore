// game_accounts + account_photos data access. Status changes are conditional UPDATEs so two
// admins/checkouts cannot both win the same transition. No business rules here.

import { prisma } from '../lib/prisma'
import type { Prisma } from '../../generated/client'

const publicSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  price: true,
  attributes: true,
  listedAt: true,
  game: {
    select: {
      id: true,
      code: true,
      name: true,
      type: { select: { code: true, name: true } },
    },
  },
  photos: {
    where: { deletedAt: null },
    orderBy: { order: 'asc' },
    select: { url: true, order: true },
  },
} satisfies Prisma.GameAccountSelect

const adminSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  price: true,
  attributes: true,
  status: true,
  credentialsEncrypted: true,
  listedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  version: true,
  game: { select: { id: true, code: true, name: true, attributeSchema: true } },
  photos: {
    where: { deletedAt: null },
    orderBy: { order: 'asc' },
    select: { id: true, url: true, order: true },
  },
} satisfies Prisma.GameAccountSelect

export type PublicFilter = {
  typeCode?: string
  gameCode?: string
  minPrice?: bigint
  maxPrice?: bigint
  ids?: bigint[]
  sort: 'terbaru' | 'termurah' | 'termahal'
  skip: number
  take: number
}

function publicWhere(filter: PublicFilter): Prisma.GameAccountWhereInput {
  const game: Prisma.GameWhereInput = {}
  if (filter.typeCode) game.type = { code: filter.typeCode }
  if (filter.gameCode) game.code = filter.gameCode

  return {
    status: 'AVAILABLE',
    deletedAt: null,
    ...(Object.keys(game).length > 0 ? { game } : {}),
    ...(filter.minPrice !== undefined || filter.maxPrice !== undefined
      ? {
          price: {
            ...(filter.minPrice !== undefined ? { gte: filter.minPrice.toString() } : {}),
            ...(filter.maxPrice !== undefined ? { lte: filter.maxPrice.toString() } : {}),
          },
        }
      : {}),
    ...(filter.ids ? { id: { in: filter.ids } } : {}),
  }
}

function publicOrder(sort: PublicFilter['sort']): Prisma.GameAccountOrderByWithRelationInput[] {
  if (sort === 'termurah') return [{ price: 'asc' }, { id: 'desc' }]
  if (sort === 'termahal') return [{ price: 'desc' }, { id: 'desc' }]
  return [{ listedAt: 'desc' }, { id: 'desc' }]
}

export function listPublic(filter: PublicFilter) {
  return prisma.gameAccount.findMany({
    where: publicWhere(filter),
    orderBy: publicOrder(filter.sort),
    skip: filter.skip,
    take: filter.take,
    select: publicSelect,
  })
}

export function countPublic(filter: Omit<PublicFilter, 'sort' | 'skip' | 'take'>) {
  return prisma.gameAccount.count({ where: publicWhere({ ...filter, sort: 'terbaru', skip: 0, take: 0 }) })
}

export function findBySlugPublic(slug: string) {
  return prisma.gameAccount.findFirst({
    where: { slug, status: 'AVAILABLE', deletedAt: null },
    select: publicSelect,
  })
}

/** Checkout needs the internal id and game id, never exposed by the public serializer. */
export function findForCheckoutBySlug(slug: string) {
  return prisma.gameAccount.findFirst({
    where: { slug, status: 'AVAILABLE', deletedAt: null },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      price: true,
      attributes: true,
      game: {
        select: {
          id: true,
          code: true,
          name: true,
          attributeSchema: true,
          type: { select: { code: true, name: true } },
        },
      },
      photos: {
        where: { deletedAt: null },
        orderBy: { order: 'asc' },
        select: { url: true },
      },
    },
  })
}

/** Full-text prefilter using the generated `cari` tsvector + GIN index. */
export async function searchIds(q: string): Promise<bigint[]> {
  const rows = await prisma.$queryRaw<{ id: bigint }[]>`
    SELECT id FROM game_accounts
    WHERE search_vector @@ plainto_tsquery('simple', ${q})
      AND status = 'AVAILABLE'
      AND deleted_at IS NULL
    ORDER BY id DESC
    LIMIT 500
  `
  return rows.map((row) => row.id)
}

/* ------------------------------------------------------------ admin */

export type AdminFilter = {
  q?: string
  gameId?: bigint
  status?: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'DELISTED'
  skip: number
  take: number
}

function adminWhere(filter: Omit<AdminFilter, 'skip' | 'take'>): Prisma.GameAccountWhereInput {
  return {
    deletedAt: null,
    ...(filter.q
      ? {
          OR: [
            { title: { contains: filter.q, mode: 'insensitive' } },
            { slug: { contains: filter.q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(filter.gameId ? { gameId: filter.gameId } : {}),
    ...(filter.status ? { status: filter.status } : {}),
  }
}

export function listAdmin(filter: AdminFilter) {
  return prisma.gameAccount.findMany({
    where: adminWhere(filter),
    orderBy: { id: 'desc' },
    skip: filter.skip,
    take: filter.take,
    select: adminSelect,
  })
}

export function countAdmin(filter: Omit<AdminFilter, 'skip' | 'take'>) {
  return prisma.gameAccount.count({ where: adminWhere(filter) })
}

export async function countAdminByStatus(filter: Omit<AdminFilter, 'status' | 'skip' | 'take'>) {
  const rows = await prisma.gameAccount.groupBy({
    by: ['status'],
    where: adminWhere({ ...filter, status: undefined }),
    _count: { _all: true },
  })
  return rows.map((row) => ({ status: row.status, total: row._count._all }))
}

export function findById(id: bigint) {
  return prisma.gameAccount.findUnique({ where: { id }, select: adminSelect })
}

export function listTitlesByIds(ids: bigint[]) {
  if (ids.length === 0) return Promise.resolve([])
  return prisma.gameAccount.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true },
  })
}

export function findBySlugAny(slug: string) {
  return prisma.gameAccount.findUnique({ where: { slug }, select: { id: true } })
}

/* --------------------------------------------------------- mutations */

export function create(data: {
  slug: string
  gameId: bigint
  title: string
  description: string | null
  price: string
  attributes: Prisma.InputJsonValue
  adminId: bigint
}) {
  return prisma.gameAccount.create({
    data: { ...data, status: 'DELISTED' },
    select: { id: true, slug: true, status: true },
  })
}

export async function updateFields(
  id: bigint,
  data: Partial<{
    gameId: bigint
    title: string
    description: string | null
    price: string
    attributes: Prisma.InputJsonValue
  }>,
): Promise<boolean> {
  const result = await prisma.gameAccount.updateMany({
    where: { id, deletedAt: null, status: { not: 'RESERVED' } },
    data: { ...data, version: { increment: 1 } },
  })
  return result.count === 1
}

/**
 * Write-only credentials: conditional update rejects RESERVED/SOLD and deleted rows
 * at the database level, even if the service check races.
 */
export async function setCredentials(
  id: bigint,
  ciphertext: Uint8Array<ArrayBuffer>,
  keyVersion: string,
): Promise<boolean> {
  const result = await prisma.gameAccount.updateMany({
    where: { id, deletedAt: null, status: { notIn: ['RESERVED', 'SOLD'] } },
    data: {
      credentialsEncrypted: ciphertext,
      keyVersion,
      version: { increment: 1 },
    },
  })
  return result.count === 1
}

/** Conditional state transition: only one writer can move `from → to`. */
export async function transition(
  id: bigint,
  from: string,
  to: string,
  extra: Prisma.GameAccountUpdateManyMutationInput = {},
): Promise<boolean> {
  const result = await prisma.gameAccount.updateMany({
    where: { id, status: from, deletedAt: null },
    data: { ...extra, status: to, version: { increment: 1 } },
  })
  return result.count === 1
}

/** SOLD → AVAILABLE after refund: a brand-new credential is mandatory. */
export async function restore(
  id: bigint,
  ciphertext: Uint8Array<ArrayBuffer>,
  keyVersion: string,
  at: Date,
): Promise<boolean> {
  const result = await prisma.gameAccount.updateMany({
    where: { id, status: 'SOLD', deletedAt: null },
    data: {
      status: 'AVAILABLE',
      credentialsEncrypted: ciphertext,
      keyVersion,
      listedAt: at,
      version: { increment: 1 },
    },
  })
  return result.count === 1
}

export async function softDelete(id: bigint, at: Date): Promise<boolean> {
  const result = await prisma.gameAccount.updateMany({
    where: { id, status: 'DELISTED', deletedAt: null },
    data: { deletedAt: at, version: { increment: 1 } },
  })
  return result.count === 1
}

/* ------------------------------------------------------------- foto */

export function countActivePhotos(accountId: bigint): Promise<number> {
  return prisma.accountPhoto.count({ where: { accountId: accountId, deletedAt: null } })
}

export function nextPhotoOrder(accountId: bigint): Promise<number> {
  return prisma.accountPhoto
    .aggregate({ where: { accountId: accountId, deletedAt: null }, _max: { order: true } })
    .then((row) => (row._max.order ?? -1) + 1)
}

export function addPhoto(accountId: bigint, url: string, order: number) {
  return prisma.accountPhoto.create({
    data: { accountId: accountId, url, order: order },
    select: { id: true, url: true, order: true },
  })
}

export async function softDeletePhoto(accountId: bigint, photoId: bigint, at: Date): Promise<boolean> {
  const result = await prisma.accountPhoto.updateMany({
    where: { id: photoId, accountId: accountId, deletedAt: null },
    data: { deletedAt: at },
  })
  return result.count === 1
}

export async function reorderPhotos(accountId: bigint, photos: { id: bigint; order: number }[]) {
  await prisma.$transaction(
    photos.map((photo) =>
      prisma.accountPhoto.updateMany({
        where: { id: photo.id, accountId: accountId, deletedAt: null },
        data: { order: photo.order },
      }),
    ),
  )
}

export async function listActivePhotoIds(accountId: bigint): Promise<bigint[]> {
  const rows = await prisma.accountPhoto.findMany({
    where: { accountId: accountId, deletedAt: null },
    select: { id: true },
  })
  return rows.map((row) => row.id)
}
