// Buyer order history — lightweight list that links to the detail/payment page.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Inbox, ShoppingBag } from 'lucide-react'
import { transactionService } from '@/src/services/transaction.service'
import { StatusBadge } from '@/components/pesanan/status-badge'
import { rupiah, tanggalPendek, type PesananListItem } from '@/src/lib/pesanan'
import { PaginationLinks } from '@/components/storefront/pagination-controls'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

export const instant = false

const PAGE_SIZE = 10

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'RESERVED', label: 'Awaiting payment' },
  { value: 'PAID', label: 'Paid' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'NEEDS_REFUND', label: 'Needs refund' },
]

export default async function PesananPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status = '', page: pageParam } = await searchParams
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)
  const result = await transactionService.list({
    status: status || undefined,
    page,
    size: PAGE_SIZE,
  })
  if (!result.ok) {
    if (result.code === 'INVALID_SESSION') redirect('/login')
    return (
      <div className="mx-auto max-w-2xl px-5 pb-24 pt-16 text-center">
        <h1 className="font-display text-3xl font-bold">Orders could not be loaded</h1>
        <p className="mt-3 text-sm text-muted-foreground">{result.message}</p>
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(result.data.total / PAGE_SIZE))

  return (
    <div className="mx-auto max-w-[1120px] px-5 pb-20 pt-10 sm:px-8 sm:pt-14 lg:px-12">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-deep">My orders</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.055em] sm:text-5xl">
            All transactions
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Continue payment, reveal credentials, or check the status of completed orders.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex h-11 w-fit items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-brand-ink transition hover:brightness-105"
        >
          <ShoppingBag className="size-4" /> Find an account
        </Link>
      </div>

      <div className="hide-scrollbar mt-8 flex gap-2 overflow-x-auto">
        {FILTERS.map((filter) => {
          const active = status === filter.value
          return (
            <Link
              key={filter.value}
              href={filter.value ? `/orders?status=${filter.value}` : '/orders'}
              className={`flex shrink-0 items-center rounded-full px-4 py-2.5 text-xs font-bold transition ${
                active
                  ? 'bg-foreground text-background'
                  : 'border border-border hover:border-foreground/30'
              }`}
            >
              {filter.label}
            </Link>
          )
        })}
      </div>

      <p className="mb-5 mt-6 text-xs font-semibold text-muted-foreground">
        {result.data.total.toLocaleString('id-ID')} orders
        {status ? ` · ${FILTERS.find((filter) => filter.value === status)?.label ?? status}` : ''}
      </p>

      {result.data.items.length ? (
        <div className="space-y-3">
          {result.data.items.map((item: PesananListItem) => (
            <Link
              key={item.code}
              href={`/orders/${item.code}`}
              className="group flex flex-col justify-between gap-4 rounded-[24px] border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(20,28,30,.09)] sm:flex-row sm:items-center sm:p-6"
            >
              <div className="flex min-w-0 items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand/20 text-brand-deep">
                  <Inbox className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.status} />
                    <span className="font-mono text-[10px] text-muted-foreground">{item.code}</span>
                  </div>
                  <h2 className="mt-2 truncate font-display text-lg font-bold tracking-tight">
                    {item.account.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tanggalPendek(item.createdAt)}
                    {item.payment[0]
                      ? ` · ${item.payment[0].method} ${item.payment[0].status}`
                      : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-5 sm:justify-end">
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-semibold text-muted-foreground">Total</p>
                  <p className="mt-0.5 font-display text-lg font-bold">{rupiah(item.total)}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-full border border-border text-muted-foreground transition group-hover:border-brand group-hover:bg-brand group-hover:text-brand-ink">
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty className="rounded-[26px] border border-dashed border-border py-20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle className="font-display text-xl font-bold">No orders yet</EmptyTitle>
            <EmptyDescription>Accounts you buy will appear here.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-full bg-brand px-5 text-sm font-bold text-brand-ink"
            >
              Browse catalog
            </Link>
          </EmptyContent>
        </Empty>
      )}

      <PaginationLinks
        page={result.data.page}
        totalPages={totalPages}
        basePath="/orders"
        query={{ status: status || undefined }}
      />
    </div>
  )
}
