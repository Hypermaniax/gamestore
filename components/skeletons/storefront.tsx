import { AuthShell } from '@/components/auth-shell'
import {
  Skeleton,
  SkeletonCircle,
  SkeletonLines,
  SkeletonPage,
  SkeletonPill,
} from './base'

export function AuthLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading account page">
      <AuthShell>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-9 w-56" />
        <SkeletonLines count={2} className="mt-4" widths={['w-full', 'w-4/5']} />
        <Skeleton className="mt-7 h-3 w-24" />
        <Skeleton className="mt-2 h-12 w-full rounded-xl" />
        <Skeleton className="mt-5 h-3 w-20" />
        <Skeleton className="mt-2 h-12 w-full rounded-xl" />
        <Skeleton className="mt-6 h-12 w-full rounded-xl" />
        <Skeleton className="mx-auto mt-5 h-3 w-48" />
      </AuthShell>
    </SkeletonPage>
  )
}

export function HelpLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading help and policies">
      <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14 lg:px-12">
        <Skeleton className="h-4 w-32" />

        <header className="mt-8 grid gap-10 border-b border-border pb-12 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
          <div>
            <Skeleton className="h-14 w-[min(30rem,92%)] sm:h-20" />
            <SkeletonLines
              count={2}
              className="mt-6 max-w-xl"
              lineClassName="h-4"
              widths={['w-full', 'w-4/5']}
            />
          </div>
          <div className="max-w-sm lg:justify-self-end">
            <Skeleton className="h-3 w-36" />
            <SkeletonLines
              count={3}
              className="mt-4"
              lineClassName="h-3"
              widths={['w-full', 'w-full', 'w-3/4']}
            />
          </div>
        </header>

        <section className="mt-12 grid gap-10 lg:grid-cols-[.68fr_1.32fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Skeleton className="h-8 w-48" />
            <SkeletonLines
              count={3}
              className="mt-4 max-w-xs"
              lineClassName="h-3"
              widths={['w-full', 'w-full', 'w-2/3']}
            />
            <Skeleton className="mt-5 h-3 w-28" />
          </div>

          <div className="border-t border-border">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="flex items-start gap-4 border-b border-border py-7 sm:gap-5"
              >
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-6 w-40" />
                  <SkeletonLines
                    count={2}
                    className="mt-3 max-w-lg"
                    lineClassName="h-3"
                    widths={['w-full', 'w-3/4']}
                  />
                </div>
                <SkeletonCircle className="mt-1 size-8 shrink-0" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </SkeletonPage>
  )
}

export function StaticPageLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading page">
      <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14 lg:px-12">
        <div className="flex flex-wrap items-center gap-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="size-3 rounded-sm" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="size-3 rounded-sm" />
          <Skeleton className="h-3 w-32" />
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
          <aside className="lg:sticky lg:top-28">
            <Skeleton className="h-3 w-28" />
            <div className="mt-4 hidden space-y-1 lg:block">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton
                  key={index}
                  className={index === 0 ? 'h-9 w-full rounded-lg bg-foreground/10' : 'h-9 w-full rounded-lg'}
                />
              ))}
            </div>
            <Skeleton className="mt-5 hidden h-3 w-24 lg:block" />
            <div className="mt-6 flex gap-2 lg:hidden">
              {Array.from({ length: 4 }, (_, index) => (
                <SkeletonPill key={index} className="w-24 shrink-0" />
              ))}
            </div>
          </aside>

          <div>
            <header className="border-b border-border pb-7">
              <div className="flex flex-wrap items-center gap-2">
                <SkeletonPill className="w-28" />
                <SkeletonPill className="w-24" />
              </div>
              <Skeleton className="mt-4 h-10 w-[min(34rem,92%)] sm:h-12" />
              <SkeletonLines
                count={2}
                className="mt-3 max-w-2xl"
                lineClassName="h-3"
                widths={['w-full', 'w-2/3']}
              />
            </header>

            <div className="mt-8 rounded-[28px] border border-border bg-card p-6 sm:p-9">
              <SkeletonLines
                count={8}
                lineClassName="h-3"
                widths={['w-2/3', 'w-full', 'w-full', 'w-5/6', 'w-full', 'w-11/12', 'w-full', 'w-3/4']}
              />
            </div>

            <div className="mt-6 flex flex-col justify-between gap-4 rounded-[24px] border border-border bg-secondary/50 p-5 sm:flex-row sm:items-center">
              <div>
                <Skeleton className="h-3 w-44" />
                <Skeleton className="mt-2 h-3 w-56" />
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }, (_, index) => (
                  <SkeletonPill key={index} className="w-28" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SkeletonPage>
  )
}

