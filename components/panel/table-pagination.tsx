import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DEFAULT_PAGE_SIZE } from '@/src/lib/pagination'
import { PageSizeSelect } from './page-size-select'

type PageToken = number | 'left-ellipsis' | 'right-ellipsis'

function pageTokens(page: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const left = Math.max(2, page - 1)
  const right = Math.min(totalPages - 1, page + 1)
  const tokens: PageToken[] = [1]

  if (left > 2) tokens.push('left-ellipsis')
  for (let current = left; current <= right; current += 1) tokens.push(current)
  if (right < totalPages - 1) tokens.push('right-ellipsis')
  tokens.push(totalPages)

  return tokens
}

export function TablePagination({
  page,
  size,
  total,
  basePath,
  query = {},
  label = 'items',
  embedded = false,
}: {
  page: number
  size: number
  total: number
  basePath: string
  query?: Record<string, string | undefined>
  label?: string
  embedded?: boolean
}) {
  if (total === 0) return null

  const totalPages = Math.max(1, Math.ceil(total / size))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const from = (currentPage - 1) * size + 1
  const to = Math.min(currentPage * size, total)

  const hrefForPage = (target: number) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value)
    }
    if (size !== DEFAULT_PAGE_SIZE) params.set('size', String(size))
    if (target > 1) params.set('page', String(target))
    const search = params.toString()
    return search ? `${basePath}?${search}` : basePath
  }

  return (
    <div
      className={
        embedded
          ? 'flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
          : 'mt-4 flex flex-col gap-3 rounded-2xl border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between'
      }
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-xs text-muted-foreground">
          Showing{' '}
          <span className="font-medium tabular-nums text-foreground">
            {from}–{to}
          </span>{' '}
          of <span className="font-medium tabular-nums text-foreground">{total}</span> {label}
        </p>
        <PageSizeSelect value={size} />
      </div>

      {totalPages > 1 ? (
        <nav aria-label="Table pagination" className="flex items-center gap-1.5">
          {currentPage > 1 ? (
            <Button
              variant="outline"
              size="icon"
              nativeButton={false}
              className="size-8 rounded-full"
              render={<Link href={hrefForPage(currentPage - 1)} aria-label="Previous page" />}
            >
              <ChevronLeft className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled
              aria-label="Previous page"
              className="size-8 rounded-full"
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}

          <span className="min-w-24 text-center text-xs font-medium text-muted-foreground sm:hidden">
            Page {currentPage} of {totalPages}
          </span>

          <span className="hidden items-center gap-1 sm:flex">
            {pageTokens(currentPage, totalPages).map((token) =>
              typeof token === 'number' ? (
                <Button
                  key={token}
                  variant={token === currentPage ? 'default' : 'outline'}
                  size="icon"
                  nativeButton={false}
                  aria-current={token === currentPage ? 'page' : undefined}
                  aria-label={`Page ${token}`}
                  className={`size-8 rounded-full text-xs tabular-nums ${
                    token === currentPage ? 'bg-foreground text-background hover:bg-foreground/90' : ''
                  }`}
                  render={<Link href={hrefForPage(token)} />}
                >
                  {token}
                </Button>
              ) : (
                <span
                  key={token}
                  aria-hidden
                  className="grid size-8 place-items-center text-xs text-muted-foreground"
                >
                  …
                </span>
              ),
            )}
          </span>

          {currentPage < totalPages ? (
            <Button
              variant="outline"
              size="icon"
              nativeButton={false}
              className="size-8 rounded-full"
              render={<Link href={hrefForPage(currentPage + 1)} aria-label="Next page" />}
            >
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled
              aria-label="Next page"
              className="size-8 rounded-full"
            >
              <ChevronRight className="size-4" />
            </Button>
          )}
        </nav>
      ) : null}
    </div>
  )
}
