// Storefront shell — shared header/footer for the public pages. Session is read
// server-side so the header can render the signed-in identity immediately.

import type { ReactNode } from 'react'
import { connection } from 'next/server'
import { StorefrontProvider } from '@/components/storefront/storefront-provider'
import { Header } from '@/components/storefront/header'
import { Footer } from '@/components/storefront/footer'
import { LoginModal } from '@/components/storefront/login-modal'
import { Toast } from '@/components/storefront/toast'
import { authService } from '@/src/services/auth.service'
import { storefrontService } from '@/src/services/storefront.service'

export const instant = false

export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  await connection()

  const [session, catalog] = await Promise.all([
    authService.verifySession(),
    storefrontService.getCatalogSummary(),
  ])

  return (
    <StorefrontProvider
      initialUser={session?.username ?? null}
      initialRole={session?.roleKode ?? null}
      totalAccounts={catalog.total}
    >
      <div className="pointer-events-none fixed inset-0 z-50 noise opacity-[.028] mix-blend-soft-light" />
      <main className="min-h-screen overflow-x-clip bg-background text-foreground transition-colors duration-300">
        <Header />
        {children}
        <Footer />
        <LoginModal />
        <Toast />
      </main>
    </StorefrontProvider>
  )
}