export function AccountDetailLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading account details">
      <div className="mx-auto max-w-[1440px] px-5 pb-32 pt-8 sm:px-8 sm:pt-12 lg:px-12 lg:pb-24">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <SkeletonCircle className="size-8" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-10 xl:gap-14">
          <section className="min-w-0">
            <div className="rounded-[32px] bg-foreground/[.035] p-1.5 ring-1 ring-foreground/10">
              <div className="aspect-[4/3] overflow-hidden rounded-[calc(32px-.375rem)] bg-card sm:aspect-[16/10]">
                <Skeleton className="size-full rounded-[calc(32px-.375rem)]" />
              </div>
            </div>

            <div className="mt-5 rounded-[32px] bg-foreground/[.035] p-1.5 ring-1 ring-foreground/10 sm:mt-6">
              <div className="rounded-[calc(32px-.375rem)] bg-card p-6 sm:p-8 lg:p-10">
                <div className="flex flex-wrap gap-2">
                  <SkeletonPill className="w-20" />
                  <SkeletonPill className="w-24" />
                </div>
                <Skeleton className="mt-5 h-10 w-[min(38rem,94%)] sm:h-12" />
                <SkeletonLines
                  count={3}
                  className="mt-5 max-w-3xl"
                  lineClassName="h-3"
                  widths={['w-full', 'w-full', 'w-2/3']}
                />
                <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 border-t border-border pt-5">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="h-3 w-36" />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[28px] border border-border bg-card p-6 sm:mt-6 sm:p-8">
              <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
                <div>
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="mt-3 h-7 w-52" />
                </div>
                <Skeleton className="hidden h-3 w-16 sm:block" />
              </div>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-2xl bg-foreground/[.025] px-4 py-3.5 ring-1 ring-border/60">
                    <SkeletonCircle className="mt-0.5 size-5 shrink-0" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-24">
            <div className="rounded-[32px] bg-foreground/[.04] p-1.5 ring-1 ring-foreground/10 shadow-[0_28px_80px_-46px_rgba(17,23,25,.4)]">
              <div className="overflow-hidden rounded-[calc(32px-.375rem)] bg-card">
                <div className="p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-3 w-32" />
                    <SkeletonPill className="w-20" />
                  </div>
                  <Skeleton className="mt-4 h-7 w-56" />
                  <Skeleton className="mt-2 h-3 w-32" />
                  <div className="mt-6 border-t border-border pt-5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="mt-2 h-10 w-40" />
                  </div>
                  <Skeleton className="mt-5 h-14 w-full rounded-2xl" />
                  <Skeleton className="mx-auto mt-3 h-3 w-56" />
                  <div className="mt-6 space-y-2.5 border-t border-border pt-5">
                    {Array.from({ length: 3 }, (_, index) => (
                      <Skeleton key={index} className="h-3 w-full" />
                    ))}
                  </div>
                </div>
                <div className="border-t border-border bg-foreground/[.02] p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="mt-3 space-y-2">
                    {Array.from({ length: 3 }, (_, index) => (
                      <Skeleton key={index} className="h-3 w-4/5" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SkeletonPage>
  )
}

export function CheckoutLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading checkout">
      <div className="mx-auto max-w-[1240px] px-5 pb-20 pt-10 sm:px-8 sm:pt-14 lg:px-12">
        <Skeleton className="h-4 w-32" />

        <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-10 w-72 sm:h-12" />
            <SkeletonLines
              count={2}
              className="mt-3 max-w-xl"
              lineClassName="h-3"
              widths={['w-full', 'w-3/4']}
            />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonPill className="w-24" />
            <SkeletonPill className="w-24" />
          </div>
        </div>

        <div className="mt-9 grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-[28px] border border-border bg-card">
              <div className="grid sm:grid-cols-[220px_1fr]">
                <Skeleton className="h-44 rounded-none sm:h-full" />
                <div className="p-5 sm:p-7">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-3 h-7 w-56" />
                  <SkeletonLines count={2} className="mt-3" lineClassName="h-3" widths={['w-full', 'w-4/5']} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Array.from({ length: 3 }, (_, index) => (
                      <SkeletonPill key={index} className="w-20" />
                    ))}
                  </div>
                  <Skeleton className="mt-5 h-3 w-64" />
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-border bg-card p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <SkeletonCircle className="size-9" />
                <div>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="mt-2 h-3 w-52" />
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
              </div>
            </section>

            <section className="rounded-[28px] border border-border bg-card p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <SkeletonCircle className="size-9" />
                <div>
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="mt-2 h-3 w-64" />
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <Skeleton className="h-12 flex-1 rounded-xl" />
                <Skeleton className="h-12 w-24 rounded-xl" />
              </div>
            </section>

            <section className="rounded-[28px] border border-border bg-card p-5 sm:p-7">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-3 w-32" />
            </section>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_25px_70px_rgba(20,28,30,.08)]">
              <div className="border-b border-dashed border-border p-5 sm:p-6">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="mt-3 h-6 w-40" />
                <Skeleton className="mt-2 h-3 w-52" />
              </div>
              <div className="space-y-3 p-5 sm:p-6">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="flex justify-between gap-4">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-border p-5 sm:p-6">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-10 w-36" />
                <Skeleton className="mt-2 h-3 w-48" />
              </div>
              <div className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="mx-auto h-3 w-48" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SkeletonPage>
  )
}

