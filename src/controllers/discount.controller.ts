// Server Actions for promo/voucher admin CRUD + checkout price preview (docs/API.md §5.1/§6).

'use server'

import { promotionService } from '@/src/services/promotion.service'
import { voucherService } from '@/src/services/voucher.service'
import { revalidatePromoCache } from '@/src/lib/cache/revalidate'
import type {
  DiscountListInput,
  PromotionCreateInput,
  PromotionUpdateInput,
  VoucherCreateInput,
  VoucherPreviewInput,
  VoucherUpdateInput,
} from '@/src/validation/diskon'

export async function listPromotionsAdminAction(input: DiscountListInput) {
  return promotionService.listAdmin(input)
}

export async function createPromotionAction(input: PromotionCreateInput) {
  const result = await promotionService.create(input)
  if (result.ok) await revalidatePromoCache()
  return result
}

export async function updatePromotionAction(input: PromotionUpdateInput) {
  const result = await promotionService.update(input)
  if (result.ok) await revalidatePromoCache()
  return result
}

export async function setPromoActiveAction(input: { id: string; active: boolean }) {
  const result = await promotionService.setActive(input)
  if (result.ok) await revalidatePromoCache()
  return result
}

export async function listVoucherAdminAction(input: DiscountListInput) {
  return voucherService.listAdmin(input)
}

export async function createVoucherAction(input: VoucherCreateInput) {
  return voucherService.create(input)
}

export async function updateVoucherAction(input: VoucherUpdateInput) {
  return voucherService.update(input)
}

export async function setVoucherActiveAction(input: { id: string; active: boolean }) {
  return voucherService.setActive(input)
}

export async function previewCheckoutAction(input: VoucherPreviewInput) {
  return voucherService.preview(input)
}
