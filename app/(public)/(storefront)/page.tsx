import { Suspense } from 'react'
import { Hero } from '@/components/storefront/hero'
import {
  Catalog,
  CatalogSkeleton,
  type CatalogSearchParams,
} from '@/components/storefront/catalog'
import { FaqPreview, FaqPreviewSkeleton } from '@/components/storefront/faq-preview'
import { HowItWorks } from '@/components/storefront/how-it-works'

export default function Home({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  return (
    <>
      <Hero />
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
      <HowItWorks />
      <Suspense fallback={<FaqPreviewSkeleton />}>
        <FaqPreview />
      </Suspense>
    </>
  )
}
