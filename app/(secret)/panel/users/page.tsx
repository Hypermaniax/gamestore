import { userAdminService } from '@/src/services/user-admin.service'
import { PanelPageHeader } from '@/components/panel/panel-ui'
import { TablePagination } from '@/components/panel/table-pagination'
import { UsersAdmin } from './users-admin'
import { parsePageSize } from '@/src/lib/pagination'

export const instant = false

export default async function PanelUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; size?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const page = Math.max(1, Number(params.page ?? '1') || 1)
  const size = parsePageSize(params.size)
  const result = await userAdminService.list({ q, page, size })
  if (!result.ok) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{result.message}</div>
  return (
    <div>
      <PanelPageHeader title="Users" description="Roles, active status, sessions, and TOTP recovery." />
      <UsersAdmin users={result.data.items} />
      <TablePagination
        page={page}
        size={size}
        total={result.data.total}
        basePath="/panel/users"
        query={{ q }}
        label="users"
      />
    </div>
  )
}
