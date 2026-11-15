import type { ReactNode } from 'react'
import { cn } from 'cn'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton', className)} />
}

export function SkeletonLines({
  count = 2,
  widths = [],
  className,
  lineClassName = 'h-3',
}: {
  count?: number
  widths?: string[]
  className?: string
  lineClassName?: string
}) {
  return (
    <div aria-hidden="true" className={cn('space-y-2', className)}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={cn('skeleton', lineClassName, widths[index] ?? 'w-full')}
        />
      ))}
    </div>
  )
}

export function SkeletonCircle({ className }: { className?: string }) {
  return <Skeleton className={cn('rounded-full', className)} />
}

export function SkeletonButton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-8 rounded-lg', className)} />
}

export function SkeletonPill({ className }: { className?: string }) {
  return <Skeleton className={cn('h-7 rounded-full', className)} />
}

export function SkeletonPage({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}
