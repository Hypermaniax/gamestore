'use client'

import { useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import {
  ALL_CATEGORY,
  STOREFRONT_SORTS,
  type StorefrontCategory,
  type StorefrontSort,
} from '@/src/lib/storefront-catalog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Props = {
  query: string
  category: string
  sort: StorefrontSort
  categories: StorefrontCategory[]
  total: number
  shownStart: number
  shownEnd: number
}

export function CatalogFilters({
  query,
  category,
  sort,
  categories,
  total,
  shownStart,
  shownEnd,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(query)
  const activeCategory = categories.find((item) => item.code === category)

  const hrefFor = (next: { q?: string; type?: string; sort?: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    params.delete('page')
    const search = params.toString()
    return `${pathname}${search ? `?${search}` : ''}#catalog`
  }

  const goTo = (href: string) => {
    startTransition(() => router.push(href, { scroll: false }))
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    goTo(hrefFor({ q: searchValue.trim() || undefined }))
    document.querySelector('#catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const updateSort = (value: StorefrontSort) => {
    goTo(hrefFor({ sort: value }))
  }

  return (
    <>
      <div className="relative z-30 mb-8 rounded-[1.9rem] border border-border bg-background/90 p-2 shadow-[0_22px_60px_-42px_rgba(17,23,25,.55)] lg:sticky lg:top-[84px] lg:backdrop-blur-xl">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <form
            onSubmit={submitSearch}
            className="flex h-12 items-center gap-3 rounded-[1.35rem] bg-card px-4 ring-1 ring-border/70 transition focus-within:ring-brand-deep lg:w-80"
            aria-busy={pending}
          >
            <Search className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
              placeholder="Search the catalog..."
              aria-label="Search accounts"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('')
                  goTo(hrefFor({ q: undefined }))
                }}
                aria-label="Clear search"
                className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </form>

          <div className="hide-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto rounded-[1.35rem] bg-foreground/[.025] p-1" role="tablist" aria-label="Game categories">
            {categories.map((item) => {
              const active = category === item.code
              return (
                <Link
                  key={item.code}
                  href={hrefFor({ type: item.code === ALL_CATEGORY ? undefined : item.code })}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    document.querySelector('#catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-[1rem] px-4 text-xs font-bold transition duration-300 ${
                    active
                      ? 'bg-foreground text-background shadow-[0_6px_18px_-10px_rgba(17,23,25,.6)]'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground'
                  }`}
                >
                  {item.name}
                  <span className="text-[10px] opacity-60">{item.count}</span>
                </Link>
              )
            })}
          </div>

          <label className="flex items-center gap-2 px-2 text-xs font-semibold text-muted-foreground">
            Sort
            <Select value={sort} onValueChange={(value) => updateSort(value as StorefrontSort)}>
              <SelectTrigger
                aria-label="Sort accounts"
                className="h-10 rounded-[1rem] border-border bg-card px-4 text-xs font-bold focus-visible:border-brand-deep focus-visible:ring-0"
              >
                <SelectValue>
                  {STOREFRONT_SORTS.find((option) => option.value === sort)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                  {STOREFRONT_SORTS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
        </div>
      </div>

      <p className="mb-5 text-xs font-semibold text-muted-foreground" aria-live="polite">
        Showing {shownStart}–{shownEnd} of {total} accounts
        {category !== ALL_CATEGORY && activeCategory && ` · ${activeCategory.name}`}
        {query && ` · “${query}”`}
      </p>
    </>
  )
}
