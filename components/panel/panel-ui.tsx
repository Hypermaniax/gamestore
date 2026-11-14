import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { rupiah, statusMeta } from '@/src/lib/pesanan'

export function PanelPageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function PanelStat({
  label,
  value,
  hint,
  href,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  href?: string
  tone?: 'default' | 'brand' | 'warn'
}) {
  const content = (
    <div
      className={`relative flex h-full flex-col justify-between gap-6 rounded-xl border p-4 transition ${
        tone === 'brand'
          ? 'border-brand-deep/20 bg-brand/12'
          : tone === 'warn'
            ? 'border-destructive/20 bg-destructive/5'
            : 'bg-card hover:border-foreground/20'
      } ${href ? 'hover:-translate-y-0.5' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
          {label}
        </p>
        {href ? <ArrowUpRight className="size-4 text-muted-foreground" /> : null}
      </div>
      <div>
        <p className="font-display text-2xl font-semibold tracking-[-0.04em]">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

const PANEL_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; brand?: boolean }> = {
  AVAILABLE: { label: 'Available', variant: 'default', brand: true },
  RESERVED: { label: 'Reserved', variant: 'secondary' },
  SOLD: { label: 'Sold', variant: 'outline' },
  DELISTED: { label: 'Draft / delisted', variant: 'outline' },
  DITERIMA: { label: 'Received', variant: 'outline' },
  DIPROSES: { label: 'Processing', variant: 'default', brand: true },
  PENDING: { label: 'Pending', variant: 'secondary' },
  DUPLIKAT: { label: 'Duplicate', variant: 'destructive' },
  SELESAI: { label: 'Completed', variant: 'outline' },
}

export function PanelStatus({ status }: { status: string }) {
  const panel = PANEL_STATUS[status]
  if (panel) {
    return (
      <Badge variant={panel.variant} className={panel.brand ? 'bg-brand text-brand-ink' : undefined}>
        {panel.label}
      </Badge>
    )
  }
  const meta = statusMeta(status)
  const variant =
    meta.tone === 'paid'
      ? 'default'
      : meta.tone === 'warn'
        ? 'destructive'
        : meta.tone === 'live'
          ? 'secondary'
          : 'outline'
  return (
    <Badge variant={variant} className={meta.tone === 'paid' ? 'bg-brand text-brand-ink' : undefined}>
      {meta.label}
    </Badge>
  )
}

export function PanelEmpty({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function PanelMoney({ value }: { value: string }) {
  return <span className="tabular-nums">{rupiah(value)}</span>
}
