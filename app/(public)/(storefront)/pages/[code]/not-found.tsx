import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

export default function HalamanNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 pt-16 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
        <FileQuestion className="size-6" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The page you are looking for is not available yet or has been replaced.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-full bg-brand px-5 text-sm font-bold text-brand-ink"
      >
        Back to catalog
      </Link>
    </div>
  )
}
