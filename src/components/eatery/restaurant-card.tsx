'use client'

import React from 'react'
import Link from 'next/link'
import { Bike, Clock, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'
import { openState } from '@/lib/eatery/menu'
import { presetFor } from '@/lib/eatery/presets'
import type { Restaurant } from '@/lib/eatery/types'
import { BrandMark, Cover, ThemeScope } from './theme-scope'

// A directory card that is a miniature of the restaurant's own storefront:
// its colours, its fonts, its pattern — so the list itself shows variety.
export const RestaurantCard = ({ restaurant, href, now }: { restaurant: Restaurant; href: string; now: Date }) => {
  const state = openState(restaurant.hours, now)
  const f = restaurant.fulfilment
  const ways = [
    f.delivery.enabled && { icon: Bike, label: 'Delivery' },
    f.pickup.enabled && { icon: ShoppingBag, label: 'Pickup' },
    f.dineIn.enabled && { icon: UtensilsCrossed, label: 'Dine-in' },
  ].filter(Boolean) as { icon: typeof Bike; label: string }[]
  const t = restaurant.theme
  return (
    <ThemeScope theme={t} as="article" className="group overflow-hidden h-full">
      <Link
        href={href}
        className="flex h-full flex-col overflow-hidden e-focus"
        style={{ borderRadius: 'var(--e-radius)', border: '1px solid var(--e-border)', background: 'var(--e-surface)' }}
      >
        <Cover theme={t} className="h-36 sm:h-40">
          <div
            className={cn(
              'flex h-full flex-col justify-between p-4',
              t.hero === 'cinematic' && 'items-center text-center justify-center gap-2'
            )}
          >
            <span
              className={cn(
                'self-start inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
                t.hero === 'cinematic' && 'absolute top-3 left-3'
              )}
              style={{ background: state.open ? 'var(--e-surface)' : 'rgba(0,0,0,0.55)', color: state.open ? 'var(--e-text)' : '#fff' }}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', state.open ? 'bg-emerald-500' : 'bg-stone-300')} aria-hidden />
              {state.open ? 'Open' : 'Closed'} · {state.label.replace(/^Open /, '').replace(/^Opens /, 'opens ')}
            </span>
            {t.hero === 'cinematic' && (
              <p className="e-display text-3xl" style={{ color: 'var(--e-cover-ink)' }}>
                {restaurant.name}
              </p>
            )}
          </div>
        </Cover>
        <div className="relative flex flex-1 flex-col px-4 pb-4">
          <div className="-mt-7 mb-2">
            <BrandMark restaurant={restaurant} size={52} />
          </div>
          {t.hero !== 'cinematic' && <h3 className="e-display text-[26px] leading-none">{restaurant.name}</h3>}
          {t.hero === 'cinematic' && <h3 className="sr-only">{restaurant.name}</h3>}
          <p className="e-muted text-sm mt-1 line-clamp-1">{restaurant.tagline || presetFor(restaurant.category).label}</p>
          <div className="mt-auto pt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold e-muted">
            <span className="uppercase tracking-wide" style={{ color: 'var(--e-primary-text)' }}>
              {presetFor(restaurant.category).label.split(/[,&(]/)[0].trim()}
            </span>
            {ways.map((w) => (
              <span key={w.label} className="inline-flex items-center gap-1">
                <w.icon className="h-3.5 w-3.5" aria-hidden /> {w.label}
              </span>
            ))}
            {f.delivery.enabled && f.delivery.etaMinutes > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden /> {f.delivery.etaMinutes} min
              </span>
            )}
          </div>
        </div>
      </Link>
    </ThemeScope>
  )
}
