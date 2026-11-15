import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, FileText, HelpCircle, LockKeyhole, ShieldCheck } from 'lucide-react'
import { pageService } from '@/src/services/page.service'
import { HELP_TOPICS, helpHref } from '@/src/lib/help'

export const instant = false

export const metadata: Metadata = {
  title: 'Help & policies',
  description:
    'FAQ, garansi, syarat dan ketentuan, serta kebijakan privasi NexaPlay dalam satu tempat.',
  alternates: { canonical: '/help' },
}

const ICONS = {
  faq: HelpCircle,
  warranty: ShieldCheck,
  'terms-and-conditions': FileText,
  privacy: LockKeyhole,
} as const

export default async function HelpPage() {
  const topics = await Promise.all(
    HELP_TOPICS.map(async (topic) => {
      const page = await pageService.getPublished(topic.code)
      return {
        ...topic,
        title: page.ok ? page.data.title : topic.label,
        version: page.ok ? page.data.version : null,
      }
    }),
  )

  const availableTopics = topics.filter((topic) => topic.version !== null)

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14 lg:px-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to catalog
      </Link>

      <header className="mt-8 grid gap-10 border-b border-border pb-12 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
        <div>
          <h1 className="font-display text-[clamp(3.4rem,7.2vw,6.6rem)] font-bold leading-[.84] tracking-[-.075em]">
            Help &
            <br />
            policies<span className="text-brand-deep">.</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            Semua yang perlu kamu tahu sebelum, selama, dan setelah membeli akun. Mulai dari
            pertanyaan umum sampai ketentuan resmi yang berlaku saat checkout.
          </p>
        </div>

        <div className="max-w-sm lg:justify-self-end">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">
            Official documents
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Setiap halaman dibaca dari versi terbit terakhir. Versi inilah yang kamu setujui saat
            menyelesaikan pesanan.
          </p>
        </div>
      </header>

      <section className="mt-12 grid gap-10 lg:grid-cols-[.68fr_1.32fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="max-w-xs font-display text-2xl font-bold tracking-[-.04em] sm:text-3xl">
            Empat dokumen resmi.
          </h2>
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
            Baca bagian yang paling relevan dengan kebutuhanmu. Kamu bisa kembali ke halaman ini
            kapan saja lewat footer.
          </p>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground/70">
            {availableTopics.length} halaman aktif
          </p>
        </div>

        <div className="border-t border-border">
          {availableTopics.map((topic) => {
            const Icon = ICONS[topic.code]
            return (
              <Link
                key={topic.code}
                href={helpHref(topic.code)}
                className="group flex items-start gap-4 border-b border-border py-7 transition-colors hover:bg-foreground/[.025] sm:gap-5"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition duration-300 group-hover:border-brand-deep group-hover:bg-brand group-hover:text-brand-ink">
                  <Icon className="size-4" strokeWidth={1.8} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <h3 className="font-display text-xl font-bold tracking-[-.035em] sm:text-2xl">
                      {topic.label}
                    </h3>
                    {topic.version !== null ? (
                      <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.12em] text-muted-foreground">
                        v{topic.version}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                    {topic.description}
                  </p>
                </div>

                <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:border-foreground group-hover:bg-foreground group-hover:text-background">
                  <ArrowUpRight className="size-3.5" strokeWidth={2} />
                </span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
