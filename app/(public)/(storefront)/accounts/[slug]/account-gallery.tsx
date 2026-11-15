'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Gamepad2, TicketPercent } from 'lucide-react'

export function AccountGallery({
  photos,
  game,
  type,
  promotion,
}: {
  photos: string[]
  game: string
  type: string
  promotion: boolean
}) {
  const [active, setActive] = useState(0)
  const cover = photos[active]
  const hasMultiple = photos.length > 1

  const goTo = (index: number) => setActive((index + photos.length) % photos.length)

  return (
    <div className="rounded-[32px] bg-foreground/[.035] p-1.5 ring-1 ring-foreground/10 shadow-[0_28px_80px_-52px_rgba(17,23,25,.45)]">
      <div className="overflow-hidden rounded-[calc(32px-.375rem)] bg-card">
        <div className="group relative aspect-[4/3] overflow-hidden bg-secondary sm:aspect-[16/10]">
          {cover ? (
            <Image
              key={cover}
              src={cover}
              alt={`Photo ${active + 1} of ${game} account`}
              fill
              loading="eager"
              sizes="(min-width: 1024px) 860px, 100vw"
              className="object-cover transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.015]"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              <Gamepad2 className="size-14" strokeWidth={1.5} />
            </span>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

          <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] text-black ring-1 ring-black/5 sm:left-5 sm:top-5">
            {type}
          </span>

          {promotion && (
            <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-brand-ink sm:right-5 sm:top-5">
              <TicketPercent className="size-3.5" strokeWidth={2} /> Active promotion
            </span>
          )}

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={() => goTo(active - 1)}
                aria-label="Previous photo"
                className="absolute left-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm transition duration-300 hover:bg-brand hover:text-brand-ink focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <ChevronLeft className="size-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => goTo(active + 1)}
                aria-label="Next photo"
                className="absolute right-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm transition duration-300 hover:bg-brand hover:text-brand-ink focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <ChevronRight className="size-4" strokeWidth={2} />
              </button>

              <span
                aria-live="polite"
                className="absolute bottom-4 right-4 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 font-mono text-[10px] tracking-[.12em] text-white sm:bottom-5 sm:right-5"
              >
                {String(active + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
              </span>
            </>
          )}
        </div>

        {hasMultiple && (
          <div
            role="group"
            aria-label="Account photo gallery"
            className="hide-scrollbar flex gap-2 overflow-x-auto border-t border-border p-3 sm:p-4"
          >
            {photos.map((photo, index) => {
              const selected = index === active
              return (
                <button
                  key={`${photo}-${index}`}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Show photo ${index + 1}`}
                  onClick={() => setActive(index)}
                  className={`relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-xl border bg-secondary transition duration-300 sm:w-24 ${
                    selected
                      ? 'border-brand-deep ring-2 ring-brand/30'
                      : 'border-transparent opacity-55 hover:opacity-100'
                  }`}
                >
                  <Image src={photo} alt="" fill sizes="96px" className="object-cover" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
