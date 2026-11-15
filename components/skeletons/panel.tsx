import { cn } from 'cn'
import {
  Skeleton,
  SkeletonCircle,
  SkeletonLines,
  SkeletonPage,
  SkeletonPill,
} from './base'

function PanelHeaderSkeleton({
  action = true,
  description = true,
}: {
  action?: boolean
  description?: boolean
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <Skeleton className="h-8 w-48" />
        {description ? <Skeleton className="mt-2 max-w-2xl h-3 w-80" /> : null}
      </div>
      {action ? <Skeleton className="h-8 w-32 rounded-lg" /> : null}
    </div>
  )
}

function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex h-full flex-col justify-between gap-6 rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="size-4 rounded-sm" />
          </div>
          <div>
            <Skeleton className="h-7 w-24" />
            <Skeleton className="mt-2 h-3 w-36" />
          </div>
        </div>
      ))}
    </div>
  )
}

function PaginationSkeleton() {
  return <Skeleton className="mt-4 h-14 rounded-2xl" />
}

function TableFrame({
  children,
  minWidth = 'min-w-[820px]',
}: {
  children: React.ReactNode
  minWidth?: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className={cn('w-full text-left text-sm', minWidth)}>{children}</table>
      </div>
    </div>
  )
}

function TableHead({ columns }: { columns: number }) {
  return (
    <thead className="border-b bg-muted/40">
      <tr>
        {Array.from({ length: columns }, (_, index) => (
          <th key={index} className="px-4 py-3">
            <Skeleton className="h-3 w-16" />
          </th>
        ))}
      </tr>
    </thead>
  )
}

function TableRows({
  rows = 8,
  columns,
  firstColumn = 'text',
  lastColumn = 'text',
}: {
  rows?: number
  columns: number
  firstColumn?: 'text' | 'avatar' | 'code'
  lastColumn?: 'text' | 'actions'
}) {
  return (
    <tbody className="divide-y">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <td key={columnIndex} className="px-4 py-3">
              {columnIndex === 0 && firstColumn === 'avatar' ? (
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-1.5 h-3 w-24" />
                  </div>
                </div>
              ) : columnIndex === 0 && firstColumn === 'code' ? (
                <div>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-1.5 h-3 w-16" />
                </div>
              ) : columnIndex === columns - 1 && lastColumn === 'actions' ? (
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-7 w-16 rounded-lg" />
                  <Skeleton className="h-7 w-16 rounded-lg" />
                </div>
              ) : (
                <Skeleton className="h-4 w-full max-w-28" />
              )}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

export function PanelDashboardLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading panel dashboard">
      <PanelHeaderSkeleton />
      <StatCardsSkeleton />
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-3 w-56" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
        <TableFrame minWidth="min-w-[720px]">
          <TableHead columns={6} />
          <TableRows rows={6} columns={6} firstColumn="code" />
        </TableFrame>
      </section>
    </SkeletonPage>
  )
}

export function PanelAccountsLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading accounts">
      <PanelHeaderSkeleton />
      <div className="mb-5 flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg sm:w-60" />
      </div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonPill key={index} className="w-24" />
        ))}
      </div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-16" />
      </div>

      <div className="hidden overflow-hidden rounded-2xl border bg-card xl:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <TableHead columns={6} />
            <TableRows rows={10} columns={6} firstColumn="avatar" lastColumn="actions" />
          </table>
        </div>
      </div>

      <div className="grid gap-3 xl:hidden">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="flex gap-3 rounded-2xl border bg-card p-3">
            <Skeleton className="size-14 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-4 w-40" />
                <SkeletonPill className="w-16" />
              </div>
              <Skeleton className="mt-2 h-3 w-32" />
              <div className="mt-3 flex items-end justify-between gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <PaginationSkeleton />
    </SkeletonPage>
  )
}

export function PanelTransactionsLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading transactions">
      <PanelHeaderSkeleton />
      <div className="mb-4 flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg sm:w-52" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
      <Skeleton className="mb-3 h-3 w-40" />
      <TableFrame>
        <TableHead columns={7} />
        <TableRows rows={10} columns={7} firstColumn="code" />
      </TableFrame>
      <PaginationSkeleton />
    </SkeletonPage>
  )
}

