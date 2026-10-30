'use client'

import React, { useMemo } from 'react'
import { Eye, Undo2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/kit/ui'
import { Toggle } from '@/components/kit/form'
import { FESTIVAL_ICONS } from '@/components/eatery/festival-ribbon'
import {
  allowed,
  daysUntil,
  festivalsOn,
  formatWindow,
  liveFestival,
  occurrenceId,
  pruneSkipped,
  seasonalOf,
  upcomingFestivals,
  wearFestival,
  type FestivalKey,
  type Occurrence,
} from '@/lib/eatery/festivals'
import type { SeasonalSettings, ThemeConfig } from '@/lib/eatery/theme'
import { MiniStorefront } from './style-card'

const when = (o: Occurrence, now: Date) => {
  const n = daysUntil(o, now)
  if (n <= 0) return 'On now'
  if (n === 1) return 'Tomorrow'
  return n < 60 ? `In ${n} days` : o.start.toLocaleDateString('en-GB', { month: 'long' })
}

// "Festivals" tab of the brand editor: festival looks switch on by themselves;
// the owner can turn any off for good, or remove the one that's on for this year.
export const FestivalPanel = ({
  theme,
  onChange,
  now,
  name,
  dishes,
  currency,
  previewing,
  onPreview,
}: {
  theme: ThemeConfig
  onChange: (s: SeasonalSettings) => void
  now: Date
  name: string
  dishes: { name: string; price: number }[]
  currency: string
  previewing: FestivalKey | null
  onPreview: (key: FestivalKey | null) => void
}) => {
  const s = seasonalOf(theme)
  const set = (p: Partial<SeasonalSettings>) => onChange({ ...s, ...p })
  const live = liveFestival(theme, now)
  // On today but removed by the owner (the most specific one).
  const hidden = s.auto && !live ? festivalsOn(now)[0] : null
  const upcoming = useMemo(() => upcomingFestivals(now), [now])

  const skip = (o: Occurrence) => set({ skipped: [...pruneSkipped(s, now), occurrenceId(o)] })
  const unskip = (o: Occurrence) => set({ skipped: s.skipped.filter((id) => id !== occurrenceId(o)) })
  const toggle = (key: FestivalKey, on: boolean) => set({ off: on ? s.off.filter((k) => k !== key) : [...s.off, key] })

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 rounded-xl border border-stone-200 bg-stone-50/60 p-4 sm:grid-cols-2">
        <Toggle
          checked={s.auto}
          onChange={(auto) => set({ auto })}
          label="Dress up for festivals automatically"
          hint="Switches on the day, back to your look after. Your own theme isn’t changed."
        />
        <div className={cn(!s.auto && 'pointer-events-none opacity-50')}>
          <Toggle
            checked={s.banner}
            onChange={(banner) => set({ banner })}
            label="Show a festival line above the menu"
            hint="e.g. “Pink October · get checked, and check on the women you love”"
          />
        </div>
      </div>

      {live && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl border border-endeavour/20 bg-endeavour/[0.04] p-4"
          role="status"
          aria-label="Festival on now"
        >
          <LiveIcon festival={live.festival.key} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-stone-900">Customers see {live.festival.name} right now</p>
            <p className="text-xs text-stone-500">
              Until {live.end.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>
          <Button size="sm" variant="secondary" icon={Eye} onClick={() => onPreview(live.festival.key)}>
            Preview
          </Button>
          <Button size="sm" variant="secondary" icon={X} onClick={() => skip(live)}>
            Remove this year
          </Button>
        </div>
      )}
      {hidden && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 p-4" role="status">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-stone-900">{hidden.festival.name} is on, but not on your storefront</p>
            <p className="text-xs text-stone-500">Customers see your own look.</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={Undo2}
            onClick={() =>
              set({
                off: s.off.filter((k) => k !== hidden.festival.key),
                skipped: s.skipped.filter((id) => id !== occurrenceId(hidden)),
              })
            }
          >
            Bring it back
          </Button>
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-4" aria-label="Festivals">
        {upcoming.map((o) => {
          const f = o.festival
          const on = !s.off.includes(f.key)
          const skipped = on && !allowed(s, o)
          const Icon = FESTIVAL_ICONS[f.key]
          return (
            <li
              key={f.key}
              className={cn(
                'flex flex-col overflow-hidden rounded-2xl border bg-white',
                previewing === f.key ? 'border-endeavour ring-2 ring-endeavour/30' : 'border-stone-200'
              )}
            >
              <button
                type="button"
                onClick={() => onPreview(previewing === f.key ? null : f.key)}
                aria-pressed={previewing === f.key}
                aria-label={`Preview ${f.name}`}
                className={cn(
                  'relative text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-endeavour',
                  !on && 'grayscale-[0.7]'
                )}
              >
                <MiniStorefront theme={wearFestival(theme, f)} name={name} dishes={dishes} currency={currency} />
                <span
                  className={cn(
                    'absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm',
                    live?.festival.key === f.key ? 'bg-emerald-600 text-white' : 'bg-white/90 text-stone-700'
                  )}
                >
                  {live?.festival.key === f.key ? 'Live now' : when(o, now)}
                </span>
              </button>
              <div className="flex flex-1 flex-col gap-2 border-t border-stone-100 p-3">
                <Toggle checked={on} onChange={(v) => toggle(f.key, v)} label={f.name} hint={formatWindow(o)} />
                <p className="flex items-start gap-1.5 text-[11px] leading-snug text-stone-500">
                  <Icon className="mt-px h-3.5 w-3.5 flex-shrink-0 text-stone-400" aria-hidden />
                  {f.about}
                </p>
                {skipped && (
                  <p className="mt-auto flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-amber-800">
                    Removed this year
                    <button type="button" onClick={() => unskip(o)} className="underline underline-offset-2">
                      Undo
                    </button>
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-[11px] text-stone-400">
        Only colours and the background motif change — your fonts, layout, logo, photos and menu stay the same. Islamic dates follow the
        expected calendar and can move by a day.
      </p>
    </div>
  )
}

const LiveIcon = ({ festival }: { festival: FestivalKey }) => {
  const Icon = FESTIVAL_ICONS[festival]
  return (
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-endeavour/10 text-endeavour">
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  )
}
