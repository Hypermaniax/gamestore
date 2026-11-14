import Link from 'next/link'
import { transactionService } from '@/src/services/transaction.service'
import { rupiah, waktu } from '@/src/lib/pesanan'
import { PanelPageHeader, PanelStat, PanelStatus } from '@/components/panel/panel-ui'
import { Button } from '@/components/ui/button'

export const instant = false

export default async function PanelDashboard() {
  const [ringkasan, terbaru] = await Promise.all([
    transactionService.summaryAdmin(),
    transactionService.listAdmin({ page: 1, size: 6 }),
  ])

  if (!ringkasan.ok) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {ringkasan.message}
      </div>
    )
  }

  const data = ringkasan.data
  const transaction = terbaru.ok ? terbaru.data.items : []
  const antrean = [
    {
      label: 'Needs refund',
      value: String(data.antrean.needsRefund.amount),
      hint: `Remaining ${rupiah(data.antrean.needsRefund.sisaRefund)}`,
      href: '/panel/transactions?status=NEEDS_REFUND',
      tone: data.antrean.needsRefund.amount > 0 ? ('warn' as const) : ('default' as const),
    },
    {
      label: 'Open disputes',
      value: String(data.antrean.disputed.amount),
      hint: `Remaining ${rupiah(data.antrean.disputed.sisaRefund)}`,
      href: '/panel/transactions?status=DISPUTED',
      tone: data.antrean.disputed.amount > 0 ? ('warn' as const) : ('default' as const),
    },
    {
      label: 'Duplicates not refunded',
      value: String(data.antrean.duplikat.amount),
      hint: `Remaining ${rupiah(data.antrean.duplikat.sisaRefund)}`,
      href: '/panel/transactions',
      tone: 'default' as const,
    },
    {
      label: 'Stale reservations',
      value: String(data.reserved.amount),
      hint: 'Transactions awaiting payment',
      href: '/panel/transactions?status=RESERVED',
      tone: 'default' as const,
    },
  ]

  return (
    <div>
      <PanelPageHeader
        title="Today's operations"
        description={`Queue and sales summary for ${data.tanggal} (Asia/Jakarta).`}
        action={
          <Button render={<Link href="/panel/transactions" />} variant="outline">
            All transactions
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PanelStat
          label="Today's revenue"
          value={rupiah(data.omzetHariIni.total)}
          hint={`${data.omzetHariIni.jumlahTransaksi} paid transactions`}
          tone="brand"
        />
        {antrean.map((item) => (
          <PanelStat key={item.label} {...item} />
        ))}
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-[-0.03em]">Recent transactions</h2>
            <p className="text-sm text-muted-foreground">The six latest transactions, all statuses.</p>
          </div>
          <Link href="/panel/transactions" className="text-sm font-semibold text-brand-deep hover:underline">
            View all
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          {transaction.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-[.1em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Buyer</th>
                    <th className="px-4 py-3 font-medium">Account</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transaction.map((row) => (
                    <tr key={row.code} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link href={`/panel/transactions/${row.code}`} className="hover:text-brand-deep">
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
                      <td className="px-4 py-3 text-right tabular-nums">{rupiah(row.total)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{waktu(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
