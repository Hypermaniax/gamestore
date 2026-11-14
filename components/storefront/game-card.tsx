// Catalog grid card — wishlist toggle, price, and the public detail page.

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Gamepad2, Heart } from 'lucide-react'
import { formatPrice, type StorefrontAccount } from '@/src/lib/storefront-catalog'
import { useStorefront } from './storefront-provider'

export function GameCard({ item }: { item: StorefrontAccount }) {
  const { wishlist, toggleWishlist } = useStorefront()
  const saved = wishlist.includes(item.slug)

  return (
    <article className="group relative rounded-[30px] bg-foreground/[.035] p-1.5 ring-1 ring-foreground/10 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1.5 hover:shadow-[0_28px_80px_-38px_rgba(17,23,25,.4)]">
      <div className="overflow-hidden rounded-[calc(30px-.375rem)] bg-card shadow-[inset_0_1px_0_rgba(255,255,255,.65)]">
        <Link
          href={`/accounts/${item.slug}`}
          className="relative block aspect-[1.18] w-full overflow-hidden text-left"
          aria-label={`View ${item.game} details`}
        >
          {item.image ? (
            <Image
              src={item.image}
              alt={`${item.game} account`}
              fill
              sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
              className="object-cover transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
              <Gamepad2 className="size-10" strokeWidth={1.5} />
            </span>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/10" />

          <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-black ring-1 ring-black/5">
            {item.type}
          </span>

          {item.originalPrice && (
            <span className="absolute right-4 top-4 rounded-full bg-brand px-2.5 py-1.5 text-[10px] font-extrabold text-brand-ink shadow-[0_8px_24px_-12px_rgba(0,0,0,.5)]">
              −{Math.round((1 - item.price / item.originalPrice) * 100)}%
            </span>
          )}

          <span className="absolute bottom-4 left-5 text-xs font-semibold text-white/75">
            {item.game}
          </span>

          <span className="absolute bottom-4 right-4 hidden size-10 translate-y-2 place-items-center rounded-full bg-brand text-brand-ink opacity-0 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-y-0 group-hover:opacity-100 md:grid">
            <ArrowUpRight className="size-4" strokeWidth={1.75} />
          </span>
        </Link>

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="line-clamp-2 font-display text-xl font-bold leading-tight tracking-tight">
                {item.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.detail}</p>
            </div>
            <button
              onClick={() => toggleWishlist(item)}
              aria-pressed={saved}
              aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
              className={`grid size-9 shrink-0 place-items-center rounded-full border transition duration-300 active:scale-90 ${
                saved
                  ? 'border-brand bg-brand text-brand-ink'
                  : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              <Heart className="size-4" strokeWidth={1.75} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4 border-t border-border pt-5">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">
                {item.promoName ? item.promoName : 'Price'}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <p className="font-display text-lg font-bold tracking-tight text-brand-deep">
                  {formatPrice(item.price)}
                </p>
                {item.originalPrice && (
                  <p className="text-[11px] font-semibold text-muted-foreground line-through">
                    {formatPrice(item.originalPrice)}
                  </p>
                )}
              </div>
            </div>

            <Link
              href={`/accounts/${item.slug}`}
              className="group/view inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground py-1.5 pl-4 pr-1.5 text-xs font-bold text-background transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand hover:text-brand-ink"
            >
              <span>View</span>
              <span className="grid size-6 place-items-center rounded-full bg-background/15 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/view:-translate-y-px group-hover/view:translate-x-0.5">
                <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
