'use client'

import { useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '@/src/lib/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function PageSizeSelect({ value }: { value: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  const change = (next: string | null) => {
    if (!next) return
    const params = new URLSearchParams(window.location.search)
    if (Number(next) === DEFAULT_PAGE_SIZE) params.delete('size')
    else params.set('size', next)
    params.delete('page')
    const search = params.toString()
    startTransition(() => {
      router.replace(`${pathname}${search ? `?${search}` : ''}`, { scroll: false })
    })
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Rows</span>
      <Select value={String(value)} onValueChange={change}>
        <SelectTrigger aria-label="Rows per page" className="h-8 w-[72px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[72px]">
          {PAGE_SIZES.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending ? (
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
      ) : null}
    </div>
  )
}
