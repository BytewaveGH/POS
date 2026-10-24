'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Moon, ShoppingBag } from 'lucide-react'
import { useCart, useCartLines } from '@/lib/eatery/cart'
import { formatMoney, openState, priceOrder } from '@/lib/eatery/menu'
import type { MenuItem, StorefrontBundle } from '@/lib/eatery/types'
import { Hero, InfoStrip } from './hero'
import { ItemSheet } from './item-sheet'
import { MenuView, PromoBanner } from './menu-view'
import { BrandMark, ThemeScope } from './theme-scope'

// Why ordering is off right now, or null.
export const orderingBlocked = (bundle: StorefrontBundle, now: Date) => {
  const r = bundle.restaurant
  if (!r.acceptingOrders) return 'Not taking orders right now'
  const s = openState(r.hours, now)
  return s.open ? null : `Closed · ${s.label.toLowerCase()}`
}

// A restaurant's full storefront. Used by the public page and, inside a phone
// frame, by the owner's theme editor (`preview`).
export const Storefront = ({
  bundle,
  now,
  cartKey,
  checkoutHref,
  directoryHref,
  table,
  preview,
}: {
  bundle: StorefrontBundle
  now: Date
  // Cart bucket (the slug; previews use their own)
  cartKey: string
  checkoutHref: string
  directoryHref?: string
  table?: string | null
  preview?: boolean
}) => {
  const { restaurant } = bundle
  const [open, setOpen] = useState<MenuItem | null>(null)
  const [added, setAdded] = useState<string | null>(null)
  const lines = useCartLines(cartKey)
  const addLine = useCart((s) => s.add)
  const blocked = orderingBlocked(bundle, now)
  const priced = useMemo(() => priceOrder(bundle, lines, null, now), [bundle, lines, now])
  const count = lines.reduce((s, l) => s + l.quantity, 0)

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(null), 2200)
    return () => clearTimeout(t)
  }, [added])

  return (
    <ThemeScope theme={restaurant.theme} className="min-h-full">
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{ borderColor: 'var(--e-border)', background: 'color-mix(in srgb, var(--e-bg) 85%, transparent)' }}
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          {directoryHref ? (
            <Link
              href={directoryHref}
              className="flex h-11 w-11 items-center justify-center rounded-full e-focus hover:opacity-80"
              aria-label="All places"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : (
            <span className="w-2" />
          )}
          <BrandMark restaurant={restaurant} size={34} />
          <span className="e-display min-w-0 flex-1 truncate text-lg">{restaurant.name}</span>
          <Link
            href={checkoutHref}
            className="relative flex h-11 items-center gap-2 rounded-full px-3 font-bold e-focus e-soft"
            aria-label={`${restaurant.theme.copy.cart}: ${count} item${count === 1 ? '' : 's'}`}
            onClick={(e) => preview && e.preventDefault()}
          >
            <ShoppingBag className="h-5 w-5" style={{ color: 'var(--e-primary-text)' }} />
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </Link>
        </div>
      </header>

      <Hero restaurant={restaurant} now={now} table={table} />
      <InfoStrip restaurant={restaurant} now={now} />

      {blocked && (
        <div className="mx-auto max-w-5xl px-4">
          <p className="mb-3 flex items-center gap-2 px-4 py-3 text-sm font-bold e-card" role="status">
            <Moon className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--e-primary-text)' }} aria-hidden />
            {blocked}. You can still browse the menu.
          </p>
        </div>
      )}
      <PromoBanner promotions={bundle.promotions} now={now} categories={bundle.categories} />
      <MenuView bundle={bundle} now={now} onOpen={setOpen} stickyOffset={64} />

      <ItemSheet
        bundle={bundle}
        item={open}
        now={now}
        blocked={blocked}
        onClose={() => setOpen(null)}
        onAdd={(line) => {
          addLine(cartKey, line)
          setAdded(`${line.quantity} × ${open?.name ?? 'item'} added`)
          setOpen(null)
        }}
      />

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        style={preview ? { position: 'sticky' } : undefined}
      >
        <div className="mx-auto max-w-5xl">
          <p aria-live="polite" className="mb-2 flex justify-center">
            {added && (
              <span
                className="pointer-events-auto rounded-full px-4 py-2 text-sm font-bold shadow-lg e-card"
                style={{ color: 'var(--e-text)' }}
              >
                {added}
              </span>
            )}
          </p>
          {count > 0 && (
            <Link
              href={checkoutHref}
              onClick={(e) => preview && e.preventDefault()}
              className="pointer-events-auto flex h-14 items-center gap-3 px-5 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] e-btn w-full"
              style={{ borderRadius: 'var(--e-radius)' }}
            >
              <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-black/20 px-2 text-sm tabular-nums">
                {count}
              </span>
              <span className="flex-1 text-left">View {restaurant.theme.copy.cart.toLowerCase()}</span>
              <span className="tabular-nums">{formatMoney(priced.total, restaurant.currency)}</span>
            </Link>
          )}
        </div>
      </div>
    </ThemeScope>
  )
}
