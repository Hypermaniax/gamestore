import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export function AuthShell({
  children,
  wide = false,
}: {
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none fixed inset-0 z-0 noise opacity-[0.028] mix-blend-soft-light" />
      <div className="absolute left-5 top-5 z-10 flex items-center gap-3 sm:left-8 sm:top-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Back to home">
          <span className="grid size-9 rotate-3 place-items-center rounded-[10px] bg-brand text-brand-ink">
            <Sparkles className="size-5" />
          </span>
          <span className="font-display text-xl font-bold tracking-[-0.04em]">
            NEXA<span className="text-brand-deep">PLAY</span>
          </span>
        </Link>
      </div>
      <div className="absolute right-5 top-5 z-10 sm:right-8 sm:top-8">
        <ThemeToggle />
      </div>

      <div
        className={`relative z-10 w-full rounded-[28px] border border-border bg-popover p-8 shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:p-10 ${
          wide ? "max-w-3xl" : "max-w-md"
        }`}
      >
        {children}
      </div>
    </main>
  )
}
