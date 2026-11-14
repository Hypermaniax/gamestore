import { pageService } from '@/src/services/page.service'
import { parseFaqMarkdown } from '@/src/lib/faq'
import { FaqSection } from './faq-section'

const FAQ_PREVIEW_COUNT = 6

export async function FaqPreview() {
  const page = await pageService.getPublished('faq')
  if (!page.ok) return null

  const items = parseFaqMarkdown(page.data.isi)
  if (items.length === 0) return null

  return <FaqSection items={items.slice(0, FAQ_PREVIEW_COUNT)} total={items.length} />
}

export function FaqPreviewSkeleton() {
  return (
    <section
      id="faq"
      aria-busy="true"
      aria-label="Loading FAQ"
      className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 sm:px-8 lg:scroll-mt-28 lg:px-12 lg:pb-32"
    >
      <div className="grid gap-10 border-t border-border pt-16 lg:grid-cols-[.78fr_1.22fr] lg:gap-20 lg:pt-24">
        <div>
          <div className="h-20 w-64 rounded bg-muted/50" />
          <div className="mt-6 h-4 w-56 rounded bg-muted/40" />
          <div className="mt-7 h-11 w-40 rounded-full bg-muted/40" />
        </div>
        <div className="border-t border-border">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center justify-between gap-6 border-b border-border py-6">
              <div className="h-5 w-[min(26rem,78%)] rounded bg-muted/40" />
              <div className="size-7 rounded-full bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
