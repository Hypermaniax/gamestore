import { redirect } from 'next/navigation'
import { authService } from '@/src/services/auth.service'
import { rbacService } from '@/src/services/rbac.service'
import { PanelSidebar } from '@/components/panel/panel-sidebar'

export const instant = false

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await authService.verifySession()
  if (!session) redirect('/login')
  if (session.roleKode !== 'ADMIN') redirect('/login?reason=not-admin')

  const menus = await rbacService.resolveMenu(session.roleId)
  return (
    <div className="min-h-dvh bg-background">
      <PanelSidebar
        menus={menus.map((menu) => ({
          code: menu.code,
          name: menu.name,
          path: menu.path,
          icon: menu.icon,
        }))}
        username={session.username}
      />
      <main className="min-w-0 lg:pl-64">
        <div className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
