// Admin user management — ref: docs/API.md §5.4. Every mutation is permission
// checked, audited, and guarded against locking out the last ADMIN or oneself.

import bcrypt from 'bcrypt'
import { authService } from './auth.service'
import { rbacService } from './rbac.service'
import { auditService } from './audit.service'
import { emailService } from './email.service'
import * as userRepo from '../repositories/user-repo'
import * as totpRepo from '../repositories/totp-repo'
import { findRoleByCode } from '../repositories/rbac-repo'
import { realClock } from '../lib/clock'
import {
  changeUserRoleSchema,
  forceLogoutSchema,
  resetUserTotpSchema,
  setUserActiveSchema,
  userListSchema,
  type ChangeUserRoleInput,
  type ResetUserTotpInput,
  type SetUserActiveInput,
  type UserListInput,
} from '../validation/admin'
import { parseInput, type UnionError } from '../validation/parse'
import type { SessionClaims } from '../lib/session'
import type { UserWithRole } from '../repositories/user-repo'

const fail = (code: string, message: string): UnionError => ({ ok: false, code, message })

const INVALID_SESSION: UnionError = fail('INVALID_SESSION', 'Your session is no longer valid. Please log in again.')
const FORBIDDEN: UnionError = fail('FORBIDDEN', 'You do not have permission to perform this action.')

async function requirePermission(code: string): Promise<SessionClaims | UnionError> {
  const session = await authService.verifySession()
  if (!session) return INVALID_SESSION
  if (!(await rbacService.hasPermission(session.userId, code))) return FORBIDDEN
  return session
}

const isError = (value: SessionClaims | UnionError): value is UnionError => 'code' in value

function serializeUser(user: UserWithRole) {
  return {
    id: user.id.toString(),
    username: user.username,
    email: user.email,
    emailVerified: user.emailVerified,
    role: { code: user.role.code },
    active: user.active,
    totpActive: user.totpActive,
    createdAt: user.createdAt.toISOString(),
  }
}

export const userAdminService = {
  async list(input: UserListInput) {
    const session = await requirePermission('user:manage')
    if (isError(session)) return session
    const parsed = parseInput(userListSchema, input)
    if (!parsed.ok) return parsed

    const { q, page, size } = parsed.data
    const [users, total] = await Promise.all([
      userRepo.list({ q, skip: (page - 1) * size, take: size }),
      userRepo.count(q),
    ])
    return {
      ok: true as const,
      data: {
        items: users.map(serializeUser),
        page,
        size,
        total,
      },
    }
  },

  async changeRole(input: ChangeUserRoleInput) {
    const session = await requirePermission('user:manage')
    if (isError(session)) return session
    const parsed = parseInput(changeUserRoleSchema, input)
    if (!parsed.ok) return parsed
    const { userId, roleKode: roleCode } = parsed.data

    const [target, role] = await Promise.all([
      userRepo.findByIdWithRole(userId),
      findRoleByCode(roleCode),
    ])
    if (!target) return fail('USER_NOT_FOUND', 'User not found.')
    if (!role) return fail('ROLE_NOT_FOUND', 'Role not found.')

    if (target.role.code === roleCode) return { ok: true as const }
    if (target.id === session.userId && roleCode !== 'ADMIN')
      return fail('CANNOT_TARGET_SELF', 'You cannot demote your own account.')

    if (target.role.code === 'ADMIN' && roleCode !== 'ADMIN') {
      const admins = await userRepo.countActiveAdmins()
      if (target.active && admins <= 1)
        return fail('LAST_ADMIN', 'This is the only active ADMIN; role change denied.')
    }

    await userRepo.updateRole(target.id, role.id)
    await auditService.log(session.userId, 'user.role', `user:${target.id}`, {
      dari: target.role.code,
      ke: roleCode,
    })
    return { ok: true as const }
  },

  async setActive(input: SetUserActiveInput) {
    const session = await requirePermission('user:manage')
    if (isError(session)) return session
    const parsed = parseInput(setUserActiveSchema, input)
    if (!parsed.ok) return parsed
    const { userId, active: active } = parsed.data

    const target = await userRepo.findByIdWithRole(userId)
    if (!target) return fail('USER_NOT_FOUND', 'User not found.')
    if (target.active === active) return { ok: true as const }
    if (target.id === session.userId && !active)
      return fail('CANNOT_TARGET_SELF', 'You cannot deactivate your own account.')

    if (!active && target.role.code === 'ADMIN' && target.active) {
      const admins = await userRepo.countActiveAdmins()
      if (admins <= 1)
        return fail('LAST_ADMIN', 'This is the only active ADMIN; deactivation denied.')
    }

    await userRepo.updateActive(target.id, active)
    await auditService.log(session.userId, 'user.active', `user:${target.id}`, { active: active })
    return { ok: true as const }
  },

  async forceLogout(input: { userId: string }) {
    const session = await requirePermission('user:manage')
    if (isError(session)) return session
    const parsed = parseInput(forceLogoutSchema, input)
    if (!parsed.ok) return parsed
    const target = await userRepo.findById(parsed.data.userId)
    if (!target) return fail('USER_NOT_FOUND', 'User not found.')

    await userRepo.revokeAllSessions(target.id)
    await auditService.log(session.userId, 'user.force-logout', `user:${target.id}`)
    return { ok: true as const }
  },

  /** Lost-device recovery — permission `totp:reset` + re-authentication + email notice. */
  async resetTotp(input: ResetUserTotpInput) {
    const session = await requirePermission('totp:reset')
    if (isError(session)) return session
    const parsed = parseInput(resetUserTotpSchema, input)
    if (!parsed.ok) return parsed
    const { userId, password } = parsed.data

    const actor = await userRepo.findByIdWithRole(session.userId)
    if (!actor || !actor.active) return INVALID_SESSION
    if (!(await bcrypt.compare(password, actor.passwordHash)))
      return fail('PASSWORD_INVALID', 'Admin password does not match.')

    const target = await userRepo.findByIdWithRole(userId)
    if (!target) return fail('USER_NOT_FOUND', 'User not found.')

    await totpRepo.resetTotp(target.id, realClock.now())
    await userRepo.revokeAllSessions(target.id)
    await auditService.log(session.userId, 'user.reset-totp', `user:${target.id}`)
    await emailService.sendEmail(
      target.email,
      'NEXAPLAY account TOTP reset',
      'Your account TOTP was reset by an admin. All old sessions have been signed out. If this was not you, contact support immediately.',
    )
    await emailService.sendAdminAlert(
      'User TOTP reset',
      `Admin ${actor.username} reset TOTP for user ${target.username} (${target.email}).`,
    )
    return { ok: true as const }
  },
}
