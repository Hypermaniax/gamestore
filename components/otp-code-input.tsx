'use client'

import { useRef, useState } from 'react'
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react'

type OtpCodeInputProps = {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  invalid?: boolean
  autoFocus?: boolean
  labelledBy?: string
  describedBy?: string
}

export function OtpCodeInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  invalid = false,
  autoFocus = false,
  labelledBy,
  describedBy,
}: OtpCodeInputProps) {
  const [digits, setDigits] = useState<string[]>(() =>
    Array.from({ length }, (_, index) => value[index] ?? ''),
  )
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  function commit(next: string[]) {
    setDigits(next)
    onChange(next.every(Boolean) ? next.join('') : '')
  }

  function setDigit(index: number, digit: string) {
    const next = [...digits]
    next[index] = digit
    commit(next)
  }

  function fillFrom(start: number, raw: string) {
    const chars = raw.replace(/\D/g, '').slice(0, length - start).split('')
    if (chars.length === 0) return

    const next = [...digits]
    chars.forEach((char, offset) => {
      next[start + offset] = char
    })
    commit(next)
    inputs.current[Math.min(start + chars.length, length - 1)]?.focus()
  }

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value.replace(/\D/g, '')

    if (raw.length === 0) {
      setDigit(index, '')
      return
    }

    if (raw.length > 1) {
      fillFrom(index, raw)
      return
    }

    setDigit(index, raw)
    if (index < length - 1) inputs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (digits[index]) {
        setDigit(index, '')
        return
      }
      if (index > 0) {
        setDigit(index - 1, '')
        inputs.current[index - 1]?.focus()
      }
      return
    }

    if (event.key === 'Delete') {
      event.preventDefault()
      setDigit(index, '')
      return
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      inputs.current[index - 1]?.focus()
      return
    }

    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault()
      inputs.current[index + 1]?.focus()
      return
    }

    if (event.key.length === 1 && !/^\d$/.test(event.key) && !event.metaKey && !event.ctrlKey) {
      event.preventDefault()
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    fillFrom(index, event.clipboardData.getData('text'))
  }

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="grid gap-1.5 sm:gap-2.5"
      style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
    >
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(node) => {
            inputs.current[index] = node
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={index === 0 ? length : 1}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          value={digits[index] ?? ''}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.currentTarget.select()}
          className={`h-12 w-full rounded-xl border bg-card text-center font-mono text-base font-semibold text-foreground outline-none transition sm:h-14 sm:text-xl ${
            invalid
              ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20'
              : 'border-input focus:border-brand-deep focus:ring-2 focus:ring-brand/25'
          } disabled:cursor-not-allowed disabled:opacity-60`}
        />
      ))}
    </div>
  )
}
