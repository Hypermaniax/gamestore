import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Markdown } from '@/components/storefront/markdown'
import { pageService } from '@/src/services/page.service'

type Props = { params: Promise<{ code: string }> }

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

  return (
    <div className="mx-auto max-w-[900px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14 lg:px-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to catalog
      </Link>

      <header className="mt-7 border-b border-border pb-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-brand-deep">
            <ShieldCheck className="size-3.5" /> Official page
          </span>
          <span className="rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">
            Version {result.data.version}
          </span>
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-[-.055em] sm:text-5xl">
          {result.data.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Applies to all purchases on NexaPlay. The version shown here is the version agreed to at
          checkout.
        </p>
      </header>

      <article className="mt-8 rounded-[28px] border border-border bg-card p-6 sm:p-9">
        <Markdown>{result.data.isi}</Markdown>
      </article>

      <div className="mt-6 flex flex-col justify-between gap-4 rounded-[24px] border border-border bg-secondary/50 p-5 text-xs text-muted-foreground sm:flex-row sm:items-center">
        <p>Have other questions? Check the FAQ or contact the NexaPlay team.</p>
        <Link
          href="/pages/faq"
          className="inline-flex w-fit items-center rounded-full border border-border bg-card px-4 py-2 font-bold text-foreground transition hover:bg-foreground hover:text-background"
        >
          Open FAQ
        </Link>
      </div>
    </div>
  )
}
