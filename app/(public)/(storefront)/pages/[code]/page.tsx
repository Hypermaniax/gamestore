import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowUpRight, ChevronRight, ShieldCheck } from 'lucide-react'
import { BackToCatalog } from '@/components/storefront/back-to-catalog'
import { Markdown } from '@/components/storefront/markdown'
import { pageService } from '@/src/services/page.service'
import { HELP_TOPICS, findHelpTopic, helpHref } from '@/src/lib/help'

type Props = { params: Promise<{ code: string }> }

export const instant = false

const FALLBACK_DESCRIPTION = 'Official NexaPlay information for game account buyers.'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const result = await pageService.getPublished(code)
  if (!result.ok) return { title: 'Page not found' }

  const description = result.data.isi
    .replace(/[#>*_`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 155)

  return {
    title: result.data.title,
    description: description || FALLBACK_DESCRIPTION,
    alternates: { canonical: `/pages/${result.data.code}` },
  }
}

export default async function StaticPage({ params }: Props) {
  const { code } = await params
  const result = await pageService.getPublished(code)
  if (!result.ok) notFound()

  const topic = findHelpTopic(code)
  const meta = {
    category: topic?.category ?? 'Official page',
    description:
      topic?.description ?? 'Informasi resmi NexaPlay untuk pembeli akun game.',
  }
  const relatedTopics = HELP_TOPICS.filter((item) => item.code !== code)

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14 lg:px-12">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-muted-foreground"
      >
        <BackToCatalog className="transition hover:text-foreground">
          Catalog
        </BackToCatalog>
        <ChevronRight className="size-3" />
        <Link href="/help" className="transition hover:text-foreground">
          Help & policies
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground">{result.data.title}</span>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-28">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">
            Help & policies
          </p>

          <nav className="mt-4 hidden space-y-1 lg:block" aria-label="Help topics">
            {HELP_TOPICS.map((item) => {
              const active = item.code === code
              return (
                <Link
                  key={item.code}
                  href={helpHref(item.code)}
                  aria-current={active ? 'page' : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <Link
            href="/help"
            className="mt-5 hidden items-center gap-1.5 text-xs font-bold text-brand-deep transition hover:text-foreground lg:inline-flex"
          >
            All help topics
            <ArrowUpRight className="size-3" />
          </Link>

          <nav
            aria-label="Help topics"
            className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:hidden"
          >
            {HELP_TOPICS.map((item) => {
              const active = item.code === code
              return (
                <Link
                  key={item.code}
                  href={helpHref(item.code)}
                  aria-current={active ? 'page' : undefined}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <div>
          <header className="border-b border-border pb-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-brand-deep">
                <ShieldCheck className="size-3.5" /> {meta.category}
              </span>
              <span className="rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Version {result.data.version}
              </span>
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-[-.055em] sm:text-5xl">
              {result.data.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {meta.description}
            </p>
          </header>

          <article className="mt-8 rounded-[28px] border border-border bg-card p-6 sm:p-9">
            <Markdown>{result.data.isi}</Markdown>
          </article>

          <div className="mt-6 flex flex-col justify-between gap-4 rounded-[24px] border border-border bg-secondary/50 p-5 text-xs text-muted-foreground sm:flex-row sm:items-center">
            <div>
              <p className="font-bold text-foreground">Bantuan & kebijakan lainnya</p>
              <p className="mt-1">Baca halaman terkait sebelum melanjutkan.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {relatedTopics.map((item) => (
                <Link
                  key={item.code}
                  href={helpHref(item.code)}
                  className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 font-bold text-foreground transition hover:bg-foreground hover:text-background"
                >
                  {item.label}
                  <ArrowUpRight className="size-3" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
