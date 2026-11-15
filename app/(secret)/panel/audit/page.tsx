import { Search } from 'lucide-react'
import { auditService } from '@/src/services/audit.service'
import { waktu } from '@/src/lib/pesanan'
import { PanelEmpty, PanelPageHeader } from '@/components/panel/panel-ui'
import { TablePagination } from '@/components/panel/table-pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEFAULT_PAGE_SIZE, parsePageSize } from '@/src/lib/pagination'

export const instant = false

export default async function PanelAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string; size?: string }>
}) {
  const params = await searchParams
  const action = params.action?.trim() ?? ''
  const page = Math.max(1, Number(params.page ?? '1') || 1)
  const size = parsePageSize(params.size)
  const result = await auditService.list({ action: action || undefined, page, size })

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {result.message}
      </div>
    )
  }

  return (
    <div>
      <PanelPageHeader
        title="Audit log"
        description="Append-only trail of admin actions: status changes, refunds, content, and users."
      />
      <form className="mb-4 flex max-w-xl gap-2">
        {size !== DEFAULT_PAGE_SIZE ? <input type="hidden" name="size" value={size} /> : null}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="action" defaultValue={action} placeholder="Filter actions, e.g. voucher.create" className="h-9 pl-8" />
        </div>
        <Button type="submit" className="h-9">Filter</Button>
      </form>

      {result.data.items.length === 0 ? (
        <PanelEmpty title="No log entries yet" description="Admin actions will appear here once performed." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-[.1em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.data.items.map((row) => (
                  <tr key={row.id} className="align-top hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{waktu(row.createdAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.aktorUsername ?? 'system'}</td>
                    <td className="px-4 py-3 font-medium">{row.action}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.target}</td>
                    <td className="max-w-72 px-4 py-3">
                      <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all text-[11px] text-muted-foreground">
                        {row.detail ? JSON.stringify(row.detail, null, 2) : '—'}
                      </pre>
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
        basePath="/panel/audit"
        query={{ action }}
        label="log entries"
      />
    </div>
  )
}
