import { authService } from './auth.service'
import { rbacService } from './rbac.service'
import * as reportRepo from '../repositories/report-repo'
import { realClock } from '../lib/clock'
import { reportQuerySchema, type ReportQueryInput } from '../validation/laporan'
import { parseInput, type UnionError } from '../validation/parse'
import type { SessionClaims } from '../lib/session'

const SESSION: UnionError = { ok: false, code: 'INVALID_SESSION', message: 'Your session is no longer valid. Please log in again.' }
const FORBIDDEN: UnionError = { ok: false, code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' }
const isError = (value: SessionClaims | UnionError): value is UnionError => 'code' in value

async function requirePermission(code: string): Promise<SessionClaims | UnionError> {
  const session = await authService.verifySession()
  if (!session) return SESSION
  if (!(await rbacService.hasPermission(session.userId, code))) return FORBIDDEN
  return session
}

function jakartaDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function shiftDate(tanggal: string, hari: number): string {
  const date = new Date(`${tanggal}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + hari)
  return date.toISOString().slice(0, 10)
}

function period(input: ReportQueryInput) {
  const parsed = parseInput(reportQuerySchema, input)
  if (!parsed.ok) return parsed

  const sampai = parsed.data.sampai ?? jakartaDate(realClock.now())
  const dari = parsed.data.dari ?? shiftDate(sampai, -29)
  const from = new Date(`${dari}T00:00:00+07:00`)
  const to = new Date(`${shiftDate(sampai, 1)}T00:00:00+07:00`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to)
    return { ok: false as const, code: 'PERIOD_INVALID', message: 'Invalid report period.' }
  if (to.getTime() - from.getTime() > 366 * 86_400_000)
    return { ok: false as const, code: 'PERIOD_INVALID', message: 'Report range can be at most 366 days.' }

  return { ok: true as const, data: { dari, sampai, from, to } }
}

function money(value: bigint): string {
  return value.toString()
}

export const reportService = {
  async sales(input: ReportQueryInput = {}) {
    const session = await requirePermission('report:read')
    if (isError(session)) return session
    const range = period(input)
    if (!range.ok) return range

    const rows = await reportRepo.sales(range.data.from, range.data.to)
    const total = rows.reduce((sum, row) => sum + BigInt(row.total), BigInt(0))
    const promotion = rows.reduce((sum, row) => sum + BigInt(row.promotionDiscount), BigInt(0))
    const voucher = rows.reduce((sum, row) => sum + BigInt(row.voucherDiscount), BigInt(0))
    const amount = rows.reduce((sum, row) => sum + row.amount, 0)

    return {
      ok: true as const,
      data: {
        periode: { dari: range.data.dari, sampai: range.data.sampai },
        ringkasan: {
          jumlahTransaksi: amount,
          total: money(total),
          promotionDiscount: money(promotion),
          voucherDiscount: money(voucher),
        },
        rows,
      },
    }
  },

  async salesByGame(input: ReportQueryInput = {}) {
    const session = await requirePermission('report:read')
    if (isError(session)) return session
    const range = period(input)
    if (!range.ok) return range

    const rows = await reportRepo.salesByGame(range.data.from, range.data.to)
    const amount = rows.reduce((sum, row) => sum + row.amount, 0)
    const total = rows.reduce((sum, row) => sum + BigInt(row.total), BigInt(0))

    return {
      ok: true as const,
      data: {
        periode: { dari: range.data.dari, sampai: range.data.sampai },
        ringkasan: { jumlahTransaksi: amount, total: money(total) },
        rows,
      },
    }
  },

  async refunds(input: ReportQueryInput = {}) {
    const session = await requirePermission('report:read')
    if (isError(session)) return session
    const range = period(input)
    if (!range.ok) return range

    const rows = await reportRepo.refunds(range.data.from, range.data.to)
    const amount = rows.reduce((sum, row) => sum + row.amount, 0)
    const value = rows.reduce((sum, row) => sum + BigInt(row.value), BigInt(0))
    const fee = rows.reduce((sum, row) => sum + BigInt(row.fee), BigInt(0))

    return {
      ok: true as const,
      data: {
        periode: { dari: range.data.dari, sampai: range.data.sampai },
        ringkasan: { jumlahRefund: amount, value: money(value), fee: money(fee) },
        rows,
      },
    }
  },
}
