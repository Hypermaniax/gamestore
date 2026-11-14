// Admin audit trail — append-only log + permission-guarded reader.

import { authService } from './auth.service'
import { rbacService } from './rbac.service'
import * as auditRepo from '../repositories/admin-audit-repo'
import { auditListSchema, type AuditListInput } from '../validation/admin'
import { parseInput, type UnionError } from '../validation/parse'
import type { Prisma } from '../../generated/client'

const fail = (code: string, message: string): UnionError => ({ ok: false, code, message })

export type AuditEntry = {
  id: string
  actorId: string | null
  aktorUsername: string | null
  action: string
  target: string
  detail: Prisma.JsonValue | null
  createdAt: string
}

export const auditService = {
  /** Write a log row. Must never be called by client code directly. */
  async log(
    actorId: bigint | null,
    action: string,
    target: string,
    detail?: Prisma.InputJsonValue,
  ): Promise<void> {
    await auditRepo.create({ actorId, action, target, detail })
  },

  /** Reader for the admin panel (`audit:read`). */
  async list(
    input: AuditListInput,
  ): Promise<
    | { ok: true; data: { items: AuditEntry[]; page: number; size: number; total: number } }
    | UnionError
  > {
    const session = await authService.verifySession()
    if (!session) return fail('INVALID_SESSION', 'Your session is no longer valid. Please log in again.')
    if (!(await rbacService.hasPermission(session.userId, 'audit:read')))
      return fail('FORBIDDEN', 'You do not have permission to read the audit log.')

    const parsed = parseInput(auditListSchema, input)
    if (!parsed.ok) return parsed

    const { action, page, size } = parsed.data
    const range = { skip: (page - 1) * size, take: size }
    const [rows, total] = await Promise.all([
      action ? auditRepo.listByAction(action, range) : auditRepo.list(range),
      action ? auditRepo.countByAction(action) : auditRepo.count(),
    ])

    return {
      ok: true,
      data: {
        items: rows.map((row) => ({
          id: row.id.toString(),
          actorId: row.actorId?.toString() ?? null,
          aktorUsername: row.actor?.username ?? null,
          action: row.action,
          target: row.target,
          detail: row.detail,
          createdAt: row.createdAt.toISOString(),
        })),
        page,
        size,
        total,
      },
    }
  },
}
