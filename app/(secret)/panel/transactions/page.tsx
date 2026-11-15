import Link from 'next/link'
import { Search } from 'lucide-react'
import { transactionService } from '@/src/services/transaction.service'
import { rupiah, waktu } from '@/src/lib/pesanan'
import { PanelEmpty, PanelPageHeader, PanelStatus } from '@/components/panel/panel-ui'
import { TablePagination } from '@/components/panel/table-pagination'
import { Button } from '@/components/ui/button'
import { DEFAULT_PAGE_SIZE, parsePageSize } from '@/src/lib/pagination'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const instant = false

const STATUSES = [
  ['', 'All statuses'],
  ['RESERVED', 'Awaiting payment'],
  ['PAID', 'Paid'],
  ['NEEDS_REFUND', 'Needs refund'],
  ['DISPUTED', 'Disputed'],
  ['REFUNDED', 'Refunded'],
  ['EXPIRED', 'Expired'],
  ['CANCELLED', 'Cancelled'],
  ['FAILED', 'Failed'],
] as const

type StatusFilter = Exclude<(typeof STATUSES)[number][0], ''>

export default async function PanelTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; size?: string; page?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const status = (params.status === 'all' ? '' : (params.status ?? '')) as StatusFilter | ''
  const size = parsePageSize(params.size)
  const page = Math.max(1, Number(params.page ?? '1') || 1)
  const result = await transactionService.listAdmin({ q, status: status || undefined, page, size })

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {result.message}
      </div>
    )
  }

  const { items, total } = result.data

  return (
    <div>
      <PanelPageHeader
        title="Transactions"
        description="Search transactions, track status, and open details to handle refunds or disputes."
      />

      <form className="mb-4 flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
        {size !== DEFAULT_PAGE_SIZE ? <input type="hidden" name="size" value={size} /> : null}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search code, username, or buyer email"
            className="h-9 pl-8"
          />
        </div>
        <Select name="status" defaultValue={status || 'all'}>
          <SelectTrigger className="h-9 w-full sm:w-52">
            <SelectValue>
              {STATUSES.find(([value]) => value === status)?.[1] ?? 'All statuses'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(([value, label]) => (
              <SelectItem key={value || 'all'} value={value || 'all'}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" className="h-9">
          Apply
        </Button>
      </form>

      <p className="mb-3 text-sm text-muted-foreground">
        {total.toLocaleString('id-ID')} transactions found.
      </p>

      {items.length === 0 ? (
        <PanelEmpty
          title="No transactions"
          description="Try changing the keyword or status. New transactions will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-[.1em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Buyer</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((row) => (
                  <tr key={row.code} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/panel/transactions/${row.code}`} className="font-semibold hover:text-brand-deep">
                        {row.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.buyer.username}</p>
                      <p className="text-xs text-muted-foreground">{row.buyer.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-56 truncate">{row.account.title}</p>
                      <p className="text-xs text-muted-foreground">{row.account.game.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <PanelStatus status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {row.payment ? `${row.payment.method} · ${row.payment.status}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{rupiah(row.total)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{waktu(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TablePagination
        page={page}
        size={size}
        total={total}
        basePath="/panel/transactions"
        query={{ q, status }}
        label="transactions"
      />
    </div>
  )
}
