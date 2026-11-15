import { pageService } from '@/src/services/page.service'
import { parseFaqMarkdown } from '@/src/lib/faq'
import { FaqSection } from './faq-section'
import { Skeleton, SkeletonLines } from '@/components/skeletons/base'

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
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Skeleton className="h-28 w-64 max-w-md sm:h-32" />
          <SkeletonLines
            count={3}
            className="mt-5 max-w-sm"
            lineClassName="h-4"
            widths={['w-full', 'w-full', 'w-2/3']}
          />
          <Skeleton className="mt-7 h-11 w-40 rounded-full" />
          <Skeleton className="mt-4 h-3 w-32" />
        </div>
        <div className="border-t border-border">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-start justify-between gap-6 border-b border-border py-5 sm:py-6">
              <Skeleton className="h-5 w-[min(42rem,86%)]" />
              <Skeleton className="mt-0.5 size-7 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
