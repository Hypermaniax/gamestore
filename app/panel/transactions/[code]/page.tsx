import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { transactionService } from '@/src/services/transaction.service'
import { rupiah, waktu } from '@/src/lib/pesanan'
import { PanelPageHeader, PanelStatus } from '@/components/panel/panel-ui'
import { Button } from '@/components/ui/button'
import { TransactionActions } from './transaction-actions'

export const instant = false

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 break-words text-sm">{value}</div>
    </div>
  )
}

export default async function PanelTransactionDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const result = await transactionService.detailAdmin({ code: code })

  if (!result.ok) {
    return (
      <div>
        <PanelPageHeader title="Transaction not found" description={result.message} />
        <Button variant="outline" render={<Link href="/panel/transactions" />}>
          Back to transactions
        </Button>
      </div>
    )
  }

  const data = result.data
  const totalRefund = data.payment.reduce(
    (sum, payment) => sum + BigInt(payment.totalRefund),
    BigInt(0),
  )
  const remainingRefund = data.payment.reduce(
    (sum, payment) => sum + BigInt(payment.sisaRefund),
    BigInt(0),
  )

  return (
    <div>
      <Link
        href="/panel/transactions"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All transactions
      </Link>

      <PanelPageHeader
        title={data.code}
        description={`Created ${waktu(data.createdAt)} · buyer ${data.buyer.username}`}
        action={<PanelStatus status={data.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Summary</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="Buyer" value={<><p className="font-medium">{data.buyer.username}</p><p className="text-muted-foreground">{data.buyer.email}</p></>} />
              <Info
                label="Account"
                value={
                  <>
                    <Link href={`/accounts/${data.account.slug}`} className="inline-flex items-center gap-1 font-medium hover:text-brand-deep">
                      {data.account.title}
                      <ExternalLink className="size-3.5" />
                    </Link>
                    <p className="text-muted-foreground">
                      {data.account.game.name} · {data.account.status}
                    </p>
                  </>
                }
              />
              <Info label="Initial price" value={rupiah(data.initialPrice)} />
              <Info label="Total paid" value={<span className="font-semibold">{rupiah(data.total)}</span>} />
              <Info label="Promotion discount" value={rupiah(data.promotionDiscount)} />
              <Info label="Voucher discount" value={rupiah(data.voucherDiscount)} />
              <Info label="Terms & conditions" value={`Version ${data.termsVersion} · accepted ${waktu(data.termsAcceptedAt)}`} />
              <Info label="Payment" value={data.paidAt ? waktu(data.paidAt) : 'Not paid yet'} />
              <Info label="Warranty starts" value={waktu(data.warrantyStart)} />
              <Info label="Reveal until" value={waktu(data.revealUntil)} />
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Payments</h2>
              <p className="text-xs text-muted-foreground">
                Refund {rupiah(totalRefund.toString())} · remaining {rupiah(remainingRefund.toString())}
              </p>
            </div>
            {data.payment.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b text-xs uppercase tracking-[.1em] text-muted-foreground">
                    <tr>
                      <th className="py-2 font-medium">Method</th>
                      <th className="py-2 font-medium">Status</th>
                      <th className="py-2 font-medium">External ID</th>
                      <th className="py-2 text-right font-medium">Amount</th>
                      <th className="py-2 text-right font-medium">Refund</th>
                      <th className="py-2 text-right font-medium">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.payment.map((payment) => (
                      <tr key={payment.id}>
                        <td className="py-2">
                          {payment.method}
                          {payment.reference ? <span className="text-muted-foreground"> · {payment.reference}</span> : null}
                        </td>
                        <td className="py-2"><PanelStatus status={payment.status} /></td>
                        <td className="max-w-52 truncate py-2 font-mono text-xs">{payment.externalId}</td>
                        <td className="py-2 text-right tabular-nums">{rupiah(payment.amount)}</td>
                        <td className="py-2 text-right tabular-nums">{rupiah(payment.totalRefund)}</td>
                        <td className="py-2 text-right tabular-nums">{rupiah(payment.sisaRefund)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {data.refund.length > 0 ? (
            <section className="rounded-xl border bg-card p-4">
              <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Refund history</h2>
              <div className="mt-3 divide-y text-sm">
                {data.refund.map((refund) => (
                  <div key={refund.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-medium">{rupiah(refund.amount)} <span className="font-normal text-muted-foreground">· fee {rupiah(refund.fee)}</span></p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {refund.paymentId} · {refund.admin.username} · {waktu(refund.refundedAt)}
                      </p>
                      {refund.note ? <p className="mt-1 text-xs text-muted-foreground">{refund.note}</p> : null}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{refund.reference ?? '—'}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Webhook timeline</h2>
            {data.webhook.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No webhook events for this payment yet.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {data.webhook.map((event) => (
                  <li key={event.id} className="flex gap-3 text-sm">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${event.status === 'GAGAL' ? 'bg-destructive' : event.status === 'DIPROSES' ? 'bg-brand-deep' : 'bg-muted-foreground'}`} />
                    <div className="min-w-0">
                      <p className="font-medium">{event.type} · {event.status}</p>
                      <p className="break-all font-mono text-xs text-muted-foreground">{event.incomingFundId}</p>
                      <p className="text-xs text-muted-foreground">{event.processedAt ? waktu(event.processedAt) : 'Not processed yet'}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Reveal audit</h2>
            {data.auditReveal.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">The buyer has not revealed the credentials yet.</p>
            ) : (
              <div className="mt-3 space-y-2 text-sm">
                {data.auditReveal.map((audit, index) => (
                  <div key={`${audit.waktu}-${index}`} className="flex flex-wrap justify-between gap-2 border-b pb-2 last:border-0">
                    <span>{waktu(audit.waktu)}</span>
                    <span className="text-muted-foreground">{audit.ip ?? 'Local IP'} · {audit.userAgent ?? 'UA not recorded'}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <TransactionActions
            code={data.code}
            status={data.status}
            canSync={data.payment.some(
              (payment) => payment.method === 'QRIS' && payment.status === 'PENDING',
            )}
            payments={data.payment.map((payment) => ({
              id: payment.id,
              method: payment.method,
              status: payment.status,
              amount: payment.amount,
              sisaRefund: payment.sisaRefund,
            }))}
          />
          <div className="rounded-xl border bg-card p-4 text-sm">
            <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Operational notes</h2>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>Full refunds only after a transaction is DISPUTED or NEEDS_REFUND.</li>
              <li>Partial refunds do not change the status until the remaining amount reaches zero.</li>
              <li>Refunding a DUPLIKAT payment does not change the transaction status.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
