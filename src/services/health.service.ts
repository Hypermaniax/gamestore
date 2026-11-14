// Health check — DB reachability + scheduled-job heartbeat. Never returns internals.

import * as jobsRepo from '../repositories/jobs-repo'

const MENIT = 60_000
const INTERVAL_MENIT: Record<string, number> = {
  'idempotency-job': 5,
  'expiry-job': 2,
  'webhook-retry-job': 5,
  'auto-konfirmasi-job': 26 * 60,
  'retensi-job': 26 * 60,
}

export const healthService = {
  async status(): Promise<{ ok: boolean }> {
    try {
      await jobsRepo.ping()
      const now = Date.now()
      for (const row of await jobsRepo.semuaHeartbeat()) {
        const name = row.key.slice('job_heartbeat:'.length)
        const interval = INTERVAL_MENIT[name]
        if (!interval) continue
        const batas = Math.max(interval * 3, 15) * MENIT
        if (now - row.updatedAt.getTime() > batas) return { ok: false }
      }
      return { ok: true }
    } catch {
      return { ok: false }
    }
  },
}
