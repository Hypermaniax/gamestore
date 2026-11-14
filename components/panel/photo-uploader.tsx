'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_COUNT,
  isPhotoMime,
} from '@/src/lib/photo'

function formatFileSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024 / 1024))} MB`
}

export function PhotoUploader({
  files,
  onChange,
  disabled = false,
  max = MAX_PHOTO_COUNT,
}: {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
  max?: number
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  )

  useEffect(() => {
    return () => {
      for (const preview of previews) URL.revokeObjectURL(preview.url)
    }
  }, [previews])

  function selectPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (selected.length === 0) return

    const remaining = max - files.length
    if (selected.length > remaining) {
      setError(`Maximum ${max} photos. You can still add ${remaining} more.`)
      return
    }

    const accepted: File[] = []
    for (const file of selected) {
      if (!isPhotoMime(file.type)) {
        setError('Photos must be JPG, PNG, or WebP.')
        return
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setError(`${file.name} exceeds ${formatFileSize(MAX_PHOTO_BYTES)}.`)
        return
      }
      accepted.push(file)
    }

    setError(null)
    onChange([...files, ...accepted])
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={disabled}
        className="sr-only"
        onChange={selectPhotos}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || files.length >= max}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          Choose photos
        </Button>
        <span className="text-xs text-muted-foreground">
          {files.length}/{max} photos · JPG, PNG, WebP · max {formatFileSize(MAX_PHOTO_BYTES)}
        </span>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {previews.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {previews.map((preview, index) => (
            <div key={`${preview.file.name}-${index}`} className="group relative overflow-hidden rounded-xl border bg-muted">
              <Image
                src={preview.url}
                alt={preview.file.name}
                width={320}
                height={200}
                unoptimized
                className="h-28 w-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                className="absolute right-1.5 top-1.5"
                disabled={disabled}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                aria-label={`Remove ${preview.file.name}`}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed px-4 py-5 text-xs text-muted-foreground">
          No photos selected yet. At least one photo is required to publish the account immediately.
        </p>
      )}
    </div>
  )
}
