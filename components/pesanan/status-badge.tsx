import { Badge } from '@/components/ui/badge'
import { statusMeta } from '@/src/lib/pesanan'

const TONE_CLASS: Record<string, string> = {
  live: 'border-brand-deep/30 bg-brand/20 text-brand-ink dark:text-brand',
  paid: 'border-brand-deep/30 bg-brand/15 text-brand-deep',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  dead: 'border-border bg-muted text-muted-foreground',
  neutral: 'border-border bg-secondary text-foreground',
}

export function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status)
  return (
    <Badge
      variant="outline"
      className={`h-auto gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
        TONE_CLASS[meta.tone] ?? TONE_CLASS.neutral
      }`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </Badge>
  )
}
