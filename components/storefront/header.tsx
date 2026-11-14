// Sticky storefront header — scroll state, theme toggle, session entry point.

'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/components/theme-provider'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, HelpCircle, LayoutDashboard, LogOut, Mail, Menu, Moon, ReceiptText, Sparkles, Sun, User } from 'lucide-react'
import { useStorefront } from './storefront-provider'

export function Header() {
  const { user, role, logout, scrollToCatalog, totalAccounts, setLoginOpen } =
    useStorefront()
  const { resolvedTheme, setTheme } = useTheme()
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const initial = user?.slice(0, 1).toUpperCase() ?? ''

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goTo = (selector: string) => {
    setMobileOpen(false)
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setMobileOpen(false)
          setAccountOpen(false)
        }
      }}
      className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors duration-300 ${
        scrolled
          ? 'border-border bg-background/85'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <button
          className="flex items-center gap-3"
          onClick={() => {
            setMobileOpen(false)
            setAccountOpen(false)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          aria-label="Back to top"
        >
          <span className="grid size-9 rotate-3 place-items-center rounded-[10px] bg-brand text-brand-ink shadow-[0_0_28px_rgba(200,255,54,.18)]">
            <Sparkles className="size-5" />
          </span>
          <span className="font-display text-xl font-bold tracking-[-0.04em]">
            NEXA<span className="text-brand-deep">PLAY</span>
          </span>
        </button>

        <nav className="hidden items-center gap-8 text-sm font-medium lg:flex">
          {isHome ? (
            <button onClick={scrollToCatalog} className="nav-link">
              Explore
            </button>
          ) : (
            <Link href="/#catalog" className="nav-link">
              Explore
            </Link>
          )}
          {isHome ? (
            <button onClick={scrollToCatalog} className="nav-link">
              Game
            </button>
          ) : (
            <Link href="/#catalog" className="nav-link">
              Game
            </Link>
          )}
          {isHome ? (
            <button onClick={() => goTo('#how')} className="nav-link">
              How to buy
            </button>
          ) : (
            <Link href="/#how" className="nav-link">
              How to buy
            </Link>
          )}
          <span className="rounded-full border border-brand-deep/40 bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[.14em] text-brand-deep">
            {totalAccounts.toLocaleString('id-ID')} active accounts
          </span>
        </nav>

        <div className="flex items-center gap-2">
          <button
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="icon-button"
          >
            <Sun className="size-5 dark:hidden" />
            <Moon className="hidden size-5 dark:block" />
          </button>
          {user ? (
            <div
              className="relative hidden lg:block"
              onKeyDown={(event) => {
                if (event.key === 'Escape') setAccountOpen(false)
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setAccountOpen(false)
                }
              }}
            >
              <button
                onClick={() => {
                  setMobileOpen(false)
                  setAccountOpen((value) => !value)
                }}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-controls="account-menu"
                className="flex h-11 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm font-semibold transition hover:bg-muted"
              >
                <span className="grid size-8 place-items-center rounded-full bg-brand text-xs font-extrabold text-brand-ink">
                  {initial}
                </span>
                <span className="max-w-32 truncate">{user}</span>
                <ChevronDown
                  className={`size-3.5 text-muted-foreground transition-transform ${
                    accountOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {accountOpen && (
                <div
                  id="account-menu"
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-border bg-popover p-2 shadow-2xl"
                >
                  <div className="px-3 pb-3 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">
                      Signed in as
                    </p>
                    <p className="mt-1 truncate text-sm font-bold">{user}</p>
                  </div>
                  <div className="space-y-0.5 border-t border-border pt-1.5">
                    <Link
                      href="/account"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-muted"
                    >
                      <User className="size-4 text-muted-foreground" />
                      My account
                    </Link>
                    <Link
                      href="/orders"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-muted"
                    >
                      <ReceiptText className="size-4 text-muted-foreground" />
                      My orders
                    </Link>
                    <Link
                      href="/account#change-email"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-muted"
                    >
                      <Mail className="size-4 text-muted-foreground" />
                      Change email
                    </Link>
                    <Link
                      href="/#how"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-muted"
                    >
                      <HelpCircle className="size-4 text-muted-foreground" />
                      How to buy
                    </Link>
                    {role === 'ADMIN' ? (
                      <Link
                        href="/panel"
                        role="menuitem"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-brand-deep transition hover:bg-muted"
                      >
                        <LayoutDashboard className="size-4" />
                        Admin panel
                      </Link>
                    ) : null}
                  </div>
                  <div className="mt-1.5 border-t border-border pt-1.5">
                    <button
                      role="menuitem"
                      onClick={() => {
                        setAccountOpen(false)
                        void logout()
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-destructive transition hover:bg-destructive/10"
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="hidden h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold transition hover:bg-foreground hover:text-background lg:flex"
            >
              <User className="size-4" /> Sign in
            </button>
          )}
          <button
            onClick={() => {
              setAccountOpen(false)
              setMobileOpen((value) => !value)
            }}
            className="icon-button lg:hidden"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-x-0 top-[72px] z-30 h-[calc(100dvh-72px)] cursor-default bg-black/20 backdrop-blur-[1px] lg:hidden"
          />
          <div className="absolute inset-x-4 top-[72px] z-40 rounded-2xl border border-border bg-popover p-3 shadow-2xl lg:hidden">
          {[
            ['Explore accounts', '#catalog'],
            ['Popular games', '#catalog'],
            ['How to buy', '#how'],
          ].map(([item, target]) =>
            isHome ? (
              <button
                key={item}
                onClick={() => goTo(target)}
                className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold hover:bg-muted"
              >
                {item}
              </button>
            ) : (
              <Link
                key={item}
                href={`/${target}`}
                onClick={() => setMobileOpen(false)}
                className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold hover:bg-muted"
              >
                {item}
              </Link>
            ),
          )}
          {user ? (
            <>
              <div className="mt-2 rounded-2xl border border-border bg-background/40 p-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-brand-ink">
                    {initial}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{user}</p>
                    <p className="text-[11px] text-muted-foreground">NEXAPLAY account</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-0.5">
                  <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted"
                  >
                    <User className="size-4 text-muted-foreground" />
                    My account
                  </Link>
                  <Link
                    href="/orders"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted"
                  >
                    <ReceiptText className="size-4 text-muted-foreground" />
                    My orders
                  </Link>
                  <Link
                    href="/account#change-email"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted"
                  >
                    <Mail className="size-4 text-muted-foreground" />
                    Change email
                  </Link>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileOpen(false)
                  void logout()
                }}
                className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-left text-xs font-semibold text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setLoginOpen(true)
                setMobileOpen(false)
              }}
              className="mt-2 w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-brand-ink"
            >
              Sign in to your account
            </button>
          )}
          {role === 'ADMIN' && (
            <Link
              href="/panel"
              onClick={() => setMobileOpen(false)}
              className="mt-1 block w-full rounded-xl px-4 py-3 text-left text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Admin panel
            </Link>
          )}
          </div>
        </>
      )}
    </header>
  )
}
