// Health endpoint — DB + scheduled-job heartbeat, never leaks internal details.
// Deep provider checks do NOT belong here (PLAN §14).

import { healthService } from '@/src/services/health.service'

export async function GET() {
  const { ok } = await healthService.status()
  return Response.json(
    { status: ok ? 'ok' : 'degraded' },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
