// RBAC resolution — business rules around the data (ref: docs/PLAN.md §9).
// ADMIN has everything only because the seed grants it — no hardcoding.

import { findPermissionCodesByUser, findMenusByRole } from '../repositories/rbac-repo'

export const rbacService = {
  /** Set of active permission codes the user has (via their role). */
  async resolvePermission(userId: bigint): Promise<Set<string>> {
    return findPermissionCodesByUser(userId)
  },

  async hasPermission(userId: bigint, code: string): Promise<boolean> {
    const permissions = await rbacService.resolvePermission(userId)
    return permissions.has(code)
  },

  /** All active menus the user has (via their role), ordered by `sortOrder`. */
  resolveMenu(roleId: bigint) {
    return findMenusByRole(roleId)
  },
}
