// Scheduled-job primitives — one advisory lock per job, scoped to the
// transaction that guards the run (docs/PLAN.md §8.1).

import { prisma } from '../lib/prisma'
import { errorDetail, logger } from '../lib/logger'
import * as jobsRepo from '../repositories/jobs-repo'
import { alertOnce } from '../services/alert.service'

type JobResult = { ok: true; processed: number; note?: string }

export async function withAdvisoryLock<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(hashtext(${name})) AS locked
      `
      if (!rows[0]?.locked) return null
      return fn()
    },
    { timeout: 60_000 },
  )
}

export async function runJob(
  name: string,
  fn: () => Promise<JobResult>,
): Promise<JobResult | null> {
  try {
    const result = await withAdvisoryLock(name, fn)
    if (result !== null) await jobsRepo.catatHeartbeat(name, 'OK')
    return result
  } catch (err) {
    logger.error('job.gagal', { job: name, error: errorDetail(err) })
    await jobsRepo.catatHeartbeat(name, 'GAGAL').catch(() => undefined)
    await alertOnce(
      `JOB_${name}`,
      `Job ${name} failed`,
      `Scheduled job ${name} failed at ${new Date().toISOString()}. Check the server logs.`,
      1,
    ).catch(() => undefined)
    return null
  }
}

export type { JobResult }