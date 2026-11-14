import { authService } from './auth.service'
import { rbacService } from './rbac.service'
import { auditService } from './audit.service'
import { paymentService } from './payment.service'
import * as webhookRepo from '../repositories/webhook-repo'
import { webhookListSchema, type WebhookListInput } from '../validation/admin'
import { parseInput, type UnionError } from '../validation/parse'
import { errorDetail, logger } from '../lib/logger'

const fail = (code: string, message: string): UnionError => ({ ok: false, code, message })

export const webhookService = {
  async list(input: WebhookListInput) {
    const session = await authService.verifySession()
    if (!session) return fail('INVALID_SESSION', 'Your session is no longer valid. Please log in again.')
    if (!(await rbacService.hasPermission(session.userId, 'webhook:read')))
      return fail('FORBIDDEN', 'You do not have permission to read webhooks.')

    const parsed = parseInput(webhookListSchema, input)
    if (!parsed.ok) return parsed

    const { status, page, size } = parsed.data
    const [rows, total] = await Promise.all([
      webhookRepo.listAdmin({ status, skip: (page - 1) * size, take: size }),
      webhookRepo.countAdmin({ status }),
    ])
    return {
      ok: true as const,
      data: {
        items: rows.map((row) => ({
          id: row.id.toString(),
          type: row.type,
          incomingFundId: row.incomingFundId,
          status: row.status,
          processedAt: row.processedAt?.toISOString() ?? null,
        })),
        page,
        size,
        total,
      },
    }
  },

  async retry(input: { id: string }) {
    const session = await authService.verifySession()
    if (!session) return fail('INVALID_SESSION', 'Your session is no longer valid. Please log in again.')
    if (!(await rbacService.hasPermission(session.userId, 'webhook:retry')))
      return fail('FORBIDDEN', 'You do not have permission to retry webhooks.')
    if (!/^\d+$/.test(input.id))
      return fail('ID_INVALID', 'Invalid webhook ID.')

    const event = await webhookRepo.findById(BigInt(input.id))
    if (!event) return fail('WEBHOOK_NOT_FOUND', 'Webhook event not found.')
    if (event.rawPayload === null)
      return fail('PAYLOAD_UNAVAILABLE', 'The raw payload for this event is no longer available.')
    if (event.status === 'DIPROSES')
      return { ok: true as const, data: { id: input.id, status: event.status } }

    try {
      await paymentService.handleXenditWebhook(event.rawPayload)
      await auditService.log(session.userId, 'webhook.retry', `webhook:${event.id}`, {
        type: event.type,
      })
      return { ok: true as const, data: { id: input.id, status: 'DIPROSES' } }
    } catch (err) {
      logger.error('webhook.retry-gagal', { webhookId: input.id, error: errorDetail(err) })
      return fail('RETRY_FAILED', 'Failed to retry the webhook. Check the server logs.')
    }
  },
}
