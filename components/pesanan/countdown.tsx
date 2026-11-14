'use client'

import { useEffect, useState } from 'react'
import { Clock3 } from 'lucide-react'

function sisa(expiredAt: string): number {
  return Math.max(0, Math.floor((new Date(expiredAt).getTime() - Date.now()) / 1000))
}

function format(sisaDetik: number): string {
  const menit = Math.floor(sisaDetik / 60)
  const detik = sisaDetik % 60
  if (menit >= 60) {
    const jam = Math.floor(menit / 60)
    return `${jam}h ${menit % 60}m`
  }
  return `${menit}m ${String(detik).padStart(2, '0')}s`
}

export function Countdown({ expiredAt }: { expiredAt: string | null }) {
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!expiredAt) return
    const tick = () => setLeft(sisa(expiredAt))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [expiredAt])

  if (!expiredAt) return null

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-brand-deep">
      <Clock3 className="size-3.5" />
      {left === null ? 'Calculating…' : left > 0 ? `Time left: ${format(left)}` : 'Time expired'}
    </span>
  )
}
