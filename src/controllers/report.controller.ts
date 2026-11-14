'use server'

import { reportService } from '@/src/services/report.service'
import type { ReportQueryInput } from '@/src/validation/laporan'

export async function salesReportAction(input: ReportQueryInput = {}) {
  return reportService.sales(input)
}

export async function salesByGameReportAction(input: ReportQueryInput = {}) {
  return reportService.salesByGame(input)
}

export async function refundReportAction(input: ReportQueryInput = {}) {
  return reportService.refunds(input)
}
