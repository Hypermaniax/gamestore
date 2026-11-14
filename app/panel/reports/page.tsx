import { reportService } from '@/src/services/report.service'
import { rupiah } from '@/src/lib/pesanan'
import { PanelEmpty, PanelPageHeader, PanelStat } from '@/components/panel/panel-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const instant = false

function ReportError({ message }: { message: string }) {
  return (
    <div>
      <PanelPageHeader title="Reports" description="Sales and refund summary." />
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {message}
      </div>
    </div>
  )
}

export default async function PanelReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ dari?: string; sampai?: string }>
}) {
  const { dari = '', sampai = '' } = await searchParams
  const input = { dari: dari || undefined, sampai: sampai || undefined }
  const [sales, salesByGame, refunds] = await Promise.all([
    reportService.sales(input),
    reportService.salesByGame(input),
    reportService.refunds(input),
  ])

  if (!sales.ok) return <ReportError message={sales.message} />
  if (!salesByGame.ok) return <ReportError message={salesByGame.message} />
  if (!refunds.ok) return <ReportError message={refunds.message} />

  const period = sales.data.periode

  return (
    <div>
      <PanelPageHeader
        title="Reports"
        description={`Period ${period.dari} to ${period.sampai} (Asia/Jakarta).`}
      />

      <form className="mb-5 flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="dari">From</Label>
          <Input id="dari" name="dari" type="date" defaultValue={dari} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sampai">To</Label>
          <Input id="sampai" name="sampai" type="date" defaultValue={sampai} className="h-9" />
        </div>
        <Button type="submit" className="h-9">Apply</Button>
        <p className="pb-2 text-xs text-muted-foreground sm:ml-auto">Defaults to the last 30 days, maximum 366 days.</p>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PanelStat label="Revenue" value={rupiah(sales.data.ringkasan.total)} hint={`${sales.data.ringkasan.jumlahTransaksi} transactions`} tone="brand" />
        <PanelStat label="Promotion discount" value={rupiah(sales.data.ringkasan.promotionDiscount)} />
        <PanelStat label="Voucher discount" value={rupiah(sales.data.ringkasan.voucherDiscount)} />
        <PanelStat label="Refund" value={rupiah(refunds.data.ringkasan.value)} hint={`${refunds.data.ringkasan.jumlahRefund} refunds · fee ${rupiah(refunds.data.ringkasan.fee)}`} tone={refunds.data.ringkasan.jumlahRefund > 0 ? 'warn' : 'default'} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Daily sales</h2>
          </div>
          {sales.data.rows.length === 0 ? (
            <PanelEmpty title="No sales yet" description="No paid transactions in this period." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-[.1em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Transactions</th>
                    <th className="px-4 py-3 text-right font-medium">Revenue</th>
                    <th className="px-4 py-3 text-right font-medium">Discount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sales.data.rows.map((row) => (
                    <tr key={row.tanggal}>
                      <td className="px-4 py-3 font-mono text-xs">{row.tanggal}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.amount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{rupiah(row.total)}</td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">
                        {rupiah(String(BigInt(row.promotionDiscount) + BigInt(row.voucherDiscount)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Sales by game</h2>
          </div>
          {salesByGame.data.rows.length === 0 ? (
            <PanelEmpty title="No data yet" description="Sales by game appear after there are paid transactions." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-[.1em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Game</th>
                    <th className="px-4 py-3 text-right font-medium">Transactions</th>
                    <th className="px-4 py-3 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {salesByGame.data.rows.map((row) => (
                    <tr key={row.code}>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.amount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{rupiah(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Daily refunds</h2>
        </div>
        {refunds.data.rows.length === 0 ? (
          <PanelEmpty title="No refunds yet" description="No refunds in this period." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-[.1em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Count</th>
                  <th className="px-4 py-3 text-right font-medium">Value</th>
                  <th className="px-4 py-3 text-right font-medium">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {refunds.data.rows.map((row) => (
                  <tr key={row.tanggal}>
                    <td className="px-4 py-3 font-mono text-xs">{row.tanggal}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.amount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{rupiah(row.value)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{rupiah(row.fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
