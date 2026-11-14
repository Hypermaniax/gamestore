import Link from 'next/link'
import { ArrowUpRight, Plus } from 'lucide-react'
import { Markdown } from './markdown'
import type { FaqItem } from '@/src/lib/faq'

export function FaqSection({ items, total }: { items: FaqItem[]; total: number }) {
  return (
    <section
      id="faq"
      className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 sm:px-8 lg:scroll-mt-28 lg:px-12 lg:pb-32"
    >
      <div className="grid gap-10 border-t border-border pt-16 lg:grid-cols-[.78fr_1.22fr] lg:gap-20 lg:pt-24">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="max-w-md font-display text-[clamp(2.8rem,5vw,4.8rem)] font-bold leading-[.88] tracking-[-.065em]">
            Questions,
            <br />
            answered<span className="text-brand-deep">.</span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">
            Jawaban singkat soal pembelian akun, pembayaran, kredensial, dan garansi.
          </p>
          <Link
            href="/pages/faq"
            className="group mt-7 inline-flex h-11 items-center gap-2.5 rounded-full border border-border bg-card px-4 text-sm font-bold transition hover:border-foreground/25 hover:bg-foreground hover:text-background"
          >
            Baca semua FAQ
            <span className="grid size-6 place-items-center rounded-full bg-foreground/[.06] transition duration-300 group-hover:bg-background/15">
              <ArrowUpRight className="size-3.5" strokeWidth={2} />
            </span>
          </Link>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground/70">
            {items.length} dari {total} pertanyaan
          </p>
        </div>

        <div className="border-t border-border">
          {items.map((item) => (
            <details key={item.question} className="group border-b border-border">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 outline-none transition-colors hover:text-brand-deep focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background sm:py-6 [&::-webkit-details-marker]:hidden">
                <span className="max-w-[42rem] font-display text-base font-semibold tracking-[-.025em] sm:text-lg">
                  {item.question}
                </span>
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-open:rotate-45 group-open:border-brand-deep group-open:bg-brand group-open:text-brand-ink group-hover:border-foreground/25 group-hover:text-foreground group-open:group-hover:text-brand-ink">
                  <Plus className="size-3.5" strokeWidth={2} />
                </span>
              </summary>
              <div className="max-w-[42rem] pb-6 pr-10">
                <Markdown>{item.answer}</Markdown>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
