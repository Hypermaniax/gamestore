import Link from 'next/link'
import { Search } from 'lucide-react'
import { storefrontService } from '@/src/services/storefront.service'
import {
  ALL_CATEGORY,
  STOREFRONT_SORTS,
  type StorefrontSort,
} from '@/src/lib/storefront-catalog'
import { GameCard } from './game-card'
import { CatalogFilters } from './catalog-filters'
import { PaginationLinks } from './pagination-controls'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

const PAGE_SIZE = 9

export function CatalogSkeleton() {
  return (
    <section
      id="catalog"
      aria-busy="true"
      aria-label="Loading catalog"
      className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
    >
      <div className="mb-10 grid gap-8 border-b border-border pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="h-3 w-36 rounded bg-muted" />
          <div className="mt-5 h-14 w-[min(36rem,92%)] rounded bg-muted sm:h-20" />
          <div className="mt-5 h-4 w-[min(28rem,100%)] rounded bg-muted" />
        </div>
        <div className="flex items-end gap-8">
          <div>
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="mt-3 h-9 w-12 rounded bg-muted" />
          </div>
          <div>
            <div className="h-3 w-12 rounded bg-muted" />
            <div className="mt-3 h-9 w-20 rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="mb-8 h-[72px] rounded-[1.9rem] border border-border bg-muted/30" />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-[420px] rounded-[30px] border border-border bg-muted/30"
          />
        ))}
      </div>
    </section>
  )
}

export type CatalogSearchParams = {
  q?: string
  type?: string
  sort?: string
  page?: string
}

function parseSort(value: string | undefined): StorefrontSort {
  return STOREFRONT_SORTS.some((option) => option.value === value)
    ? (value as StorefrontSort)
    : 'terbaru'
}

export async function Catalog({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  const params = await searchParams
  const query = params.q?.trim().slice(0, 100) || undefined
  const category = params.type?.trim() || ALL_CATEGORY
  const sort = parseSort(params.sort)
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)

  const first = await storefrontService.getCatalogPage({
    q: query,
    type: category === ALL_CATEGORY ? undefined : category,
    sort,
    page: requestedPage,
    size: PAGE_SIZE,
  })
  const totalPages = Math.max(1, Math.ceil(first.total / PAGE_SIZE))
  const safePage = Math.min(requestedPage, totalPages)
  const data =
    safePage === requestedPage
      ? first
      : await storefrontService.getCatalogPage({
          q: query,
          type: category === ALL_CATEGORY ? undefined : category,
          sort,
          page: safePage,
          size: PAGE_SIZE,
        })

  const start = (safePage - 1) * PAGE_SIZE
  const shownStart = data.accounts.length ? start + 1 : 0
  const shownEnd = start + data.accounts.length
  const paginationQuery = {
    q: query,
    type: category === ALL_CATEGORY ? undefined : category,
    sort: sort === 'terbaru' ? undefined : sort,
  }

  return (
    <section id="catalog" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mb-10 grid gap-8 border-b border-border pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="mb-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.22em] text-muted-foreground">
            <span className="font-mono text-brand-deep">01</span>
            <span className="h-px w-9 bg-border" />
            Fresh arrivals
          </p>
          <h2 className="max-w-3xl font-display text-[clamp(3.2rem,6vw,5.6rem)] font-bold leading-[.86] tracking-[-.07em]">
            Fresh inventory<span className="text-brand-deep">.</span>
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            New accounts land here first. Every listing is one of one — once it sells, it leaves
            the floor.
          </p>
        </div>

        <div className="flex items-end gap-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">
              {query || category !== ALL_CATEGORY ? 'Matches' : 'Live now'}
            </p>
            <p className="mt-1 font-display text-4xl font-bold tracking-[-.055em]">
              {data.total.toLocaleString('en-US')}
            </p>
          </div>
          <div className="h-12 w-px bg-border" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">
              Page
            </p>
            <p className="mt-1 font-display text-2xl font-bold tracking-[-.04em] tabular-nums">
              {String(safePage).padStart(2, '0')}
              <span className="text-muted-foreground/50"> / {String(totalPages).padStart(2, '0')}</span>
            </p>
          </div>
        </div>
      </div>

      <CatalogFilters
        key={`${query ?? ''}:${category}:${sort}`}
        query={query ?? ''}
        category={category}
        sort={sort}
        categories={data.categories}
        total={data.total}
        shownStart={shownStart}
        shownEnd={shownEnd}
      />

      {data.accounts.length ? (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {data.accounts.map((item) => (
              <GameCard key={item.slug} item={item} />
            ))}
          </div>
          <PaginationLinks
            page={safePage}
            totalPages={totalPages}
            basePath="/"
            query={paginationQuery}
            hash="catalog"
          />
        </>
      ) : (
        <Empty className="rounded-[26px] border border-dashed border-border py-20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle className="font-display text-xl font-bold">No accounts found</EmptyTitle>
            <EmptyDescription>
              Try another keyword or show all categories.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/#catalog" className="text-sm font-bold text-brand-deep">
              Reset search
            </Link>
          </EmptyContent>
        </Empty>
      )}
    </section>
  )
}
