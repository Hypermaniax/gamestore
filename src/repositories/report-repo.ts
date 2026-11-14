import { prisma } from '../lib/prisma'

export type SalesRow = {
  tanggal: string
  amount: number
  total: string
  promotionDiscount: string
  voucherDiscount: string
}

export type SalesByGameRow = {
  code: string
  name: string
  amount: number
  total: string
}

export type RefundRow = {
  tanggal: string
  amount: number
  value: string
  fee: string
}

export function sales(from: Date, to: Date) {
  return prisma.$queryRaw<SalesRow[]>`
    SELECT
      to_char(paid_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS tanggal,
      COUNT(*)::int AS amount,
      COALESCE(SUM(total), 0)::text AS total,
      COALESCE(SUM(promotion_discount), 0)::text AS "promotionDiscount",
      COALESCE(SUM(voucher_discount), 0)::text AS "voucherDiscount"
    FROM transactions
    WHERE paid_at >= ${from} AND paid_at < ${to}
    GROUP BY 1
    ORDER BY 1 ASC
  `
}

export function salesByGame(from: Date, to: Date) {
  return prisma.$queryRaw<SalesByGameRow[]>`
    SELECT
      g.code AS code,
      g.name AS name,
      COUNT(*)::int AS amount,
      COALESCE(SUM(t.total), 0)::text AS total
    FROM transactions t
    JOIN game_accounts a ON a.id = t.account_id
    JOIN games g ON g.id = a.game_id
    WHERE t.paid_at >= ${from} AND t.paid_at < ${to}
    GROUP BY g.code, g.name
    ORDER BY COALESCE(SUM(t.total), 0) DESC, g.name ASC
  `
}

export function refunds(from: Date, to: Date) {
  return prisma.$queryRaw<RefundRow[]>`
    SELECT
      to_char(refunded_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS tanggal,
      COUNT(*)::int AS amount,
      COALESCE(SUM(amount), 0)::text AS value,
      COALESCE(SUM(fee), 0)::text AS fee
    FROM refunds
    WHERE refunded_at >= ${from} AND refunded_at < ${to}
    GROUP BY 1
    ORDER BY 1 ASC
  `
}
