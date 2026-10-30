'use client'

import React, { useMemo } from 'react'
import { Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/eatery/menu'
import { applyStyle, type DesignStyle } from '@/lib/eatery/styles'
import { FONTS, type ThemeConfig } from '@/lib/eatery/theme'
import { BrandMark, Cover, ThemeScope } from '@/components/eatery/theme-scope'

type Dish = { name: string; price: number }

// A live miniature of the storefront — header, two menu cards and a button —
// rendered with the real theme engine, using the restaurant's own name and
// dishes.
export const MiniStorefront = ({
  theme,
  name,
  dishes,
  currency,
}: {
  theme: ThemeConfig
  name: string
  dishes: Dish[]
  currency: string
}) => {
  const sample = dishes.length
    ? dishes.slice(0, 2)
    : [
        { name: 'House special', price: 85 },
        { name: 'Chef’s pick', price: 60 },
      ]
  return (
    <ThemeScope theme={theme} className="pointer-events-none relative">
      <Cover theme={{ ...theme, imagery: { ...theme.imagery, coverUrl: undefined } }} className="h-16">
        <div className="flex h-full items-end gap-2 px-3 pb-2">
          <BrandMark restaurant={{ name, theme: { ...theme, imagery: { ...theme.imagery, logoUrl: undefined } } }} size={26} />
          <span className="e-display truncate text-lg leading-none" style={{ color: 'var(--e-cover-ink)' }}>
            {name}
          </span>
        </div>
      </Cover>
      <div className="space-y-2 p-2.5" aria-hidden>
        {sample.map((d) => (
          <div key={d.name} className="e-card flex items-center gap-2 px-2.5 py-2">
            <span className="min-w-0 flex-1">
              <span className="e-display block truncate text-[13px] leading-tight">{d.name}</span>
              <span className="e-price text-[11px]">{formatMoney(d.price, currency)}</span>
            </span>
            <span className="e-btn !min-h-0 !px-0 h-6 w-6" style={{ borderRadius: 'var(--e-radius-control)' }}>
              <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          </div>
        ))}
      </div>
    </ThemeScope>
  )
}

// A style to pick, previewed in miniature.
export const StyleCard = ({
  style,
  base,
  name,
  dishes,
  currency,
  selected,
  onSelect,
}: {
  style: DesignStyle
  base: ThemeConfig
  name: string
  dishes: Dish[]
  currency: string
  selected: boolean
  onSelect: () => void
}) => {
  const theme = useMemo(() => applyStyle(base, style), [base, style])
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${style.name} style: ${style.description}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-endeavour',
        selected ? 'border-endeavour ring-2 ring-endeavour/30' : 'border-stone-200 hover:-translate-y-0.5 hover:shadow-lg'
      )}
    >
      <MiniStorefront theme={theme} name={name} dishes={dishes} currency={currency} />
      <div className="flex flex-1 flex-col border-t border-stone-100 p-3">
        <p className="flex items-center justify-between gap-2 text-sm font-extrabold text-stone-900">
          {style.name}
          <span className="text-[10px] font-semibold text-stone-400" style={{ fontFamily: FONTS[style.theme.fonts.display].family }}>
            {FONTS[style.theme.fonts.display].label}
          </span>
        </p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-stone-500">{style.description}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {style.tags.map((t) => (
            <span key={t} className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
              {t}
            </span>
          ))}
        </div>
      </div>
      {selected && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-endeavour text-white shadow">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  )
}
