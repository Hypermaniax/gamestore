// Job scheduler — node-cron installed once from instrumentation.ts.

import { schedule } from 'node-cron'
import { runJob } from './run'
import {
  autoKonfirmasiJob,
  expiryJob,
  idempotencyJob,
  retensiJob,
  webhookRetryJob,
} from './handlers'
import type { JobResult } from './run'
import { logger } from '../lib/logger'

type Registered = { __gamestoreJobsRegistered?: boolean }
const store = globalThis as unknown as Registered

const JOBS: Array<{
  name: string
  expression: string
  handler: () => Promise<JobResult>
}> = [
  { name: 'idempotency-job', expression: '*/5 * * * *', handler: idempotencyJob },
  { name: 'expiry-job', expression: '*/2 * * * *', handler: expiryJob },
  { name: 'webhook-retry-job', expression: '*/5 * * * *', handler: webhookRetryJob },
  { name: 'auto-konfirmasi-job', expression: '15 1 * * *', handler: autoKonfirmasiJob },
  { name: 'retensi-job', expression: '30 2 * * *', handler: retensiJob },
]

export function registerJobs(): void {
  if (store.__gamestoreJobsRegistered) return
  store.__gamestoreJobsRegistered = true

  for (const job of JOBS) {
    schedule(job.expression, () => {
      void runJob(job.name, job.handler)
    })
  }
  logger.info('job.scheduled', { jobs: JOBS.map((job) => job.name) })
}
