'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import type { StorefrontAccount } from '@/src/lib/storefront-catalog'
import { logoutAction } from '@/src/controllers/auth.controller'

type StorefrontContextValue = {
  user: string | null
  role: string | null
  emailVerified: boolean
  setUser: (name: string | null) => void
  setEmailTerverifikasi: (value: boolean) => void
  logout: () => Promise<void>
  wishlist: string[]
  toggleWishlist: (item: StorefrontAccount) => void
  totalAccounts: number
  loginOpen: boolean
  setLoginOpen: (open: boolean) => void
  toast: string | null
  notify: (message: string) => void
  closeModals: () => void
  scrollToCatalog: () => void
}

const StorefrontContext = createContext<StorefrontContextValue | null>(null)

export function StorefrontProvider({
  initialUser,
  initialRole,
  totalAccounts,
  children,
}: {
  initialUser: string | null
  initialRole: string | null
  totalAccounts: number
  children: ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<string | null>(initialUser)
  const [role, setRole] = useState<string | null>(initialRole)
  const [emailVerified, setEmailTerverifikasi] = useState(false)
  const [wishlist, setWishlist] = useState<string[]>([])
  const [loginOpen, setLoginOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const notify = useCallback((message: string) => setToast(message), [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!loginOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLoginOpen(false)
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [loginOpen])

  const closeModals = useCallback(() => setLoginOpen(false), [])

  const logout = useCallback(async () => {
    await logoutAction()
    setUser(null)
    setRole(null)
    setEmailTerverifikasi(false)
    notify('You have signed out')
    router.refresh()
  }, [notify, router])

  const toggleWishlist = useCallback(
    (item: StorefrontAccount) => {
      setWishlist((list) => {
        const has = list.includes(item.slug)
        notify(has ? 'Removed from favorites' : `${item.game} saved to favorites`)
        return has ? list.filter((slug) => slug !== item.slug) : [...list, item.slug]
      })
    },
    [notify],
  )

  const scrollToCatalog = useCallback(() => {
    document.querySelector('#catalog')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const value: StorefrontContextValue = {
    user,
    role,
    emailVerified,
    setUser,
    setEmailTerverifikasi,
    logout,
    wishlist,
    toggleWishlist,
    totalAccounts,
    loginOpen,
    setLoginOpen,
    toast,
    notify,
    closeModals,
    scrollToCatalog,
  }

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>
}

export function useStorefront() {
  const context = useContext(StorefrontContext)
  if (!context) throw new Error('useStorefront must be used inside StorefrontProvider')
  return context
}