export function PanelUsersLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading users">
      <PanelHeaderSkeleton />
      <TableFrame minWidth="min-w-[880px]">
        <TableHead columns={6} />
        <TableRows rows={10} columns={6} firstColumn="code" lastColumn="actions" />
      </TableFrame>
      <PaginationSkeleton />
    </SkeletonPage>
  )
}

export function PanelGamesLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading game master">
      <PanelHeaderSkeleton />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b px-4 py-4 sm:px-5">
            <div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-2 h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>

          <div className="divide-y md:hidden">
            {Array.from({ length: 10 }, (_, index) => (
              <div key={index} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="mt-1.5 h-3 w-20" />
                      </div>
                      <SkeletonPill className="w-16" />
                    </div>
                    <Skeleton className="mt-3 h-3 w-44" />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Skeleton className="h-7 flex-1 rounded-lg" />
                  <Skeleton className="h-7 flex-1 rounded-lg" />
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] text-left text-sm">
              <TableHead columns={5} />
              <TableRows rows={8} columns={5} firstColumn="avatar" lastColumn="actions" />
            </table>
          </div>
          <div className="border-t bg-muted/20 px-4 py-3">
            <Skeleton className="h-8 w-full max-w-sm rounded-lg" />
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <section className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-start justify-between gap-3 border-b px-4 py-4">
              <div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-3 w-32" />
              </div>
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="flex items-center gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-1.5 h-3 w-16" />
                  </div>
                  <SkeletonPill className="w-16" />
                  <Skeleton className="size-7 rounded-lg" />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </SkeletonPage>
  )
}

export function PanelPromotionsLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading promotions">
      <PanelHeaderSkeleton />
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-3 w-52" />
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Skeleton className="h-9 w-full rounded-lg sm:w-64" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 px-4 pt-4 sm:px-5">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonPill key={index} className="w-24" />
          ))}
        </div>

        <div className="divide-y lg:hidden">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="px-4 py-4">
              <div className="flex items-start gap-3">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="mt-1.5 h-3 w-24" />
                    </div>
                    <SkeletonPill className="w-16" />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[920px] text-left text-sm">
            <TableHead columns={6} />
            <TableRows rows={8} columns={6} firstColumn="avatar" lastColumn="actions" />
          </table>
        </div>
      </section>
      <PaginationSkeleton />
    </SkeletonPage>
  )
}

export function PanelVouchersLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading vouchers">
      <PanelHeaderSkeleton />
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-3 w-44" />
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Skeleton className="h-9 w-full rounded-lg sm:w-64" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <TableHead columns={6} />
            <TableRows rows={8} columns={6} firstColumn="code" lastColumn="actions" />
          </table>
        </div>
      </section>
      <PaginationSkeleton />
    </SkeletonPage>
  )
}

export function PanelPagesLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading static pages">
      <PanelHeaderSkeleton />
      <TableFrame minWidth="min-w-[640px]">
        <TableHead columns={5} />
        <TableRows rows={6} columns={5} firstColumn="code" lastColumn="actions" />
      </TableFrame>
      <PaginationSkeleton />
    </SkeletonPage>
  )
}

export function PanelReportsLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading reports">
      <PanelHeaderSkeleton />
      <div className="mb-5 flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-3 w-52 sm:ml-auto" />
      </div>

      <StatCardsSkeleton />

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <section key={index} className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <TableHead columns={index === 0 ? 4 : 3} />
                <TableRows rows={5} columns={index === 0 ? 4 : 3} />
              </table>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-5 overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <TableHead columns={4} />
            <TableRows rows={5} columns={4} />
          </table>
        </div>
      </section>
    </SkeletonPage>
  )
}

export function PanelAuditLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading audit log">
      <PanelHeaderSkeleton />
      <div className="mb-4 flex max-w-xl gap-2">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
      <TableFrame minWidth="min-w-[720px]">
        <TableHead columns={5} />
        <TableRows rows={10} columns={5} />
      </TableFrame>
      <PaginationSkeleton />
    </SkeletonPage>
  )
}

export function PanelWebhooksLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading webhooks">
      <PanelHeaderSkeleton />
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
      <TableFrame minWidth="min-w-[720px]">
        <TableHead columns={6} />
        <TableRows rows={8} columns={6} lastColumn="actions" />
      </TableFrame>
      <PaginationSkeleton />
    </SkeletonPage>
  )
}

