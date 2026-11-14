'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rupiah } from '@/src/lib/pesanan'
import {
  grantRevealAction,
  completeRefundAction,
  syncTransactionAdminAction,
  markDisputeAction,
  closeDisputeAction,
} from '@/src/controllers/transaction.controller'

type Payment = {
  id: string
  method: string
  status: string
  amount: string
  sisaRefund: string
}

export function TransactionActions({
  code,
  status,
  payments,
  canSync,
}: {
  code: string
  status: string
  payments: Payment[]
  canSync: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [refund, setRefund] = useState({ paymentId: '', amount: '', fee: '0', ref: '', note: '' })
  const refundable = payments.filter(
    (payment) => ['PAID', 'DUPLIKAT'].includes(payment.status) && BigInt(payment.sisaRefund) > 0,
  )

  function run(task: () => Promise<{ ok: boolean; message?: string }>, message: string) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await task()
      if (!result.ok) {
        setError(result.message ?? 'Action failed.')
        return
      }
      setNotice(message)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div>
        <h2 className="font-display text-base font-semibold tracking-[-0.02em]">Admin actions</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Status transitions and refunds are recorded in the audit log.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {canSync ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => syncTransactionAdminAction({ code: code }), 'Xendit sync completed.')}
          >
            Sync Xendit
          </Button>
        ) : null}
        {status === 'PAID' ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => markDisputeAction({ code: code }), 'Dispute opened.')}
          >
            Mark as disputed
          </Button>
        ) : null}
        {status === 'DISPUTED' ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => closeDisputeAction({ code: code }), 'Dispute closed.')}
          >
            Close dispute
          </Button>
        ) : null}
        {status === 'PAID' ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => grantRevealAction({ code: code, hari: 7 }), 'Reveal extended by 7 days.')}
          >
            Allow reveal +7 days
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}
      {notice ? <p className="rounded-lg bg-brand/15 px-3 py-2 text-sm">{notice}</p> : null}

      {refundable.length > 0 ? (
        <form
          className="space-y-3 border-t pt-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!refund.paymentId) {
              setError('Select a payment to refund.')
              return
            }
            run(
              () =>
                completeRefundAction({
                  code: code,
                  paymentId: refund.paymentId,
                  amount: refund.amount,
                  fee: refund.fee || '0',
                  ref: refund.ref || undefined,
                  note: refund.note || undefined,
                }),
              'Refund recorded.',
            )
          }}
        >
          <div>
            <p className="text-sm font-semibold">Record refund</p>
            <p className="text-xs text-muted-foreground">
              The total refund cannot exceed the payment amount.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payments">Payment</Label>
            <select
              id="payments"
              className="field h-9 px-3"
              value={refund.paymentId}
              onChange={(event) =>
                setRefund((value) => ({ ...value, paymentId: event.target.value }))
              }
              required
            >
              <option value="">Select payment</option>
              {refundable.map((payment) => (
                <option key={payment.id} value={payment.id}>
                  {payment.method} · {payment.status} · remaining {rupiah(payment.sisaRefund)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="jumlah">Refund amount</Label>
              <Input
                id="jumlah"
                inputMode="numeric"
                placeholder="85000"
                required
                value={refund.amount}
                onChange={(event) => setRefund((value) => ({ ...value, amount: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fee">Fee</Label>
              <Input
                id="fee"
                inputMode="numeric"
                value={refund.fee}
                onChange={(event) => setRefund((value) => ({ ...value, fee: event.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ref">Transfer reference</Label>
            <Input
              id="ref"
              placeholder="Optional"
              value={refund.ref}
              onChange={(event) => setRefund((value) => ({ ...value, ref: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="catatan">Note</Label>
            <textarea
              id="catatan"
              className="field min-h-20 py-2"
              placeholder="Destination account / support note (not stored bank details)"
              value={refund.note}
              onChange={(event) => setRefund((value) => ({ ...value, note: event.target.value }))}
            />
          </div>
          <Button type="submit" disabled={pending}>
            Save refund
          </Button>
        </form>
      ) : null}
    </div>
  )
}
