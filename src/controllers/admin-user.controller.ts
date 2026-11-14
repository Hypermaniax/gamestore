// Thin Server Action wrappers — admin user management & audit reader (docs/API.md §5.4).
// Permission checks, validation and auditing live in the services.

'use server'

import { userAdminService } from '@/src/services/user-admin.service'
import { auditService } from '@/src/services/audit.service'
import type {
  AuditListInput,
  ChangeUserRoleInput,
  ResetUserTotpInput,
  SetUserActiveInput,
  UserListInput,
} from '@/src/validation/admin'

export async function listUsersAction(input: UserListInput) {
  return userAdminService.list(input)
}

export async function changeUserRoleAction(input: ChangeUserRoleInput) {
  return userAdminService.changeRole(input)
}

export async function setUserActiveAction(input: SetUserActiveInput) {
  return userAdminService.setActive(input)
}

export async function forceLogoutUserAction(input: { userId: string }) {
  return userAdminService.forceLogout(input)
}

export async function resetUserTotpAction(input: ResetUserTotpInput) {
  return userAdminService.resetTotp(input)
}

export async function listAuditLogsAction(input: AuditListInput) {
  return auditService.list(input)
}
