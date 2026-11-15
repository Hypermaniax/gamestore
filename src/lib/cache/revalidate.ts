'use server'

// Mutation-side cache invalidation. Server Actions import these helpers and never
// call updateTag directly, so the cache stays mechanical and auditable.

import { updateTag } from 'next/cache'
import { CACHE_TAGS } from './tags'

export async function revalidateJenisGameCache(): Promise<void> {
  updateTag(CACHE_TAGS.catalogJenis)
  updateTag(CACHE_TAGS.catalogGames)
  // Deactivating a type also hides its accounts from the public catalog.
  updateTag(CACHE_TAGS.katalogAkun)
}

export async function revalidateGameCache(): Promise<void> {
  updateTag(CACHE_TAGS.catalogGames)
  // Deactivating a game also hides its accounts from the public catalog.
  updateTag(CACHE_TAGS.katalogAkun)
}

export async function revalidateKatalogCache(): Promise<void> {
  updateTag(CACHE_TAGS.katalogAkun)
}

export async function revalidatePromoCache(): Promise<void> {
  updateTag(CACHE_TAGS.promoAktif)
}

export async function revalidatePageCache(): Promise<void> {
  updateTag(CACHE_TAGS.page)
}
