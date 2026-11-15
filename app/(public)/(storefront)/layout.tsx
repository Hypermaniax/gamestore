import type { ReactNode } from 'react'
import { StorefrontShell } from '@/components/storefront/storefront-shell'

export const instant = false

export default function PublicStorefrontLayout({ children }: { children: ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>
}
