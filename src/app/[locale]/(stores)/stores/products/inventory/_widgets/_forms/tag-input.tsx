'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useController, type Control } from 'react-hook-form'
import { cn } from '@/lib/utils'

type TagInputProps = {
  control: Control<any>
  name: string
  label?: string
  placeholder?: string
  help?: string
  // Returns an error message for an invalid tag, or null.
  validate?: (tag: string) => string | null
  mono?: boolean
}

// Chips + free-text input bound to a string[] form field. Enter or comma adds;
// Backspace on an empty input removes the last chip.
const TagInput = ({ control, name, label, placeholder, help, validate, mono }: TagInputProps) => {
  const { field } = useController({ control, name })
  const tags: string[] = Array.isArray(field.value) ? field.value : []
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const commit = () => {
    const tag = draft.trim().replace(/,$/, '')
    if (!tag) return
    const problem = validate?.(tag) ?? null
    if (problem) return setError(problem)
    if (!tags.some((t) => t.toLowerCase() === tag.toLowerCase())) field.onChange([...tags, tag])
    setDraft('')
    setError(null)
  }

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="bytewave-paragraph text-sm text-stone-600">{label}</label>}
      <div className="flex flex-wrap items-center gap-1.5 min-h-9 px-2 py-1.5 rounded-md border border-gray-200 bg-white focus-within:ring-1 focus-within:ring-endeavour">
        {tags.map((t) => (
          <span
            key={t}
            className={cn(
              'inline-flex items-center gap-1 rounded-md bg-endeavour/10 text-endeavour text-xs px-2 py-0.5',
              mono && 'font-mono'
            )}
          >
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => field.onChange(tags.filter((x) => x !== t))}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
              field.onChange(tags.slice(0, -1))
            }
          }}
          onBlur={commit}
          placeholder={tags.length === 0 ? placeholder : ''}
          aria-label={label ?? name}
          className={cn('flex-1 min-w-[8rem] text-sm outline-none bg-transparent', mono && 'font-mono')}
        />
      </div>
      {error ? <p className="text-xs text-red-500">{error}</p> : help ? <p className="text-xs text-gray-400">{help}</p> : null}
    </div>
  )
}

export default TagInput
