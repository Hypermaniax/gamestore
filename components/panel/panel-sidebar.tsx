'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  FileText,
  Gamepad2,
  LayoutDashboard,
  Menu as MenuIcon,
  ReceiptText,
  Receipt,
  Settings,
  ShieldCheck,
  Swords,
  Tag,
  Ticket,
  Users,
  Webhook,
  X,
  BarChart3,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { logoutAction } from '@/src/controllers/auth.controller'

export type PanelMenu = {
  code: string
  name: string
  path: string
  icon: string | null
}

const ICONS: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard,
  Gamepad2,
  Swords,
  Ticket,
  Tag,
  ReceiptText,
  Receipt,
  FileText,
  Settings,
  ShieldCheck,
  Users,
  Webhook,
  BarChart3,
}

function PanelNav({ menus, onNavigate }: { menus: PanelMenu[]; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex grow flex-col gap-1 overflow-y-auto px-3 pb-4">
      {menus.map((menu) => {
        const Icon = ICONS[menu.icon ?? ''] ?? LayoutDashboard
        const active =
          menu.path === '/panel'
            ? pathname === '/panel' || pathname === '/panel/dashboard'
            : pathname === menu.path || pathname.startsWith(`${menu.path}/`)
        return (
          <Link
            key={menu.code}
            href={menu.path}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? 'bg-brand text-brand-ink shadow-[0_0_0_1px_rgba(111,144,24,.18)]'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
            }`}
          >
            <Icon className={`size-4 ${active ? '' : 'text-muted-foreground/80'}`} />
            <span className="truncate">{menu.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function Brand() {
  return (
    <Link href="/panel" className="flex items-center gap-2.5">
      <span className="grid size-8 rotate-3 place-items-center rounded-[9px] bg-brand text-brand-ink">
        <Sparkles className="size-4" />
      </span>
      <span className="leading-none">
        <span className="block font-display text-base font-bold tracking-[-0.04em]">
          NEXA<span className="text-brand-deep">PLAY</span>
        </span>
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">
          panel
        </span>
      </span>
    </Link>
  )
}

function SidebarFooter() {
  return (
    <div className="border-t border-sidebar-border p-3">
      <Link
        href="/"
        className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
      >
        <Sparkles className="size-4" />
        View store
      </Link>
      <form action={logoutAction}>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 text-muted-foreground hover:text-foreground"
          type="submit"
        >
          Log out
        </Button>
      </form>
    </div>
  )
}

export function PanelSidebar({
  menus,
  username,
}: {
  menus: PanelMenu[]
  username: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-start justify-between px-4 pb-4 pt-5">
          <Brand />
          <ThemeToggle />
        </div>
        <div className="mx-4 mb-4 rounded-lg border border-sidebar-border bg-background/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
            Signed in as
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">{username}</p>
        </div>
        <PanelNav menus={menus} />
        <SidebarFooter />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur lg:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open panel menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <MenuIcon className="size-5" />
          </Button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
                aria-label="Close panel menu"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(19rem,86vw)] flex-col border-r bg-sidebar shadow-2xl">
            <div className="flex items-start justify-between px-4 pb-4 pt-5">
              <Brand />
              <Button
                variant="ghost"
                size="icon"
            aria-label="Close panel menu"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <div className="mx-4 mb-4 rounded-lg border border-sidebar-border bg-background/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
                Signed in as
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold">{username}</p>
            </div>
            <PanelNav menus={menus} onNavigate={() => setOpen(false)} />
            <SidebarFooter />
          </aside>
        </div>
      )}
    </>
  )
}