export function OrdersLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading orders">
      <div className="mx-auto max-w-[1120px] px-5 pb-20 pt-10 sm:px-8 sm:pt-14 lg:px-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-10 w-64 sm:h-12" />
            <SkeletonLines count={2} className="mt-3 max-w-xl" lineClassName="h-3" widths={['w-full', 'w-2/3']} />
          </div>
          <Skeleton className="h-11 w-36 rounded-xl" />
        </div>

        <div className="mt-8 flex gap-2 overflow-x-auto">
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonPill key={index} className="w-24 shrink-0" />
          ))}
        </div>

        <Skeleton className="mb-5 mt-6 h-3 w-32" />

        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex flex-col justify-between gap-4 rounded-[24px] border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="flex min-w-0 items-start gap-4">
                <Skeleton className="size-11 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SkeletonPill className="w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="mt-3 h-5 w-64" />
                  <Skeleton className="mt-2 h-3 w-44" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-5 sm:justify-end">
                <div className="text-left sm:text-right">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="mt-1 h-5 w-24" />
                </div>
                <SkeletonCircle className="size-10" />
              </div>
            </div>
          ))}
        </div>

        <Skeleton className="mt-4 h-14 rounded-2xl" />
      </div>
    </SkeletonPage>
  )
}

export function OrderDetailLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading order details">
      <div className="mx-auto max-w-[1180px] px-5 pb-20 pt-10 sm:px-8 sm:pt-14 lg:px-12">
        <Skeleton className="h-4 w-28" />

        <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-10 w-64 sm:h-12" />
            <Skeleton className="mt-3 h-3 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonPill className="w-24" />
            <SkeletonPill className="w-24" />
            <SkeletonPill className="w-24" />
          </div>
        </div>

        <div className="mt-9 grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-[28px] border border-border bg-card">
              <div className="flex flex-col justify-between gap-4 border-b border-dashed border-border p-5 sm:flex-row sm:items-center sm:p-7">
                <div>
                  <SkeletonPill className="w-20" />
                  <Skeleton className="mt-3 h-7 w-48" />
                  <Skeleton className="mt-2 h-3 w-64" />
                </div>
                <Skeleton className="h-14 w-32 rounded-2xl" />
              </div>
              <div className="grid gap-6 p-5 sm:grid-cols-[220px_1fr] sm:p-7">
                <Skeleton className="mx-auto aspect-square w-full max-w-[220px] rounded-3xl" />
                <div className="flex flex-col justify-center">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-3 h-6 w-40" />
                  <SkeletonLines count={3} className="mt-3" lineClassName="h-3" widths={['w-full', 'w-full', 'w-2/3']} />
                </div>
              </div>
              <div className="border-t border-border p-5 sm:p-7">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Skeleton className="h-11 w-36 rounded-xl" />
                  <Skeleton className="h-11 w-32 rounded-xl" />
                </div>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_25px_70px_rgba(20,28,30,.08)]">
              <div className="border-b border-dashed border-border p-5 sm:p-6">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-6 w-48" />
                <Skeleton className="mt-2 h-3 w-32" />
              </div>
              <div className="space-y-3 p-5 text-sm sm:p-6">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="flex justify-between gap-4">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
              <div className="space-y-3 border-t border-dashed border-border p-5 sm:p-6">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="flex justify-between gap-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SkeletonPage>
  )
}

export function AccountSecurityLoadingSkeleton() {
  return (
    <SkeletonPage label="Loading account settings">
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14 lg:px-12">
        <div className="space-y-8">
          <header>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-56" />
            <Skeleton className="mt-2 h-3 w-72" />
          </header>

          <section className="rounded-2xl border border-border bg-background/40 p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Skeleton className="size-14 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-3 w-56" />
              </div>
              <SkeletonPill className="w-28" />
            </div>
            <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index}>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2 h-4 w-28" />
                </div>
              ))}
            </div>
          </section>

          {Array.from({ length: 2 }, (_, index) => (
            <section key={index} className="rounded-2xl border border-border bg-background/40 p-5 sm:p-6">
              <Skeleton className="h-5 w-40" />
              <SkeletonLines count={2} className="mt-3" lineClassName="h-3" widths={['w-full', 'w-3/4']} />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </section>
          ))}

          <div className="grid gap-5 md:grid-cols-2">
            {Array.from({ length: 2 }, (_, index) => (
              <section key={index} className="rounded-2xl border border-border bg-background/40 p-5 sm:p-6">
                <Skeleton className="h-5 w-32" />
                <SkeletonLines count={2} className="mt-3" lineClassName="h-3" widths={['w-full', 'w-3/4']} />
                <Skeleton className="mt-5 h-12 w-full rounded-xl" />
                <Skeleton className="mt-3 h-12 w-full rounded-xl" />
              </section>
            ))}
          </div>
        </div>
      </div>
    </SkeletonPage>
  )
}
