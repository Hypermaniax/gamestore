'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Gamepad2, LoaderCircle, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type AccountGameOption = {
  id: string
  name: string
  active: boolean
}

export function AccountFilter({
  initialQuery,
  initialGameId,
  games,
}: {
  initialQuery: string
  initialGameId: string
  games: AccountGameOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState(initialQuery)
  const [game, setGame] = useState(initialGameId || 'all')
  const [lastInitial, setLastInitial] = useState({
    query: initialQuery,
    game: initialGameId || 'all',
  })
  const [pending, startTransition] = useTransition()
  const mounted = useRef(false)

  if (
    lastInitial.query !== initialQuery ||
    lastInitial.game !== (initialGameId || 'all')
  ) {
    setLastInitial({
      query: initialQuery,
      game: initialGameId || 'all',
    })
    setQuery(initialQuery)
    setGame(initialGameId || 'all')
  }

  useEffect(() => {
    const syncFilters = () => {
      const params = new URLSearchParams(window.location.search)
      setQuery(params.get('q') ?? '')
      setGame(params.get('gameId') ?? 'all')
    }
    window.addEventListener('popstate', syncFilters)
    return () => window.removeEventListener('popstate', syncFilters)
  }, [])

  const navigateQuery = useCallback(
    (nextQuery: string) => {
      const params = new URLSearchParams(window.location.search)
      const trimmed = nextQuery.trim()
      if (trimmed) params.set('q', trimmed)
      else params.delete('q')
      params.delete('page')
      const search = params.toString()
      startTransition(() => {
        router.replace(`${pathname}${search ? `?${search}` : ''}`, { scroll: false })
      })
    },
    [pathname, router, startTransition],
  )

  const navigateGame = useCallback(
    (value: string) => {
      const params = new URLSearchParams(window.location.search)
      if (value === 'all') params.delete('gameId')
      else params.set('gameId', value)
      params.delete('page')
      const search = params.toString()
      startTransition(() => {
        router.replace(`${pathname}${search ? `?${search}` : ''}`, { scroll: false })
      })
    },
    [pathname, router, startTransition],
  )

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }

    const timer = window.setTimeout(() => {
      const current = new URLSearchParams(window.location.search).get('q') ?? ''
      if (current === query.trim()) return
      navigateQuery(query)
    }, 450)

    return () => window.clearTimeout(timer)
  }, [query, navigateQuery])

  const updateGame = (value: string | null) => {
    if (!value) return
    setGame(value)
    navigateGame(value)
  }

  const clearSearch = () => {
    setQuery('')
    navigateQuery('')
  }

  return (
    <div
      role="search"
      aria-busy={pending}
      className="mb-5 flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          navigateQuery(query)
        }}
        className="relative min-w-0 flex-1"
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search accounts"
          placeholder="Search title or slug"
          className="h-9 pr-16 pl-8"
        />
        <div className="absolute inset-y-0 right-2 flex items-center gap-1">
          {pending ? (
            <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" aria-hidden />
          ) : null}
          {query ? (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="grid size-6 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </form>

      <Select value={game} onValueChange={updateGame}>
        <SelectTrigger
          aria-label="Filter by game"
          className="h-9 w-full gap-2 border-transparent bg-brand-ink pl-2 text-white hover:bg-brand-ink/90 sm:w-60 [&>svg]:text-white/55"
        >
          <span className="grid size-5 shrink-0 place-items-center rounded-md bg-brand text-brand-ink">
            <Gamepad2 className="size-3.5" />
          </span>
          <SelectValue>
            {games.find((item) => item.id === game)?.name ?? 'All games'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          <SelectItem value="all">All games</SelectItem>
          {games.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
              {item.active ? '' : ' (inactive)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
