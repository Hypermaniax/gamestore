'use server'

import { pageService } from '@/src/services/page.service'
import { revalidatePageCache } from '@/src/lib/cache/revalidate'
import type { PageUpdateInput, PageVersionInput } from '@/src/validation/halaman'

export async function listPagesAdminAction() {
  return pageService.listAdmin()
}

export async function getPageDraftAction(input: { code: string }) {
  return pageService.getDraft(input)
}

export async function updatePageDraftAction(input: PageUpdateInput) {
  return pageService.updateDraft(input)
}

export async function publishPageAction(input: { code: string }) {
  const result = await pageService.publish(input)
  if (result.ok) await revalidatePageCache()
  return result
}

export async function listPageVersionsAction(input: { code: string }) {
  return pageService.listVersions(input)
}

export async function getPageVersionAction(input: PageVersionInput) {
  return pageService.getVersion(input)
}
