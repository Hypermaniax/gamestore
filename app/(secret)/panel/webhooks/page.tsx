import { webhookService } from '@/src/services/webhook.service'
import { waktu } from '@/src/lib/pesanan'
import { PanelEmpty, PanelPageHeader, PanelStatus } from '@/components/panel/panel-ui'
import { TablePagination } from '@/components/panel/table-pagination'
import { DEFAULT_PAGE_SIZE, parsePageSize } from '@/src/lib/pagination'
import { WebhookRetryButton } from './webhook-retry-button'

export const instant = false

const STATUSES = ['DITERIMA', 'DIPROSES', 'GAGAL'] as const
type WebhookStatus = (typeof STATUSES)[number]

export default async function PanelWebhooksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; size?: string }>
}) {
  const params = await searchParams
  const rawStatus = params.status ?? ''
  const status: WebhookStatus | '' = (STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as WebhookStatus)
    : ''
  const page = Math.max(1, Number(params.page ?? '1') || 1)
  const size = parsePageSize(params.size)
  const result = await webhookService.list({ status: status || undefined, page, size })
  if (!result.ok) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{result.message}</div>
  return (
    <div>
      <PanelPageHeader title="Webhooks" description="Xendit event inbox; GAGAL events need review or reprocessing by the job." />
      <form className="mb-4 flex gap-2">
        {size !== DEFAULT_PAGE_SIZE ? <input type="hidden" name="size" value={size} /> : null}
        <select name="status" defaultValue={status} className="field h-9 w-48 px-2">
          <option value="">All statuses</option>
          <option value="DITERIMA">DITERIMA</option>
          <option value="DIPROSES">DIPROSES</option>
          <option value="GAGAL">GAGAL</option>
        </select>
        <button className="h-9 rounded-lg border px-3 text-sm font-medium hover:bg-muted">Filter</button>
      </form>
      {result.data.items.length === 0 ? (
        <PanelEmpty title="No events yet" description="Xendit webhook events will appear here." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-[.1em] text-muted-foreground"><tr><th className="px-4 py-3 font-medium">ID</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Incoming fund ID</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Processed</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead>
              <tbody className="divide-y">
                {result.data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-mono text-xs">{row.id}</td>
                    <td className="px-4 py-3">{row.type}</td>
                    <td className="max-w-80 break-all px-4 py-3 font-mono text-xs">{row.incomingFundId}</td>
                    <td className="px-4 py-3"><PanelStatus status={row.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{waktu(row.processedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {row.status === 'GAGAL' ? <WebhookRetryButton id={row.id} /> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
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
        total={result.data.total}
        basePath="/panel/webhooks"
        query={{ status }}
        label="events"
      />
    </div>
  )
}
