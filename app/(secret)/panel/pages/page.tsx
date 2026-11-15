import Link from 'next/link'
import { pageService } from '@/src/services/page.service'
import { waktu } from '@/src/lib/pesanan'
import { PanelEmpty, PanelPageHeader } from '@/components/panel/panel-ui'
import { TablePagination } from '@/components/panel/table-pagination'
import { Button } from '@/components/ui/button'
import { parsePageSize } from '@/src/lib/pagination'

export const instant = false

export default async function PanelPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? '1') || 1)
  const size = parsePageSize(params.size)
  const result = await pageService.listAdmin()
  if (!result.ok) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {result.message}
      </div>
    )
  }

  const total = result.data.length
  const totalPages = Math.max(1, Math.ceil(total / size))
  const currentPage = Math.min(page, totalPages)
  const items = result.data.slice((currentPage - 1) * size, currentPage * size)

  return (
    <div>
      <PanelPageHeader
        title="Static pages"
        description="Edit drafts, publish frozen versions, and open old version text for dispute evidence."
      />
      {items.length === 0 ? (
        <PanelEmpty title="No pages yet" description="Run the seed to create the initial pages." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-[.1em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Published version</th>
                  <th className="px-4 py-3 font-medium">Draft updated</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((row) => (
                  <tr key={row.code} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                    <td className="px-4 py-3 font-medium">{row.title}</td>
                    <td className="px-4 py-3">{row.version}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{waktu(row.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" render={<Link href={`/panel/pages/${row.code}`} />}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <TablePagination
        page={currentPage}
        size={size}
        total={total}
        basePath="/panel/pages"
        label="pages"
      />
    </div>
  )
}