export function PanelSettingsLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading settings">
      <PanelHeaderSkeleton />
      <div className="max-w-2xl space-y-5 rounded-xl border bg-card p-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ))}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="mt-5 max-w-2xl rounded-xl border border-dashed p-4">
        <Skeleton className="h-4 w-28" />
        <SkeletonLines count={2} className="mt-2" lineClassName="h-3" widths={['w-full', 'w-3/4']} />
        <Skeleton className="mt-3 h-8 w-40 rounded-lg" />
      </div>
    </SkeletonPage>
  )
}

export function PanelAccountNewLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading new account form">
      <Skeleton className="mb-4 h-4 w-28" />
      <PanelHeaderSkeleton />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          {Array.from({ length: 4 }, (_, index) => (
            <section key={index} className="rounded-2xl border bg-card p-5 sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <Skeleton className="size-9 shrink-0 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-3 w-64" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <Skeleton className="mt-4 h-24 w-full rounded-lg" />
            </section>
          ))}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <section className="rounded-2xl bg-brand-ink p-5">
            <Skeleton className="h-3 w-20 bg-white/10" />
            <Skeleton className="mt-4 h-5 w-40 bg-white/10" />
            <Skeleton className="mt-4 h-8 w-28 bg-white/10" />
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
              <Skeleton className="h-8 w-20 bg-white/10" />
              <Skeleton className="ml-auto h-8 w-20 bg-white/10" />
            </div>
          </section>
          <section className="space-y-3 rounded-2xl border bg-card p-4">
            <Skeleton className="h-4 w-24" />
            <SkeletonLines count={3} lineClassName="h-3" widths={['w-full', 'w-full', 'w-2/3']} />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </section>
        </aside>
      </div>
    </SkeletonPage>
  )
}

export function PanelAccountDetailLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading account editor">
      <Skeleton className="mb-4 h-4 w-28" />
      <PanelHeaderSkeleton />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <section className="rounded-2xl border bg-card p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <Skeleton className="size-9 shrink-0 rounded-xl" />
              <div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-64" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <Skeleton className="mt-4 h-10 w-full rounded-lg" />
            <Skeleton className="mt-4 h-24 w-full rounded-lg" />
            <div className="mt-5 border-t pt-5">
              <Skeleton className="h-4 w-28" />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Skeleton className="size-9 shrink-0 rounded-xl" />
                <div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-3 w-64" />
                </div>
              </div>
              <SkeletonPill className="w-16" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="aspect-[4/3] w-full rounded-xl" />
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          {Array.from({ length: 2 }, (_, index) => (
            <section key={index} className="space-y-4 rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-28" />
                <SkeletonPill className="w-16" />
              </div>
              <SkeletonLines count={2} lineClassName="h-3" widths={['w-full', 'w-3/4']} />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </section>
          ))}
        </div>
      </div>
    </SkeletonPage>
  )
}

export function PanelTransactionDetailLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading transaction detail">
      <Skeleton className="mb-4 h-4 w-32" />
      <PanelHeaderSkeleton />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <section className="rounded-xl border bg-card p-4">
            <Skeleton className="h-4 w-24" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index}>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2 h-4 w-32" />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <TableHead columns={6} />
                <TableRows rows={3} columns={6} />
              </table>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <Skeleton className="h-4 w-32" />
            <div className="mt-3 space-y-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="flex gap-3">
                  <SkeletonCircle className="mt-1.5 size-2 shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="mt-1.5 h-3 w-64" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border bg-card p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-10 w-full rounded-lg" />
            <Skeleton className="mt-3 h-10 w-full rounded-lg" />
            <Skeleton className="mt-3 h-10 w-full rounded-lg" />
          </section>
          <section className="rounded-xl border bg-card p-4">
            <Skeleton className="h-4 w-32" />
            <SkeletonLines count={3} className="mt-3" lineClassName="h-3" widths={['w-full', 'w-full', 'w-2/3']} />
          </section>
        </div>
      </div>
    </SkeletonPage>
  )
}

export function PanelPageEditorLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading page editor">
      <Skeleton className="mb-4 h-4 w-24" />
      <PanelHeaderSkeleton />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-xl border bg-card p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-9 w-full rounded-lg" />
          <Skeleton className="mt-4 h-10 w-full rounded-lg" />
          <Skeleton className="mt-4 h-[24rem] w-full rounded-lg" />
          <div className="mt-4 flex justify-end gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </section>
        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <Skeleton className="h-4 w-32" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          </section>
        </div>
      </div>
    </SkeletonPage>
  )
}
