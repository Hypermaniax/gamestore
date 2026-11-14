// Server Actions for webhook inbox administration.

'use server'

import { webhookService } from '@/src/services/webhook.service'

export async function retryWebhookAction(input: { id: string }) {
  return webhookService.retry(input)
}
