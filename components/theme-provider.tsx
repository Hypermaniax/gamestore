'use client'

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useServerInsertedHTML } from 'next/navigation'

type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: Theme
  setTheme: (theme: Theme | ((current: Theme) => Theme)) => void
  themes: Theme[]
}

const STORAGE_KEY = 'theme'
const DEFAULT_THEME: Theme = 'dark'
const THEMES: Theme[] = ['light', 'dark']

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='light'&&t!=='dark')t='${DEFAULT_THEME}';var e=document.documentElement;e.classList.remove('light','dark');e.classList.add(t);e.style.colorScheme=t}catch(e){}})()`

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(fallback: Theme): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : fallback
  } catch {
    return fallback
  }
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  root.style.colorScheme = theme
}

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
}: {
  children: React.ReactNode
  defaultTheme?: Theme
}) {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === 'undefined' ? defaultTheme : readStoredTheme(defaultTheme),
  )
  const inserted = useRef(false)

  useServerInsertedHTML(() => {
    if (inserted.current) return null
    inserted.current = true
    return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
  })

  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback<ThemeContextValue['setTheme']>((value) => {
    setThemeState((current) => {
      const next = typeof value === 'function' ? value(current) : value
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // localStorage can be unavailable in private/restricted contexts.
      }
      applyTheme(next)
      return next
    })
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme: theme, setTheme, themes: THEMES }),
    [theme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return (
    useContext(ThemeContext) ?? {
      theme: DEFAULT_THEME,
      resolvedTheme: DEFAULT_THEME,
      setTheme: () => {},
      themes: THEMES,
    }
  )
}
