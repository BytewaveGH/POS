'use client'

import React from 'react'
import Link from 'next/link'
import { BadgePercent, Bike, Clock, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney, openState, promotionLive } from '@/lib/eatery/menu'
import { presetFor } from '@/lib/eatery/presets'
import type { DirectoryEntry } from '@/lib/eatery/types'
import { BrandMark, Cover, ThemeScope } from './theme-scope'

export const livePromotion = (r: DirectoryEntry, now: Date) =>
  (r.promotions ?? [])
    .filter((p) => promotionLive({ ...p, id: 0, restaurantId: r.id, categoryIds: [], itemIds: [] }, now))
    .sort((a, b) => b.percentOff - a.percentOff)[0]

export const kindLabel = (r: Pick<DirectoryEntry, 'category'>) => presetFor(r.category).label.split(/[,&(]/)[0].trim()

// A directory card that is a miniature of the restaurant's own storefront —
// its colours, type and pattern — so the list itself shows the variety.
export const RestaurantCard = ({
  restaurant: r,
  href,
  now,
  matched,
  size = 'md',
}: {
  restaurant: DirectoryEntry
  href: string
  now: Date
  // The dish that matched the search, if it wasn't the name.
  matched?: string
  size?: 'md' | 'lg'
}) => {
  const state = openState(r.hours, now)
  const open = state.open && r.acceptingOrders
  const f = r.fulfilment
  const promo = livePromotion(r, now)
  const t = r.theme
  const meta = [
    f.delivery.enabled && {
      icon: Bike,
      text: `${f.delivery.etaMinutes || 40} min · ${f.delivery.fee ? formatMoney(f.delivery.fee, r.currency) : 'free'}`,
    },
    !f.delivery.enabled && f.pickup.enabled && { icon: ShoppingBag, text: `Pickup ~${f.pickup.prepMinutes} min` },
    f.dineIn.enabled && { icon: UtensilsCrossed, text: 'Dine-in' },
  ].filter(Boolean) as { icon: typeof Bike; text: string }[]

  return (
    <ThemeScope theme={t} as="article" className="group h-full rounded-[var(--e-radius)] !bg-transparent">
      <Link
        href={href}
        className="e-card flex h-full flex-col overflow-hidden e-focus shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-16px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:-translate-y-1"
      >
        <Cover theme={t} className={cn(size === 'lg' ? 'aspect-[16/9]' : 'aspect-[16/10]', !open && 'saturate-[0.6]')}>
          <div
            className={cn(
              'flex h-full flex-col p-3',
              t.hero === 'cinematic' ? 'items-center justify-center text-center' : 'justify-between'
            )}
          >
            <div className={cn('flex items-start justify-between gap-2', t.hero === 'cinematic' ? 'absolute inset-x-3 top-3' : 'w-full')}>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm"
                style={{ background: open ? 'var(--e-surface)' : 'rgba(0,0,0,0.62)', color: open ? 'var(--e-text)' : '#fff' }}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', open ? 'bg-emerald-500' : 'bg-stone-300')} aria-hidden />
                {open ? state.label : r.acceptingOrders ? `Closed · ${state.label.toLowerCase()}` : 'Not taking orders'}
              </span>
              {promo && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold shadow-sm e-accent">
                  <BadgePercent className="h-3.5 w-3.5" aria-hidden /> −{promo.percentOff}% · {promo.name}
                </span>
              )}
            </div>
            {t.hero === 'cinematic' && (
              <p className="e-display text-3xl" style={{ color: 'var(--e-cover-ink)' }} aria-hidden>
                {r.name}
              </p>
            )}
          </div>
        </Cover>
        <div className="relative flex flex-1 flex-col px-4 pb-4">
          <div className="-mt-7 mb-2">
            <BrandMark restaurant={r} size={size === 'lg' ? 56 : 50} />
          </div>
          <h3 className={cn('e-display leading-none', size === 'lg' ? 'text-[30px]' : 'text-[25px]')}>{r.name}</h3>
          <p className="e-muted mt-1.5 text-[13px] line-clamp-1">{r.tagline || `${kindLabel(r)} · ${r.city}`}</p>
          {matched && (
            <p
              className="mt-2 self-start rounded-full px-2.5 py-0.5 text-[11px] font-bold e-soft"
              style={{ color: 'var(--e-primary-text)' }}
            >
              Serves {matched}
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs font-semibold e-muted">
            <span className="font-bold uppercase tracking-wide" style={{ color: 'var(--e-primary-text)' }}>
              {kindLabel(r)}
            </span>
            {meta.map((m) => (
              <span key={m.text} className="inline-flex items-center gap-1">
                <m.icon className="h-3.5 w-3.5" aria-hidden /> {m.text}
              </span>
            ))}
            {!open && r.acceptingOrders && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden /> Browse the menu now
              </span>
            )}
          </div>
        </div>
      </Link>
    </ThemeScope>
  )
}
