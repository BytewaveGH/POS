'use client'

import React from 'react'
import { Bike, Clock, MapPin, MessageCircle, Phone, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney, openState, todaysHoursLabel, type OpenState } from '@/lib/eatery/menu'
import { presetFor } from '@/lib/eatery/presets'
import type { Restaurant } from '@/lib/eatery/types'
import { BrandMark, Cover } from './theme-scope'

const OpenPill = ({ state, className }: { state: OpenState; className?: string }) => (
  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold e-card', className)}>
    <span className={cn('h-2 w-2 rounded-full', state.open ? 'bg-emerald-500' : 'bg-stone-400')} aria-hidden />
    {state.open ? state.label : `Closed · ${state.label.toLowerCase()}`}
  </span>
)

// One hero per style. All read the same restaurant fields.
export const Hero = ({ restaurant, now, table }: { restaurant: Restaurant; now: Date; table?: string | null }) => {
  const t = restaurant.theme
  const state = openState(restaurant.hours, now)
  const kind = presetFor(restaurant.category).label.split(/[,(]/)[0].trim()

  if (t.hero === 'cinematic') {
    return (
      <Cover theme={t} className="min-h-[340px] sm:min-h-[420px]">
        <div className="flex min-h-[340px] sm:min-h-[420px] flex-col items-center justify-center px-6 py-14 text-center">
          <BrandMark restaurant={restaurant} size={64} className="mb-5" />
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] opacity-80">
            {restaurant.city} · {kind}
          </p>
          <div className="my-4 flex items-center gap-3" aria-hidden>
            <span className="h-px w-12" style={{ background: 'var(--e-primary)' }} />
            <span className="h-2 w-2 rotate-45" style={{ background: 'var(--e-primary)' }} />
            <span className="h-px w-12" style={{ background: 'var(--e-primary)' }} />
          </div>
          <h1 className="e-display text-5xl sm:text-7xl">{restaurant.name}</h1>
          {restaurant.tagline && <p className="mt-3 text-base sm:text-lg italic opacity-85">{restaurant.tagline}</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <OpenPill state={state} />
            {table && <span className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold e-accent">Table {table}</span>}
          </div>
        </div>
      </Cover>
    )
  }

  if (t.hero === 'poster') {
    const f = restaurant.fulfilment
    const sticker =
      f.delivery.enabled && f.delivery.etaMinutes
        ? `Delivery ~${f.delivery.etaMinutes} min`
        : f.pickup.enabled
          ? `Ready in ~${f.pickup.prepMinutes} min`
          : state.label
    return (
      <Cover theme={t} className="[clip-path:polygon(0_0,100%_0,100%_92%,0_100%)]">
        <div className="mx-auto max-w-5xl px-5 pt-10 pb-16 sm:pt-14 sm:pb-20">
          <div className="flex items-center gap-3">
            <BrandMark restaurant={restaurant} size={52} />
            <OpenPill state={state} />
          </div>
          <h1 className="e-display mt-5 text-[64px] leading-[0.85] sm:text-[112px] break-words">{restaurant.name}</h1>
          {restaurant.tagline && <p className="mt-3 text-lg font-bold">{restaurant.tagline}</p>}
          <span
            className="mt-6 inline-flex -rotate-3 items-center rounded-[var(--e-radius-control)] px-4 py-2 text-sm font-extrabold uppercase tracking-wide shadow-lg e-accent"
            style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.25)' }}
          >
            {table ? `Table ${table}` : sticker}
          </span>
        </div>
      </Cover>
    )
  }

  if (t.hero === 'cozy') {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:pt-6">
        <Cover theme={t} className="h-44 sm:h-64" />
        <div className="relative -mt-10 px-3 sm:px-6">
          <div className="e-card p-5 sm:p-6 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)]">
            <div className="flex items-start gap-4">
              <BrandMark restaurant={restaurant} size={64} className="-mt-12" />
              <div className="min-w-0 pt-1">
                <p className="text-xs font-bold e-muted">{kind}</p>
              </div>
            </div>
            <h1 className="e-display mt-2 text-4xl sm:text-5xl">{restaurant.name}</h1>
            {restaurant.tagline && <p className="mt-2 e-muted text-base">{restaurant.tagline}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <OpenPill state={state} />
              {table && <span className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold e-accent">Table {table}</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-b e-border" style={{ background: 'var(--e-surface)' }}>
      <Cover theme={t} className="h-20 sm:h-28" />
      <div className="mx-auto max-w-5xl px-4 pb-5">
        <div className="-mt-8 flex items-end gap-4">
          <BrandMark restaurant={restaurant} size={72} />
          <div className="min-w-0 pb-1">
            <h1 className="e-display text-3xl sm:text-4xl truncate">{restaurant.name}</h1>
            {restaurant.tagline && <p className="e-muted text-sm truncate">{restaurant.tagline}</p>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <OpenPill state={state} />
          {table && <span className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold e-accent">Table {table}</span>}
        </div>
      </div>
    </div>
  )
}

const mapLink = (r: Restaurant) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name}, ${r.address}, ${r.city}`)}`
const waNumber = (p: string) => {
  const d = p.replace(/\D/g, '')
  return d.startsWith('0') ? `233${d.slice(1)}` : d
}

// Practical details under the hero: hours, where, how to order, contact.
export const InfoStrip = ({ restaurant, now }: { restaurant: Restaurant; now: Date }) => {
  const f = restaurant.fulfilment
  const items = [
    { icon: Clock, text: `Today ${todaysHoursLabel(restaurant.hours, now)}` },
    { icon: MapPin, text: `${restaurant.address}, ${restaurant.city}`, href: mapLink(restaurant) },
    f.delivery.enabled && {
      icon: Bike,
      text: `Delivery ${f.delivery.fee ? `· fee ${formatMoney(f.delivery.fee, restaurant.currency)}` : '· free'}${f.delivery.area ? ` · ${f.delivery.area}` : ''}`,
    },
    f.pickup.enabled && { icon: ShoppingBag, text: `Pickup · ready in ~${f.pickup.prepMinutes} min` },
    f.dineIn.enabled && { icon: UtensilsCrossed, text: 'Dine-in · scan the QR on your table' },
    restaurant.phone && { icon: Phone, text: restaurant.phone, href: `tel:${restaurant.phone.replace(/\s/g, '')}` },
    restaurant.whatsapp && { icon: MessageCircle, text: 'WhatsApp', href: `https://wa.me/${waNumber(restaurant.whatsapp)}` },
  ].filter(Boolean) as { icon: typeof Clock; text: string; href?: string }[]
  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      {restaurant.description && <p className="e-muted text-[15px] leading-relaxed max-w-2xl mb-3">{restaurant.description}</p>}
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold">
        {items.map((i) => (
          <li key={i.text} className="inline-flex items-center gap-1.5">
            <i.icon className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--e-primary-text)' }} aria-hidden />
            {i.href ? (
              <a
                href={i.href}
                target={i.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="underline-offset-4 hover:underline"
              >
                {i.text}
              </a>
            ) : (
              <span>{i.text}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
