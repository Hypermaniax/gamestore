'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Pagination as PaginationRoot,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'

type PageToken = number | 'left-ellipsis' | 'right-ellipsis'

type SharedProps = {
  page: number
  totalPages: number
  className?: string
}

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

function PagerButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'prev' | 'next'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Previous page' : 'Next page'}
      className="size-9 rounded-full border-border"
    >
      {direction === 'prev' ? (
        <ChevronLeft className="size-4" />
      ) : (
        <ChevronRight className="size-4" />
      )}
    </Button>
  )
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className = '',
}: SharedProps & { onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null

  return (
    <PaginationRoot className={`mx-0 mt-8 justify-between sm:justify-center ${className}`}>
      <PaginationContent className="gap-2">
        <PaginationItem>
          <PagerButton
            direction="prev"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          />
        </PaginationItem>

        <PaginationItem className="sm:hidden">
          <span className="min-w-28 text-center text-xs font-semibold text-muted-foreground">
            Page {page} of {totalPages}
          </span>
        </PaginationItem>

        {pageTokens(page, totalPages).map((token) => (
          <PaginationItem key={token} className="hidden sm:block">
            {typeof token === 'number' ? (
              <Button
                type="button"
                variant={token === page ? 'default' : 'outline'}
                size="icon"
                onClick={() => onPageChange(token)}
                aria-label={`Page ${token}`}
                aria-current={token === page ? 'page' : undefined}
                className={
                  token === page
                    ? 'size-9 rounded-full bg-foreground text-background hover:bg-foreground/90'
                    : 'size-9 rounded-full border-border'
                }
              >
                {token}
              </Button>
            ) : (
              <PaginationEllipsis />
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PagerButton
            direction="next"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  )
}

export function PaginationLinks({
  page,
  totalPages,
  basePath,
  query = {},
  hash,
  className = '',
}: SharedProps & {
  basePath: string
  query?: Record<string, string | undefined>
  hash?: string
}) {
  if (totalPages <= 1) return null

  const hrefForPage = (target: number) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value)
    }
    if (target > 1) params.set('page', String(target))
    const search = params.toString()
    const anchor = hash ? `#${hash}` : ''
    return search ? `${basePath}?${search}${anchor}` : `${basePath}${anchor}`
  }

  const previousHref = page > 1 ? hrefForPage(page - 1) : null
  const nextHref = page < totalPages ? hrefForPage(page + 1) : null

  return (
    <PaginationRoot className={`mx-0 mt-8 justify-between sm:justify-center ${className}`}>
      <PaginationContent className="gap-2">
        <PaginationItem>
          {previousHref ? (
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-full border-border"
              nativeButton={false}
              render={<Link href={previousHref} aria-label="Previous page" />}
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
              className="size-9 rounded-full border-border"
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}
        </PaginationItem>

        <PaginationItem className="sm:hidden">
          <span className="min-w-28 text-center text-xs font-semibold text-muted-foreground">
            Page {page} of {totalPages}
          </span>
        </PaginationItem>

        {pageTokens(page, totalPages).map((token) => (
          <PaginationItem key={token} className="hidden sm:block">
            {typeof token === 'number' ? (
              <PaginationLink
                href={hrefForPage(token)}
                isActive={token === page}
                aria-label={`Page ${token}`}
                className="size-9 rounded-full border border-border text-xs font-bold data-[active=true]:border-foreground data-[active=true]:bg-foreground data-[active=true]:text-background"
              >
                {token}
              </PaginationLink>
            ) : (
              <PaginationEllipsis />
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          {nextHref ? (
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-full border-border"
              nativeButton={false}
              render={<Link href={nextHref} aria-label="Next page" />}
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
              className="size-9 rounded-full border-border"
            >
              <ChevronRight className="size-4" />
            </Button>
          )}
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  )
}
