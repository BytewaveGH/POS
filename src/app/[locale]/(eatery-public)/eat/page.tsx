'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Receipt, Search, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from '@/lib/eatery/cart'
import { useDirectory, useNow } from '@/lib/eatery/hooks'
import { openState } from '@/lib/eatery/menu'
import { DIRECTORY_GROUPS, presetFor } from '@/lib/eatery/presets'
import { FONTS } from '@/lib/eatery/theme'
import type { FulfilmentType } from '@/lib/eatery/types'
import { apiErrorMessage } from '@/lib/api-error'
import { RestaurantCard } from '@/components/eatery/restaurant-card'

const WAYS: { value: FulfilmentType | 'all'; label: string }[] = [
  { value: 'all', label: 'Any way' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'dine-in', label: 'Dine-in' },
]

export default function EatDirectory() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const now = useNow()
  const { data, isLoading, error, refetch, isFetching } = useDirectory()
  const tickets = useCart((s) => s.tickets)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string>('all')
  const [way, setWay] = useState<FulfilmentType | 'all'>('all')
  const [openOnly, setOpenOnly] = useState(false)

  const restaurants = useMemo(() => data ?? [], [data])
  const q = query.trim().toLowerCase()
  const list = restaurants
    .filter((r) => group === 'all' || presetFor(r.category).group === group)
    .filter((r) => way === 'all' || r.fulfilment[way === 'dine-in' ? 'dineIn' : way].enabled)
    .filter((r) => !openOnly || (r.acceptingOrders && openState(r.hours, now).open))
    .filter((r) => !q || `${r.name} ${r.tagline ?? ''} ${r.city} ${presetFor(r.category).label}`.toLowerCase().includes(q))
    // Open places first.
    .sort((a, b) => Number(openState(b.hours, now).open) - Number(openState(a.hours, now).open))
  const groups = DIRECTORY_GROUPS.filter((g) => restaurants.some((r) => presetFor(r.category).group === g))
  const byName = new Map(restaurants.map((r) => [r.slug, r]))

  return (
    <main className="text-stone-900">
      <header className="relative overflow-hidden bg-stone-950 text-white">
        <div
          className="absolute inset-0 opacity-30"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, #D4A84F 0 2px, transparent 3px), radial-gradient(circle at 80% 60%, #D7261E 0 2px, transparent 3px), radial-gradient(circle at 45% 85%, #C8794A 0 2px, transparent 3px)',
            backgroundSize: '120px 120px, 160px 160px, 140px 140px',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-6 pb-10 sm:pt-8 sm:pb-14">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold tracking-wide">
              sellix <span className="text-amber-300">eats</span>
            </span>
            <Link
              href={`/${locale}`}
              className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-white/80 hover:text-white"
            >
              <Store className="h-4 w-4" /> For restaurants
            </Link>
          </div>
          <h1 className="mt-8 max-w-2xl text-[40px] leading-[1.02] sm:text-6xl" style={{ fontFamily: FONTS.fraunces.family }}>
            Hungry, thirsty, or just need a coffee?
          </h1>
          <p className="mt-3 max-w-xl text-base text-white/75">
            Order from bars, kitchens and cafés near you — for pickup, delivery or right at your table.
          </p>
          <label className="relative mt-6 block max-w-xl">
            <span className="sr-only">Search places</span>
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pizza, cocktails, Osu…"
              className="h-14 w-full rounded-2xl bg-white pl-12 pr-4 text-base text-stone-900 placeholder:text-stone-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60"
            />
          </label>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4">
        {tickets.length > 0 && (
          <section className="pt-6" aria-labelledby="recent">
            <h2 id="recent" className="text-sm font-extrabold text-stone-700 mb-2">
              Your recent orders
            </h2>
            <ul className="flex gap-2 overflow-x-auto pb-1">
              {tickets.slice(0, 6).map((t) => (
                <li key={`${t.slug}-${t.code}`}>
                  <Link
                    href={`/${locale}/eat/${t.slug}/order/${t.code}`}
                    className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full border border-stone-200 bg-white px-4 text-sm font-bold hover:border-stone-400"
                  >
                    <Receipt className="h-4 w-4 text-stone-500" /> {byName.get(t.slug)?.name ?? t.slug} · #{t.code}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="sticky top-0 z-10 -mx-4 bg-[#FAF7F2]/95 px-4 py-3 backdrop-blur">
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Kind of place">
            {['all', ...groups].map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={group === g}
                onClick={() => setGroup(g)}
                className={cn(
                  'h-10 whitespace-nowrap rounded-full border px-4 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900',
                  group === g
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'
                )}
              >
                {g === 'all' ? 'Everything' : g}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="How you want it" className="inline-flex rounded-full bg-stone-200/70 p-1">
              {WAYS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  role="radio"
                  aria-checked={way === w.value}
                  onClick={() => setWay(w.value)}
                  className={cn(
                    'h-9 rounded-full px-3.5 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900',
                    way === w.value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-stone-300 bg-white px-3.5 text-xs font-bold text-stone-700">
              <input
                type="checkbox"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
                className="h-4 w-4 accent-stone-900"
              />
              Open now
            </label>
          </div>
        </div>

        <section className="pb-16 pt-2" aria-label="Places">
          {error ? (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
              <p className="font-bold text-rose-800">Couldn’t load places</p>
              <p className="mt-1 text-sm text-rose-700">{apiErrorMessage(error, 'Check your connection and try again.')}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="mt-4 h-11 rounded-full bg-rose-700 px-5 text-sm font-bold text-white disabled:opacity-60"
              >
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl bg-stone-200/70" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <p className="py-16 text-center text-stone-600">{restaurants.length ? 'No places match those filters.' : 'No places yet.'}</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((r) => (
                <li key={r.id}>
                  <RestaurantCard restaurant={r} href={`/${locale}/eat/${r.slug}`} now={now} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
