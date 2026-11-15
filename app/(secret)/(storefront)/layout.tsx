import type { ReactNode } from 'react'
import { StorefrontShell } from '@/components/storefront/storefront-shell'

export const instant = false

export default function SecretStorefrontLayout({ children }: { children: ReactNode }) {
  return <StorefrontShell requireAuth>{children}</StorefrontShell>
}
