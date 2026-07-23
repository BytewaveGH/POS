'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

export interface SearchableSelectOption {
  value: number | string
  label: string
  sublabel?: string
}

interface SearchableSelectProps {
  value: number | string | ''
  onChange: (value: number | string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found',
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => String(o.value) === String(value))

  const filtered = query.trim()
    ? options.filter((o) => {
        const q = query.trim().toLowerCase()
        return o.label.toLowerCase().includes(q) || (o.sublabel?.toLowerCase().includes(q) ?? false)
      })
    : options

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Focus the search input once the dropdown mounts
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  const handleSelect = (opt: SearchableSelectOption) => {
    onChange(opt.value)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-3 py-2.5 sm:py-2 bytewave-paragraph text-sm text-left transition-colors ${
          disabled
            ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
            : open
              ? 'border-endeavour ring-1 ring-endeavour'
              : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className={`truncate ${selected ? 'text-stone-700' : 'text-gray-400'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false)
                  setQuery('')
                } else if (e.key === 'Enter' && filtered.length === 1) {
                  handleSelect(filtered[0])
                }
              }}
              className="flex-1 min-w-0 text-sm bytewave-paragraph focus:outline-none placeholder:text-gray-300"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-52 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-gray-400 bytewave-paragraph">{emptyMessage}</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2.5 sm:py-2 transition-colors ${
                    String(opt.value) === String(value) ? 'bg-endeavour/10' : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="bytewave-paragraph text-sm text-stone-700 truncate">{opt.label}</p>
                  {opt.sublabel && <p className="bytewave-paragraph text-xs text-gray-400 truncate">{opt.sublabel}</p>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
