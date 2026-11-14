// Discount strategy — shared by promo (automatic) and voucher (code). Percent values
// are floored to whole rupiah, then capped by maks_potongan and the base price.

export type DiskonJenis = 'PERSEN' | 'NOMINAL'
export type DiskonCakupan = 'AKUN' | 'GAME' | 'SEMUA'

export type DiskonRule = {
  type: DiskonJenis
  value: string | number
  maxDiscount?: string | number | null
}

export type PromotionCandidate = DiskonRule & {
  id: bigint
  scope: DiskonCakupan
  targetId: bigint | null
}

/** Decimal(14,2) -> whole rupiah (floor). Keeps math in BigInt when possible. */
export function toRupiah(value: string | number): bigint {
  const text = typeof value === 'number' ? value.toString() : value
  return BigInt(text.split('.')[0] || '0')
}

export function hitungDiskon(hargaDasar: bigint, rule: DiskonRule): bigint {
  if (hargaDasar <= BigInt(0)) return BigInt(0)
  const value = Number(rule.value)
  if (!Number.isFinite(value) || value <= 0) return BigInt(0)

  const mentah =
    rule.type === 'PERSEN'
      ? BigInt(Math.floor((Number(hargaDasar) * value) / 100))
      : toRupiah(rule.value)

  const cap = rule.maxDiscount === undefined || rule.maxDiscount === null ? null : toRupiah(rule.maxDiscount)
  const dibatasi = cap !== null && cap < mentah ? cap : mentah
  return dibatasi > hargaDasar ? hargaDasar : dibatasi
}

export type PromotionContext = { price: bigint; accountId: bigint; gameId: bigint }

/** AKUN > GAME > SEMUA; tie-break by rupiah discount, then largest id. */
export function pilihPromo(
  candidates: PromotionCandidate[],
  ctx: PromotionContext,
): { promotion: PromotionCandidate; potongan: bigint } | null {
  const cocok = candidates
    .filter((promotion) => {
      if (promotion.scope === 'SEMUA') return true
      if (promotion.scope === 'AKUN') return promotion.targetId === ctx.accountId
      return promotion.targetId === ctx.gameId
    })
    .map((promotion) => ({
      promotion,
      potongan: hitungDiskon(ctx.price, promotion),
      spesifisitas: promotion.scope === 'AKUN' ? 3 : promotion.scope === 'GAME' ? 2 : 1,
    }))
    .filter((entry) => entry.potongan > BigInt(0))

  cocok.sort((a, b) => {
    if (a.spesifisitas !== b.spesifisitas) return b.spesifisitas - a.spesifisitas
    if (a.potongan !== b.potongan) return a.potongan > b.potongan ? -1 : 1
    return a.promotion.id > b.promotion.id ? -1 : 1
  })

  const winner = cocok[0]
  return winner ? { promotion: winner.promotion, potongan: winner.potongan } : null
}
