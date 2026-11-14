// Throttled operational alerts — recorded in append-only audit with actor_id NULL.

import { auditService } from './audit.service'
import { emailService } from './email.service'
import * as adminAuditRepo from '../repositories/admin-audit-repo'

const last = new Map<string, number>()

export async function alertOnce(
  key: string,
  subject: string,
  body: string,
  hours = 6,
): Promise<void> {
  const now = Date.now()
  const windowMs = hours * 3_600_000
  if (now - (last.get(key) ?? 0) < windowMs) return
  last.set(key, now)

  const action = `ALERT_${key}`.slice(0, 80)
  const existing = await adminAuditRepo.findLatestAction(action, new Date(now - windowMs))
  if (existing) return

  await auditService.log(null, action, 'operasional', { subject })
  await emailService.sendAdminAlert(subject, body)
}
