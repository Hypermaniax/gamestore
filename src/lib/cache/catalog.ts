// Cached public catalog readers — safe to call from server components. Mutations
// invalidate through src/lib/cache/revalidate.ts.

import { cacheLife, cacheTag } from 'next/cache'
import { catalogService } from '../../services/catalog.service'
import { accountService } from '../../services/account.service'
import { promotionService } from '../../services/promotion.service'
import { CACHE_TAGS } from './tags'
import type { CatalogQueryInput } from '../../validation/catalog'

export async function getGameTypesCached() {
  'use cache'
  cacheLife('hours')
  cacheTag(CACHE_TAGS.catalogJenis)
  return catalogService.listGameTypesPublic()
}

export async function getGamesCached() {
  'use cache'
  cacheLife('hours')
  cacheTag(CACHE_TAGS.catalogGames)
  return catalogService.listGamesPublic()
}

export async function getGameCached(code: string) {
  'use cache'
  cacheLife('hours')
  cacheTag(CACHE_TAGS.catalogGames)
  return catalogService.getGamePublic(code)
}

export async function getKatalogCached(query: CatalogQueryInput) {
  'use cache'
  cacheLife('minutes')
  cacheTag(CACHE_TAGS.katalogAkun)
  return accountService.listPublic(query)
}

export async function getAkunBySlugCached(slug: string) {
  'use cache'
  cacheLife('minutes')
  cacheTag(CACHE_TAGS.katalogAkun)
  return accountService.getBySlug(slug)
}

export async function getPromoAktifCached() {
  'use cache'
  cacheLife('minutes')
  cacheTag(CACHE_TAGS.promoAktif)
  return promotionService.listActive()
}
