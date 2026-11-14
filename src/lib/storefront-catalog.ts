// Maps public catalog rows to the storefront's view model. Keeps pricing,
// attribute labels, and category counts out of the client components.

import { pilihPromo, toRupiah, type DiskonCakupan, type DiskonJenis } from './diskon'

export const ALL_CATEGORY = 'semua'

export type StorefrontSort = 'terbaru' | 'termurah' | 'termahal'

export const STOREFRONT_SORTS = [
  { value: 'terbaru', label: 'Recommended' },
  { value: 'termurah', label: 'Lowest price' },
  { value: 'termahal', label: 'Highest price' },
] as const satisfies readonly { value: StorefrontSort; label: string }[]

export type StorefrontAccount = {
  slug: string
  title: string
  game: string
  gameKode: string
  type: string
  jenisKode: string
  detail: string
  price: number
  originalPrice: number | null
  promoName: string | null
  image: string | null
  specs: string[]
  listedAt: string | null
}

export type StorefrontCategory = {
  code: string
  name: string
  count: number
}

export type StorefrontCatalog = {
  accounts: StorefrontAccount[]
  categories: StorefrontCategory[]
  total: number
}

type AttributeField = {
  kunci: string
  label: string
  tipe: string
}

type PublicAccount = {
  id: string
  slug: string
  title: string
  description: string | null
  price: string
  attributes: unknown
  listedAt: string | null
  game: { id: string; code: string; name: string }
  type: { code: string; name: string }
  photos: string[]
}

type StorefrontPromo = {
  id: string
  name: string
  type: DiskonJenis
  value: string
  maxDiscount: string | null
  scope: DiskonCakupan
  targetId: string | null
}

type PublicGame = {
  code: string
  attributeSchema: unknown
}

type PublicJenis = {
  code: string
  name: string
}

export function formatPrice(price: number): string {
  return `Rp${price.toLocaleString('id-ID')}`
}

export function attributeSchema(value: unknown): AttributeField[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((field) => {
    if (!field || typeof field !== 'object') return []
    const row = field as Record<string, unknown>
    if (typeof row.kunci !== 'string' || typeof row.label !== 'string') return []
    return [{ kunci: row.kunci, label: row.label, tipe: String(row.tipe ?? 'teks') }]
  })
}

function attributeValue(value: unknown, tipe: string): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString('id-ID')
  if (tipe === 'angka' && typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value).toLocaleString('id-ID')
  }
  return String(value)
}

export function buildSpecs(attributes: unknown, schema: AttributeField[]): string[] {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return []
  const values = attributes as Record<string, unknown>

  const fields =
    schema.length > 0
      ? schema
      : Object.keys(values).map((kunci) => ({
          kunci,
          label: kunci.replaceAll('_', ' ').replace(/^\w/, (char) => char.toUpperCase()),
          tipe: typeof values[kunci] === 'number' ? 'angka' : 'teks',
        }))

  return fields.flatMap((field) => {
    const value = values[field.kunci]
    if (value === undefined || value === null || value === '') return []
    return [`${field.label}: ${attributeValue(value, field.tipe)}`]
  })
}

function shortDescription(description: string | null, specs: string[]): string {
  if (description?.trim()) {
    const clean = description.replace(/\s+/g, ' ').trim()
    return clean.length > 78 ? `${clean.slice(0, 75)}…` : clean
  }
  return specs.slice(0, 2).join(' · ')
}

export function buildStorefrontCatalog({
  accounts,
  games,
  type,
  promos,
  total,
  categories,
}: {
  accounts: PublicAccount[]
  games: PublicGame[]
  type: PublicJenis[]
  promos: StorefrontPromo[]
  total: number
  categories?: StorefrontCategory[]
}): StorefrontCatalog {
  const schemaByGame = new Map(
    games.map((game) => [game.code, attributeSchema(game.attributeSchema)]),
  )
  const promoNameById = new Map(promos.map((promotion) => [promotion.id, promotion.name]))
  const candidates = promos.map((promotion) => ({
    id: BigInt(promotion.id),
    name: promotion.name,
    type: promotion.type,
    value: promotion.value,
    maxDiscount: promotion.maxDiscount,
    scope: promotion.scope,
    targetId: promotion.targetId === null ? null : BigInt(promotion.targetId),
  }))

  const mapped = accounts.map((account) => {
    const specs = buildSpecs(account.attributes, schemaByGame.get(account.game.code) ?? [])
    const initialPrice = toRupiah(account.price)
    const winner = pilihPromo(candidates, {
      price: initialPrice,
      accountId: BigInt(account.id),
      gameId: BigInt(account.game.id),
    })
    const hargaAkhir = winner ? initialPrice - winner.potongan : initialPrice

    return {
      slug: account.slug,
      title: account.title,
      game: account.game.name,
      gameKode: account.game.code,
      type: account.type.name,
      jenisKode: account.type.code,
      detail: shortDescription(account.description, specs),
      price: Number(hargaAkhir),
      originalPrice: winner ? Number(initialPrice) : null,
      promoName: winner ? (promoNameById.get(winner.promotion.id.toString()) ?? null) : null,
      image: account.photos[0] ?? null,
      specs,
      listedAt: account.listedAt,
    } satisfies StorefrontAccount
  })

  const counts = new Map<string, number>()
  for (const account of mapped) {
    counts.set(account.jenisKode, (counts.get(account.jenisKode) ?? 0) + 1)
  }

  return {
    accounts: mapped,
    categories:
      categories ??
      [
        { code: ALL_CATEGORY, name: 'All', count: mapped.length },
        ...type.map((item) => ({
          code: item.code,
          name: item.name,
          count: counts.get(item.code) ?? 0,
        })),
      ],
    total,
  }
}


/** Format account attributes for checkout using the game's published schema. */
export function attributeSpecs(attributes: unknown, schemaValue: unknown): string[] {
  return buildSpecs(attributes, attributeSchema(schemaValue))
}
