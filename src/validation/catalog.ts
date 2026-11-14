// Catalog action contracts — master data, accounts, credentials, photos, browse.
// Shared by Server Actions and client forms; BigInt ids arrive as decimal strings.

import { z } from 'zod'
import { bigintIdSchema, requiredStringSchema } from './common'
import { parseLocalPhotoPath } from '../lib/photo'

const codeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{2,50}$/, 'Code must be 2–50 characters: lowercase letters, numbers, hyphens.')

const priceSchema = z
  .union([
    z.string().trim().regex(/^\d{1,14}$/, 'Price must be a positive whole number.'),
    z.number().int().positive().max(99_999_999_999_999, 'Price is too large.'),
  ])
  .transform((value) => BigInt(value))

const photoUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => {
    if (parseLocalPhotoPath(value)) return true
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }, 'Invalid photo URL.')

export const attributeFieldSchema = z
  .object({
    kunci: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{1,30}$/, 'Invalid attribute key.'),
    label: z.string().trim().min(1, 'Attribute label is required.').max(60),
    tipe: z.enum(['teks', 'angka', 'pilihan', 'teks_panjang']),
    wajib: z.boolean().default(false),
    opsi: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
  })
  .superRefine((field, ctx) => {
    if (field.tipe === 'pilihan' && (!field.opsi || field.opsi.length === 0)) {
      ctx.addIssue({ code: 'custom', message: `Attribute "${field.kunci}" needs a list of options.` })
    }
  })

export const attributeSchema = z
  .array(attributeFieldSchema)
  .max(30, 'Maximum 30 attributes per game.')
  .superRefine((fields, ctx) => {
    const seen = new Set<string>()
    for (const field of fields) {
      if (seen.has(field.kunci)) {
        ctx.addIssue({ code: 'custom', message: `Duplicate attribute key "${field.kunci}".` })
      }
      seen.add(field.kunci)
    }
  })

export const attributeValueSchema = z.record(
  z.string(),
  z.union([z.string().max(2000), z.number(), z.boolean()]),
)

/* ---------------------------------------------------------------- master */

export const gameTypeCreateSchema = z.object({
  code: codeSchema,
  name: requiredStringSchema('Type name is required.').max(100),
  order: z.coerce.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
})

export const gameTypeUpdateSchema = z.object({
  id: bigintIdSchema,
  code: codeSchema.optional(),
  name: requiredStringSchema('Type name is required.').max(100).optional(),
  order: z.coerce.number().int().min(0).max(9999).optional(),
  active: z.boolean().optional(),
})

export const gameCreateSchema = z.object({
  code: codeSchema,
  name: requiredStringSchema('Game name is required.').max(100),
  typeId: bigintIdSchema,
  iconUrl: z.string().trim().max(500).pipe(z.url('Invalid icon URL.')).optional(),
  attributeSchema: attributeSchema.default([]),
  active: z.boolean().default(true),
})

export const gameUpdateSchema = z.object({
  id: bigintIdSchema,
  code: codeSchema.optional(),
  name: requiredStringSchema('Game name is required.').max(100).optional(),
  typeId: bigintIdSchema.optional(),
  iconUrl: z.string().trim().max(500).pipe(z.url('Invalid icon URL.')).nullable().optional(),
  attributeSchema: attributeSchema.optional(),
  active: z.boolean().optional(),
})

/* ---------------------------------------------------------------- akun */

export const accountCreateSchema = z.object({
  gameId: bigintIdSchema,
  title: requiredStringSchema('Title is required.').max(200),
  description: z.string().trim().max(5000).optional(),
  price: priceSchema,
  attributes: attributeValueSchema.default({}),
})

export const accountUpdateSchema = z.object({
  id: bigintIdSchema,
  gameId: bigintIdSchema.optional(),
  title: requiredStringSchema('Title is required.').max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  price: priceSchema.optional(),
  attributes: attributeValueSchema.optional(),
})

export const accountCredentialsSchema = z.object({
  id: bigintIdSchema,
  credentials: requiredStringSchema('Credentials are required.').max(5000),
})

export const accountRestoreSchema = z.object({
  id: bigintIdSchema,
  credentials: requiredStringSchema('New credentials are required.').max(5000),
})

export const accountIdSchema = z.object({ id: bigintIdSchema })

export const accountListAdminSchema = z.object({
  q: z.string().trim().max(100).optional(),
  gameId: bigintIdSchema.optional(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'SOLD', 'DELISTED']).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
})

/* --------------------------------------------------------------- foto */

export const photoAddSchema = z.object({
  accountId: bigintIdSchema,
  url: photoUrlSchema,
  order: z.coerce.number().int().min(0).max(999).optional(),
})

export const photoRemoveSchema = z.object({
  accountId: bigintIdSchema,
  fotoId: bigintIdSchema,
})

export const photoReorderSchema = z.object({
  accountId: bigintIdSchema,
  photos: z
    .array(z.object({ id: bigintIdSchema, order: z.coerce.number().int().min(0).max(999) }))
    .min(1, 'Order list is required.')
    .max(50),
})

/* ------------------------------------------------------------- publik */

export const catalogQuerySchema = z.object({
  type: z.string().trim().max(20).optional(),
  game: z.string().trim().max(50).optional(),
  hargaMin: z.coerce.number().int().min(0).optional(),
  hargaMax: z.coerce.number().int().min(0).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['terbaru', 'termurah', 'termahal']).default('terbaru'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
})

export type GameTypeCreateInput = z.input<typeof gameTypeCreateSchema>
export type GameTypeUpdateInput = z.input<typeof gameTypeUpdateSchema>
export type GameCreateInput = z.input<typeof gameCreateSchema>
export type GameUpdateInput = z.input<typeof gameUpdateSchema>
export type AccountCreateInput = z.input<typeof accountCreateSchema>
export type AccountUpdateInput = z.input<typeof accountUpdateSchema>
export type AccountCredentialsInput = z.input<typeof accountCredentialsSchema>
export type AccountRestoreInput = z.input<typeof accountRestoreSchema>
export type AccountListAdminInput = z.input<typeof accountListAdminSchema>
export type PhotoAddInput = z.input<typeof photoAddSchema>
export type PhotoRemoveInput = z.input<typeof photoRemoveSchema>
export type PhotoReorderInput = z.input<typeof photoReorderSchema>
export type CatalogQueryInput = z.input<typeof catalogQuerySchema>
