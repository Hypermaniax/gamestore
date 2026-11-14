'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { retryWebhookAction } from '@/src/controllers/webhook.controller'

export function WebhookRetryButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await retryWebhookAction({ id })
            if (!result.ok) {
              setError(result.message)
              return
            }
            router.refresh()
          })
        }}
      >
        {pending ? 'Processing…' : 'Retry'}
      </Button>
      {error ? <span className="max-w-48 text-right text-xs text-destructive">{error}</span> : null}
    </div>
  )
}
