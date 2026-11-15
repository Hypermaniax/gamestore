// In-process email queue — keeps SMTP latency off the request path.
// Pending jobs are best-effort and disappear on restart; verification emails can be resent.

import { emailService, type EmailMessage } from '../services/email.service'
import { errorDetail, logger, maskEmail } from './logger'

type QueueState = {
  jobs: EmailMessage[]
  draining: boolean
  scheduled: boolean
}

const store = globalThis as unknown as { __emailQueue?: QueueState }
const state = (store.__emailQueue ??= { jobs: [], draining: false, scheduled: false })

function scheduleDrain(): void {
  if (state.scheduled) return
  state.scheduled = true
  setImmediate(() => {
    state.scheduled = false
    void drain().catch((err) => {
      logger.error('email.queue-gagal', { error: errorDetail(err) })
    })
  })
}

async function drain(): Promise<void> {
  if (state.draining) return
  state.draining = true
  try {
    while (state.jobs.length > 0) {
      const job = state.jobs.shift()!
      await emailService.sendEmail(job.to, job.subject, job.text, job.html)
    }
  } finally {
    state.draining = false
    if (state.jobs.length > 0) scheduleDrain()
  }
}

export function enqueueEmail(message: EmailMessage): void {
  state.jobs.push(message)
  logger.info('email.queued', {
    to: maskEmail(message.to),
    pending: state.jobs.length,
  })
  scheduleDrain()
}

export function pendingEmailCount(): number {
  return state.jobs.length
}
