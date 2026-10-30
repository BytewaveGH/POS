'use client'

import React from 'react'
import { Bike, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/eatery/menu'
import type { FulfilmentType, Restaurant } from '@/lib/eatery/types'

export const availableModes = (r: Restaurant, table?: string | null): FulfilmentType[] =>
  [
    r.fulfilment.dineIn.enabled && table && 'dine-in',
    r.fulfilment.delivery.enabled && 'delivery',
    r.fulfilment.pickup.enabled && 'pickup',
    r.fulfilment.dineIn.enabled && !table && 'dine-in',
  ].filter(Boolean) as FulfilmentType[]

// How the customer will get it — chosen up front so prices, fees and times are
// clear before checkout. Remembered per restaurant.
export const OrderMode = ({
  restaurant: r,
  value,
  onChange,
  table,
}: {
  restaurant: Restaurant
  value: FulfilmentType | null
  onChange: (v: FulfilmentType) => void
  table?: string | null
}) => {
  const modes = availableModes(r, table)
  if (modes.length < 2 && !(modes.length === 1 && modes[0] === 'dine-in' && table)) return null
  const info: Record<FulfilmentType, { icon: typeof Bike; label: string; hint: string }> = {
    delivery: {
      icon: Bike,
      label: 'Delivery',
      hint: `${r.fulfilment.delivery.etaMinutes || 40} min · ${r.fulfilment.delivery.fee ? formatMoney(r.fulfilment.delivery.fee, r.currency) : 'free'}`,
    },
    pickup: { icon: ShoppingBag, label: 'Pickup', hint: `Ready in ~${r.fulfilment.pickup.prepMinutes} min` },
    'dine-in': {
      icon: UtensilsCrossed,
      label: table ? `Table ${table}` : 'At a table',
      hint: table ? 'We’ll bring it over' : 'Scan the QR on your table',
    },
  }
  // Three side by side leave ~90px of text each on a phone: stack each card
  // (icon, name, hint over two lines) until there's room for a row.
  const stacked = modes.length > 2
  return (
    <div className="mx-auto max-w-5xl px-4 pt-4">
      <div
        role="radiogroup"
        aria-label="How you’ll get your order"
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}
      >
        {modes.map((m) => {
          const I = info[m]
          const on = value === m
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(m)}
              className={cn(
                'flex border-[1.5px] px-3 py-2.5 text-left transition-colors e-focus',
                stacked ? 'flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3' : 'items-center gap-3',
                on ? 'e-soft' : ''
              )}
              style={{
                // Card corners: a pill-shaped control would clip a stacked card.
                borderRadius: stacked ? 'var(--e-radius)' : 'var(--e-radius-control)',
                borderColor: on ? 'var(--e-primary-text)' : 'var(--e-border)',
                background: on ? undefined : 'var(--e-surface)',
              }}
            >
              <I.icon className="h-5 w-5 flex-shrink-0" style={{ color: on ? 'var(--e-primary-text)' : 'var(--e-muted)' }} aria-hidden />
              <span className="min-w-0 w-full">
                <span className="block text-sm font-extrabold leading-tight">{I.label}</span>
                <span className={cn('block text-[11px] leading-snug e-muted', stacked ? 'line-clamp-2 sm:truncate' : 'truncate')}>
                  {I.hint}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
