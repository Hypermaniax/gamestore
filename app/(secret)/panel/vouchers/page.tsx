import { voucherService } from '@/src/services/voucher.service'
import { PanelPageHeader } from '@/components/panel/panel-ui'
import { TablePagination } from '@/components/panel/table-pagination'
import { VoucherAdmin } from './voucher-admin'
import { realClock } from '@/src/lib/clock'
import { parsePageSize } from '@/src/lib/pagination'

export const instant = false

export default async function PanelVouchersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; size?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const page = Math.max(1, Number(params.page ?? '1') || 1)
  const size = parsePageSize(params.size)
  const result = await voucherService.listAdmin({ q, page, size })
  if (!result.ok) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{result.message}</div>
  return (
    <div>
      <PanelPageHeader
        title="Vouchers"
        description="Create discount codes with clear limits, quotas, and expiry dates."
      />
      <VoucherAdmin
        vouchers={result.data.items}
        total={result.data.total}
        initialQuery={q}
        now={realClock.now().getTime()}
      />
      <TablePagination
        page={page}
        size={size}
        total={result.data.total}
        basePath="/panel/vouchers"
        query={{ q }}
        label="vouchers"
      />
    </div>
  )
}
