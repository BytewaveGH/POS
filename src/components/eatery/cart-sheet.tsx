'use client'

import React from 'react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useCart, type CartLine } from '@/lib/eatery/cart'
import { formatMoney, priceOrder } from '@/lib/eatery/menu'
import type { FulfilmentType, StorefrontBundle } from '@/lib/eatery/types'
import { ItemArt, ThemeScope } from './theme-scope'

// Review the order before checkout without leaving the menu.
export const CartSheet = ({
  open,
  onOpenChange,
  bundle,
  lines,
  cartKey,
  mode,
  now,
  checkoutHref,
  blocked,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  bundle: StorefrontBundle
  lines: CartLine[]
  cartKey: string
  mode: FulfilmentType | null
  now: Date
  checkoutHref: string
  blocked?: string | null
}) => {
  const { setQuantity, removeLine, clear } = useCart()
  const r = bundle.restaurant
  const priced = priceOrder(bundle, lines, mode, now)
  const items = new Map(bundle.items.map((i) => [i.id, i]))
  const minOrder = mode === 'delivery' ? r.fulfilment.delivery.minOrder : 0
  const net = priced.subtotal - priced.discount
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 outline-none sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[420px] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 sm:data-[state=open]:slide-in-from-right-10 sm:data-[state=open]:slide-in-from-bottom-0">
          <ThemeScope
            theme={r.theme}
            className="flex max-h-[90dvh] flex-col overflow-hidden rounded-t-[22px] shadow-2xl sm:h-full sm:max-h-none sm:rounded-none"
          >
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: 'var(--e-border)', background: 'var(--e-surface)' }}
            >
              <div>
                <Dialog.Title className="e-display text-2xl">{r.theme.copy.cart}</Dialog.Title>
                <Dialog.Description className="text-xs e-muted">{r.name}</Dialog.Description>
              </div>
              <Dialog.Close className="flex h-11 w-11 items-center justify-center rounded-full e-focus e-soft" aria-label="Close">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-y-auto px-5" style={{ background: 'var(--e-surface)' }}>
              {lines.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingBag className="mx-auto h-10 w-10" style={{ color: 'var(--e-primary-text)' }} aria-hidden />
                  <p className="e-display mt-3 text-2xl">Nothing here yet</p>
                  <p className="mt-1 text-sm e-muted">Tap the + on anything you fancy.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[color:var(--e-border)]">
                  {lines.map((l) => {
                    const p = priceOrder(bundle, [l], null, now).lines[0]
                    const item = items.get(l.itemId)
                    return (
                      <li key={l.key} className="flex gap-3 py-4">
                        <ItemArt
                          name={item?.name ?? '?'}
                          imageUrl={item?.imageUrl}
                          theme={r.theme}
                          size="sm"
                          className="h-14 w-14 flex-shrink-0 rounded-[var(--e-radius-control)]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-extrabold leading-tight">{item?.name ?? 'No longer on the menu'}</p>
                            <p className="e-price">{p ? formatMoney(p.lineTotal, r.currency) : '—'}</p>
                          </div>
                          {p?.summary && <p className="mt-0.5 text-[13px] e-muted">{p.summary}</p>}
                          {l.note && <p className="text-[13px] italic e-muted">“{l.note}”</p>}
                          <div className="mt-2 flex items-center gap-1">
                            <button
                              type="button"
                              className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] e-focus"
                              style={{ borderColor: 'var(--e-border)' }}
                              aria-label={`One less ${item?.name ?? ''}`}
                              onClick={() => setQuantity(cartKey, l.key, l.quantity - 1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-8 text-center font-extrabold tabular-nums">{l.quantity}</span>
                            <button
                              type="button"
                              className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] e-focus"
                              style={{ borderColor: 'var(--e-border)' }}
                              aria-label={`One more ${item?.name ?? ''}`}
                              onClick={() => setQuantity(cartKey, l.key, l.quantity + 1)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="ml-auto flex h-9 w-9 items-center justify-center rounded-full e-focus e-muted"
                              aria-label={`Remove ${item?.name ?? 'item'}`}
                              onClick={() => removeLine(cartKey, l.key)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {lines.length > 0 && (
              <div
                className="border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
                style={{ borderColor: 'var(--e-border)', background: 'var(--e-surface)' }}
              >
                <dl className="grid gap-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="e-muted">Subtotal</dt>
                    <dd className="tabular-nums">{formatMoney(priced.subtotal, r.currency)}</dd>
                  </div>
                  {priced.discount > 0 && (
                    <div className="flex justify-between font-bold" style={{ color: 'var(--e-primary-text)' }}>
                      <dt>Deals</dt>
                      <dd className="tabular-nums">−{formatMoney(priced.discount, r.currency)}</dd>
                    </div>
                  )}
                  {mode === 'delivery' && (
                    <div className="flex justify-between">
                      <dt className="e-muted">Delivery</dt>
                      <dd className="tabular-nums">
                        {r.fulfilment.delivery.fee ? formatMoney(r.fulfilment.delivery.fee, r.currency) : 'Free'}
                      </dd>
                    </div>
                  )}
                  <div className="mt-1 flex justify-between text-base font-extrabold">
                    <dt>Total</dt>
                    <dd className="tabular-nums">{formatMoney(priced.total, r.currency)}</dd>
                  </div>
                </dl>
                {minOrder > 0 && net < minOrder && (
                  <p className="mt-2 text-xs font-bold" style={{ color: 'var(--e-primary-text)' }}>
                    Add {formatMoney(minOrder - net, r.currency)} more for delivery (minimum {formatMoney(minOrder, r.currency)}).
                  </p>
                )}
                <Link
                  href={checkoutHref}
                  className="e-btn mt-3 h-14 w-full text-base"
                  aria-disabled={!!blocked}
                  onClick={(e) => blocked && e.preventDefault()}
                >
                  {blocked ?? 'Go to checkout'} {!blocked && <ArrowRight className="h-5 w-5" />}
                </Link>
                <button
                  type="button"
                  onClick={() => clear(cartKey)}
                  className="mt-2 w-full py-2 text-xs font-semibold e-muted hover:underline"
                >
                  Empty {r.theme.copy.cart.toLowerCase()}
                </button>
              </div>
            )}
          </ThemeScope>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
