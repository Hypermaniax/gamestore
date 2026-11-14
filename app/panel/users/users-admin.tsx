'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  changeUserRoleAction,
  forceLogoutUserAction,
  resetUserTotpAction,
  setUserActiveAction,
} from '@/src/controllers/admin-user.controller'
import { waktu } from '@/src/lib/pesanan'

type User = {
  id: string
  username: string
  email: string
  emailVerified: boolean
  role: { code: string }
  active: boolean
  totpActive: boolean
  createdAt: string
}

export function UsersAdmin({ users }: { users: User[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [roles, setRoles] = useState<Record<string, string>>(
    Object.fromEntries(users.map((user) => [user.id, user.role.code])),
  )

  function run(task: () => Promise<{ ok: boolean; message?: string }>, message: string) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await task()
      if (!result.ok) {
        setError(result.message ?? 'Action failed.')
        return
      }
      setNotice(message)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="rounded-lg bg-brand/15 px-3 py-2 text-sm">{notice}</p> : null}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-[.1em] text-muted-foreground">
              <tr><th className="px-4 py-3 font-medium">User</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">TOTP</th><th className="px-4 py-3 font-medium">Created</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="align-top hover:bg-muted/30">
                  <td className="px-4 py-3"><p className="font-medium">{user.username}</p><p className="text-xs text-muted-foreground">{user.email}</p></td>
                  <td className="px-4 py-3">
                    <select className="field h-8 px-2" value={roles[user.id]} onChange={(event) => setRoles((value) => ({ ...value, [user.id]: event.target.value }))}>
                      <option value="ADMIN">ADMIN</option>
                      <option value="PEMBELI">PEMBELI</option>
                    </select>
                     <Button variant="ghost" size="sm" className="mt-1" disabled={pending || roles[user.id] === user.role.code} onClick={() => run(() => changeUserRoleAction({ userId: user.id, roleKode: roles[user.id] }), 'Role changed.')}>Save role</Button>
                  </td>
                  <td className="px-4 py-3"><Badge variant={user.active ? 'secondary' : 'outline'}>{user.active ? 'Active' : 'Inactive'}</Badge>{!user.emailVerified ? <p className="mt-1 text-xs text-muted-foreground">Email not verified</p> : null}</td>
                  <td className="px-4 py-3 text-xs">{user.totpActive ? 'Active' : 'Not set'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{waktu(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => setUserActiveAction({ userId: user.id, active: !user.active }), user.active ? 'User deactivated.' : 'User activated.')}>{user.active ? 'Deactivate' : 'Activate'}</Button>
                      <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => forceLogoutUserAction({ userId: user.id }), 'All user sessions revoked.')}>Force logout</Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          const password = window.prompt(`Admin password to reset TOTP for ${user.username}:`)
                          if (!password) return
                          run(() => resetUserTotpAction({ userId: user.id, password }), 'User TOTP reset.')
                        }}
                      >
                        Reset TOTP
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
