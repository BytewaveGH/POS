'use client'

/* eslint-disable @next/next/no-img-element -- previews of owner-uploaded images */
import React, { useId, useRef, useState } from 'react'
import { ImagePlus, Link2, Loader2, Trash2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/kit/form'
import { apiErrorMessage } from '@/lib/api-error'
import { IMAGE_ACCEPT, imageProblem, isDataUrl, type ImageKind } from '@/lib/eatery/images'

// Upload (tap, or drag and drop) or paste a link, with a preview.
export const ImageField = ({
  kind,
  label,
  hint,
  value,
  onChange,
  upload,
  fallback,
}: {
  kind: ImageKind
  label: string
  hint: string
  value?: string
  onChange: (url: string | undefined) => void
  // Prepares and stores the file, resolving to its URL.
  upload: (file: File) => Promise<string>
  // Shown when there's no image (initials, pattern).
  fallback: React.ReactNode
}) => {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [linkOpen, setLinkOpen] = useState(!!value && !isDataUrl(value))

  const take = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    const problem = imageProblem(file)
    if (problem) return setError(problem)
    setBusy(true)
    try {
      onChange(await upload(file))
      setLinkOpen(false)
    } catch (err) {
      setError(apiErrorMessage(err, err instanceof Error ? err.message : 'Couldn’t upload the image.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-semibold text-stone-700">{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void take(e.dataTransfer.files?.[0])
        }}
        className={cn(
          'flex items-center gap-3 rounded-2xl border-2 border-dashed p-3 transition-colors',
          dragging ? 'border-endeavour bg-endeavour/[0.04]' : 'border-stone-200'
        )}
      >
        <div
          className={cn(
            'relative flex-shrink-0 overflow-hidden bg-stone-100',
            kind === 'logo' ? 'h-16 w-16 rounded-2xl' : kind === 'item' ? 'h-20 w-20 rounded-xl' : 'h-16 w-28 rounded-xl'
          )}
        >
          {value ? <img src={value} alt={`${label} preview`} className="h-full w-full object-cover" /> : fallback}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-endeavour" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-endeavour px-3 text-xs font-bold text-white hover:bg-veniceBlue disabled:opacity-50"
            >
              {value ? <Upload className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
              {value ? 'Replace' : 'Upload'}
            </button>
            <button
              type="button"
              onClick={() => setLinkOpen((v) => !v)}
              aria-expanded={linkOpen}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-stone-200 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-50"
            >
              <Link2 className="h-3.5 w-3.5" /> Link
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(undefined)}
                aria-label={`Remove ${label.toLowerCase()}`}
                className="inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-stone-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-stone-400">{hint} · or drop an image here</p>
        </div>
        <input
          ref={input}
          id={id}
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          aria-label={`Upload ${label.toLowerCase()}`}
          onChange={(e) => {
            void take(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      {linkOpen && (
        <Input
          aria-label={`${label} link`}
          value={value && !isDataUrl(value) ? value : ''}
          onChange={(e) => onChange(e.target.value.trim() || undefined)}
          placeholder="https://…"
        />
      )}
      {error && (
        <p role="alert" className="text-xs font-semibold text-rose-600">
          {error}
        </p>
      )}
    </div>
  )
}
