// Checkout read model — server components call this to render the confirmation
// screen. Pricing/terms are still re-checked by transactionService.checkout().

import { authService } from './auth.service'
import { settingService } from './setting.service'
import { promotionService } from './promotion.service'
import * as accountRepo from '../repositories/account-repo'
import * as pageRepo from '../repositories/page-repo'
import { toRupiah } from '../lib/diskon'
import { attributeSpecs } from '../lib/storefront-catalog'
import { checkoutSlugSchema, type CheckoutSlugInput } from '../validation/transaksi'
import { parseInput, type UnionError } from '../validation/parse'

const fail = (code: string, message: string): UnionError => ({ ok: false, code, message })

export const checkoutService = {
  async getDetailBySlug(input: CheckoutSlugInput) {
    const parsed = parseInput(checkoutSlugSchema, input)
    if (!parsed.ok) return parsed

    const account = await accountRepo.findForCheckoutBySlug(parsed.data.slug)
    if (!account)
      return fail('ACCOUNT_UNAVAILABLE', 'This account is no longer available for purchase.')

    const profile = await authService.profile()
    const user = profile.ok
      ? {
          username: profile.username,
          email: profile.email,
          emailVerified: profile.emailVerified,
        }
      : null

    const setting = await settingService.getPublic()
    const terms = await pageRepo.findByCode('terms-and-conditions')
    if (!terms) return fail('TERMS_UNAVAILABLE', 'Terms and conditions are not available yet.')

    const initialPrice = toRupiah(account.price.toString())
    const promotion = await promotionService.calculatePromo(initialPrice, account.id, account.game.id)
    const promoDiscount = toRupiah(promotion.potongan)
    const total = initialPrice - promoDiscount

    return {
      ok: true as const,
      data: {
        user,
        checkoutAktif: setting.data.checkoutAktif,
        account: {
          id: account.id.toString(),
          slug: account.slug,
          title: account.title,
          description: account.description,
          price: initialPrice.toString(),
          game: account.game.name,
          gameKode: account.game.code,
          type: account.game.type.name,
          photo: account.photos[0]?.url ?? null,
          photos: account.photos.map((photo) => photo.url),
          spesifikasi: attributeSpecs(account.attributes, account.game.attributeSchema),
        },
        promotion: promotion.promotion
          ? { name: promotion.promotion.name, potongan: promoDiscount.toString() }
          : null,
        total: total.toString(),
        syarat: {
          title: terms.title,
          version: terms.version,
          isi: terms.bodyMarkdown,
        },
      },
    }
  },

  async getBySlug(input: CheckoutSlugInput) {
    const detail = await this.getDetailBySlug(input)
    if (!detail.ok) return detail
    if (!detail.data.user)
      return fail('INVALID_SESSION', 'Your session is no longer valid. Please log in again.')
    if (!detail.data.user.emailVerified)
      return fail('EMAIL_NOT_VERIFIED', 'Verify your email before checking out.')

    return {
      ok: true as const,
      data: { ...detail.data, user: detail.data.user },
    }
  },
}
