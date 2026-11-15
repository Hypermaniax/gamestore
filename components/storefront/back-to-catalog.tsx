'use client'

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

const CATALOG_FALLBACK = '/#catalog'

type NavigationEntryLike = {
  key: string
  url: string | null
  index: number
}

type NavigationLike = {
  currentEntry: NavigationEntryLike | null
  entries: () => NavigationEntryLike[]
  traverseTo?: (key: string) => Promise<unknown>
}

function getNavigation(): NavigationLike | null {
  if (typeof window === 'undefined') return null
  return (window as Window & { navigation?: NavigationLike }).navigation ?? null
}

function isCatalogEntry(entry: NavigationEntryLike): boolean {
  if (!entry.url || typeof window === 'undefined') return false
  try {
    const url = new URL(entry.url, window.location.href)
    return url.origin === window.location.origin && url.pathname === '/'
  } catch {
    return false
  }
}

function findCatalogEntry(navigation: NavigationLike): NavigationEntryLike | null {
  const current = navigation.currentEntry
  if (!current) return null

  const entries = navigation.entries()
  for (let index = current.index - 1; index >= 0; index -= 1) {
    const entry = entries[index]
    if (entry && isCatalogEntry(entry)) return entry
  }
  return null
}

function referrerIsCatalog(): boolean {
  if (typeof document === 'undefined' || !document.referrer) return false
  try {
    const referrer = new URL(document.referrer)
    return referrer.origin === window.location.origin && referrer.pathname === '/'
  } catch {
    return false
  }
}

export function BackToCatalog({
  children,
  className,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { children: ReactNode }) {
  const router = useRouter()

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    event.preventDefault()

    const navigation = getNavigation()
    const catalogEntry = navigation ? findCatalogEntry(navigation) : null
    if (navigation?.traverseTo && catalogEntry) {
      try {
        void Promise.resolve(navigation.traverseTo(catalogEntry.key)).catch(() =>
          router.push(CATALOG_FALLBACK),
        )
      } catch {
        router.push(CATALOG_FALLBACK)
      }
      return
    }

    if (window.history.length > 1 && referrerIsCatalog()) {
      router.back()
      return
    }

    router.push(CATALOG_FALLBACK)
  }

  return (
    <a
      {...props}
      href={CATALOG_FALLBACK}
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  )
}
