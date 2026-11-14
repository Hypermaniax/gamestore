import { cacheLife, cacheTag } from 'next/cache'
import * as pageRepo from '../../repositories/page-repo'
import { CACHE_TAGS } from './tags'

export async function getPageCached(code: string) {
  'use cache'
  cacheLife('hours')
  cacheTag(CACHE_TAGS.page)
  return pageRepo.findByCode(code)
}
