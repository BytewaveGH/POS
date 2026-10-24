'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Bike,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Smartphone,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/api-error'
import { useCart, useCartLines } from '@/lib/eatery/cart'
import { useNow, usePublicSource, useStorefront } from '@/lib/eatery/hooks'
import { clockLabel, formatMoney, priceOrder, toMinutes } from '@/lib/eatery/menu'
import type { FulfilmentType, PaymentMethod, Restaurant } from '@/lib/eatery/types'
import { ThemeScope } from '@/components/eatery/theme-scope'
import { orderingBlocked } from '@/components/eatery/storefront'
import { availableModes } from '@/components/eatery/order-mode'

const NETWORK: Record<Restaurant['payments']['momo']['network'], string> = {
  mtn: 'MTN MoMo',
  telecel: 'Telecel Cash',
  airteltigo: 'AirtelTigo Money',
}

// Pickup slots every 15 minutes from "ready" until closing today.
const pickupSlots = (r: Restaurant, now: Date) => {
  const periods = r.hours[now.getDay()] ?? []
  const cur = now.getHours() * 60 + now.getMinutes() + r.fulfilment.pickup.prepMinutes + 10
  const out: string[] = []
  for (const p of periods) {
    let close = toMinutes(p.close)
    if (close <= toMinutes(p.open)) close = 24 * 60 - 1
    for (let m = Math.ceil(Math.max(cur, toMinutes(p.open)) / 15) * 15; m <= close - 15 && out.length < 12; m += 15)
      out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return out
}

const Section = ({
  title,
  children,
  id,
  step,
  className,
}: {
  title: string
  children: React.ReactNode
  id: string
  step?: number
  className?: string
}) => (
  <section aria-labelledby={id} className={cn('e-card p-4 sm:p-6', className)}>
    <h2 id={id} className="e-display mb-4 flex items-center gap-3 text-2xl">
      {step && (
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
          style={{ background: 'var(--e-primary)', color: 'var(--e-on-primary)', fontFamily: 'var(--e-font-body)' }}
          aria-hidden
        >
          {step}
        </span>
      )}
      {title}
    </h2>
    {children}
  </section>
)

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const qc = useQueryClient()
  const locale = (params?.locale as string) || 'en'
  const slug = String(params?.slug ?? '')
  const now = useNow()
  const { data: bundle, isLoading } = useStorefront(slug)
  const source = usePublicSource()
  const lines = useCartLines(slug)
  const { setQuantity, removeLine, clear, addTicket, contact, setContact, prefs, setPref } = useCart()
  const pref = prefs[slug] ?? {}

  const r = bundle?.restaurant
  const ways = useMemo(
    () =>
      r
        ? ([
            r.fulfilment.pickup.enabled && 'pickup',
            r.fulfilment.delivery.enabled && 'delivery',
            r.fulfilment.dineIn.enabled && 'dine-in',
          ].filter(Boolean) as FulfilmentType[])
        : [],
    [r]
  )
  const [way, setWay] = useState<FulfilmentType | null>(null)
  const [table, setTable] = useState('')
  const [pickupAt, setPickupAt] = useState<'asap' | string>('asap')
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!r || way) return
    // Same default as the storefront's order-mode picker.
    const first = availableModes(r, pref.table).find((m) => ways.includes(m)) ?? ways[0] ?? null
    setWay(pref.fulfilment && ways.includes(pref.fulfilment) ? pref.fulfilment : first)
    setTable(pref.table && r.fulfilment.dineIn.tables.includes(pref.table) ? pref.table : '')
  }, [r, ways, way, pref.fulfilment, pref.table])

  const methods = useMemo(
    () =>
      r
        ? ([
            r.payments.momo.enabled && 'momo',
            r.payments.cash && 'cash',
            r.payments.payAtTable && way === 'dine-in' && 'pay-at-table',
          ].filter(Boolean) as PaymentMethod[])
        : [],
    [r, way]
  )
  useEffect(() => {
    if (method && !methods.includes(method)) setMethod(null)
    if (!method && methods.length) setMethod(methods[0])
  }, [methods, method])

  if (isLoading)
    return (
      <div className="mx-auto max-w-2xl px-4 py-10" aria-busy="true">
        <div className="h-96 animate-pulse rounded-3xl bg-stone-200/70" />
      </div>
    )
  if (!bundle || !r) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-xl font-extrabold">We can’t find that place</p>
        <Link href={`/${locale}/eat`} className="mt-4 inline-block font-bold underline">
          See all places
        </Link>
      </div>
    )
  }

  const priced = priceOrder(bundle, lines, way, now)
  const blocked = orderingBlocked(bundle, now)
  const currency = r.currency
  const itemsById = new Map(bundle.items.map((i) => [i.id, i]))
  const slots = pickupSlots(r, now)
  const cashLabel = way === 'delivery' ? 'Cash on delivery' : way === 'dine-in' ? 'Cash' : 'Cash on pickup'

  const fieldErrors: Record<string, string> = {}
  if (!contact.name.trim()) fieldErrors.name = 'Add your name'
  if (contact.phone.replace(/\D/g, '').length < 9) fieldErrors.phone = 'Add a phone number we can reach you on'
  if (way === 'delivery' && !contact.address.trim()) fieldErrors.address = 'Where should we deliver?'
  if (way === 'dine-in' && !table) fieldErrors.table = 'Choose your table'
  if (!method) fieldErrors.method = 'Choose how you’ll pay'
  if (!way) fieldErrors.way = 'Choose pickup, delivery or dine-in'

  const place = async () => {
    setTried(true)
    setServerError(null)
    if (Object.keys(fieldErrors).length || priced.problems.length || blocked || !way || !method) {
      document.querySelector('[data-invalid="true"]')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      return
    }
    setSubmitting(true)
    try {
      const order = await source.placeOrder(slug, {
        lines: lines.map(({ itemId, quantity, choices, comboPicks, note }) => ({ itemId, quantity, choices, comboPicks, note })),
        customer: { name: contact.name, phone: contact.phone },
        fulfilment: {
          type: way,
          table: way === 'dine-in' ? table : undefined,
          address: way === 'delivery' ? contact.address : undefined,
          landmark: way === 'delivery' ? contact.landmark || undefined : undefined,
          pickupAt: way === 'pickup' ? pickupAt : undefined,
        },
        payment: { method, reference: method === 'momo' ? reference : undefined },
        notes,
      })
      addTicket({ slug, code: order.code, accessKey: order.accessKey })
      setPref(slug, { fulfilment: way, table: way === 'dine-in' ? table : pref.table })
      clear(slug)
      void qc.invalidateQueries({ queryKey: ['eatery'] })
      router.push(`/${locale}/eat/${slug}/order/${order.code}`)
    } catch (err) {
      // 409 closed / paused, 422 a menu or field problem: stay here and say why.
      setServerError(apiErrorMessage(err, 'Couldn’t place your order. Please try again.'))
      void qc.invalidateQueries({ queryKey: ['eatery', source.kind, 'store', slug] })
    } finally {
      setSubmitting(false)
    }
  }

  const err = (k: string) =>
    tried && fieldErrors[k] ? (
      <p className="mt-1.5 text-sm font-bold" style={{ color: 'var(--e-primary-text)' }}>
        {fieldErrors[k]}
      </p>
    ) : null

  return (
    <ThemeScope theme={r.theme} as="main" className="min-h-[100dvh] pb-36 lg:pb-16">
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{ borderColor: 'var(--e-border)', background: 'color-mix(in srgb, var(--e-bg) 88%, transparent)' }}
      >
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4 lg:max-w-5xl">
          <Link
            href={`/${locale}/eat/${slug}`}
            className="flex h-11 w-11 items-center justify-center rounded-full e-focus"
            aria-label={`Back to ${r.name}`}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <p className="e-display text-xl leading-none truncate">{r.theme.copy.cart}</p>
            <p className="text-xs e-muted truncate">{r.name}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-4 lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6 lg:pt-6">
        {lines.length === 0 ? (
          <div className="e-card p-8 text-center">
            <ShoppingBag className="mx-auto h-10 w-10" style={{ color: 'var(--e-primary-text)' }} aria-hidden />
            <p className="mt-3 e-display text-2xl">Nothing here yet</p>
            <Link href={`/${locale}/eat/${slug}`} className="e-btn mt-5">
              Browse the menu
            </Link>
          </div>
        ) : (
          <>
            <Section title="Your order" id="sec-order" className="lg:col-start-2 lg:row-start-1">
              <ul className="divide-y divide-[color:var(--e-border)]">
                {lines.map((l) => {
                  const pricedLine = priceOrder(bundle, [l], null, now).lines[0]
                  const item = itemsById.get(l.itemId)
                  return (
                    <li key={l.key} className="flex gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold">{item?.name ?? 'No longer on the menu'}</p>
                        {pricedLine?.summary && <p className="text-sm e-muted">{pricedLine.summary}</p>}
                        {l.note && <p className="text-sm e-muted italic">“{l.note}”</p>}
                        <div className="mt-2 flex items-center gap-1">
                          <button
                            type="button"
                            className="flex h-10 w-10 items-center justify-center rounded-full e-btn-quiet !min-h-0 !p-0"
                            aria-label={`One less ${item?.name ?? ''}`}
                            onClick={() => setQuantity(slug, l.key, l.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-extrabold tabular-nums" aria-label={`Quantity ${l.quantity}`}>
                            {l.quantity}
                          </span>
                          <button
                            type="button"
                            className="flex h-10 w-10 items-center justify-center rounded-full e-btn-quiet !min-h-0 !p-0"
                            aria-label={`One more ${item?.name ?? ''}`}
                            onClick={() => setQuantity(slug, l.key, l.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="ml-1 flex h-10 w-10 items-center justify-center rounded-full e-focus e-muted"
                            aria-label={`Remove ${item?.name ?? 'item'}`}
                            onClick={() => removeLine(slug, l.key)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="e-price">{pricedLine ? formatMoney(pricedLine.lineTotal, currency) : '—'}</p>
                    </li>
                  )
                })}
              </ul>
              <Link
                href={`/${locale}/eat/${slug}`}
                className="mt-2 inline-flex h-11 items-center text-sm font-bold underline-offset-4 hover:underline"
                style={{ color: 'var(--e-primary-text)' }}
              >
                + Add more
              </Link>
            </Section>

            <div className="flex flex-col gap-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
              {blocked && (
                <p role="alert" className="flex items-center gap-2 e-card px-4 py-3 text-sm font-bold">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--e-primary-text)' }} /> {blocked} — you can place
                  this order once they open.
                </p>
              )}

              <Section title="How would you like it?" id="sec-way" step={1}>
                <div
                  role="radiogroup"
                  aria-label="Pickup, delivery or dine-in"
                  className="grid grid-cols-3 gap-2"
                  data-invalid={tried && !!fieldErrors.way}
                >
                  {ways.map((w) => {
                    const Icon = w === 'delivery' ? Bike : w === 'dine-in' ? UtensilsCrossed : ShoppingBag
                    return (
                      <button
                        key={w}
                        type="button"
                        role="radio"
                        aria-checked={way === w}
                        onClick={() => setWay(w)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-1 py-3 text-sm font-bold e-choice !min-h-[72px]',
                          way === w && '!border-[color:var(--e-primary-text)] e-soft'
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                        {w === 'dine-in' ? 'At my table' : w === 'delivery' ? 'Delivery' : 'Pickup'}
                      </button>
                    )
                  })}
                </div>
                {err('way')}
                {way === 'pickup' && (
                  <label className="mt-4 block">
                    <span className="text-sm font-bold">Pickup time</span>
                    <select value={pickupAt} onChange={(e) => setPickupAt(e.target.value)} className="e-input mt-1.5">
                      <option value="asap">As soon as possible (~{r.fulfilment.pickup.prepMinutes} min)</option>
                      {slots.map((s) => (
                        <option key={s} value={s}>
                          {clockLabel(s)}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-xs e-muted">
                      {r.address}, {r.city}
                    </span>
                  </label>
                )}
                {way === 'delivery' && (
                  <div className="mt-4 grid gap-3">
                    <label className="block" data-invalid={tried && !!fieldErrors.address}>
                      <span className="text-sm font-bold">Delivery address</span>
                      <textarea
                        value={contact.address}
                        onChange={(e) => setContact({ address: e.target.value })}
                        className="e-input mt-1.5"
                        rows={2}
                        placeholder="House number, street, area"
                        autoComplete="street-address"
                      />
                      {err('address')}
                    </label>
                    <label className="block">
                      <span className="text-sm font-bold">Landmark or GhanaPost GPS</span>
                      <input
                        value={contact.landmark}
                        onChange={(e) => setContact({ landmark: e.target.value })}
                        className="e-input mt-1.5"
                        placeholder="Opposite the Total filling station · GA-123-4567"
                      />
                    </label>
                    <p className="text-xs e-muted">
                      Delivery {r.fulfilment.delivery.area ? `to ${r.fulfilment.delivery.area} ` : ''}· about{' '}
                      {r.fulfilment.delivery.etaMinutes} min
                      {r.fulfilment.delivery.minOrder ? ` · minimum order ${formatMoney(r.fulfilment.delivery.minOrder, currency)}` : ''}
                    </p>
                  </div>
                )}
                {way === 'dine-in' && (
                  <label className="mt-4 block" data-invalid={tried && !!fieldErrors.table}>
                    <span className="text-sm font-bold">Your table</span>
                    <select value={table} onChange={(e) => setTable(e.target.value)} className="e-input mt-1.5">
                      <option value="">Choose your table</option>
                      {r.fulfilment.dineIn.tables.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    {err('table')}
                  </label>
                )}
              </Section>

              <Section title="Your details" id="sec-details" step={2}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block" data-invalid={tried && !!fieldErrors.name}>
                    <span className="text-sm font-bold">Name</span>
                    <input
                      value={contact.name}
                      onChange={(e) => setContact({ name: e.target.value })}
                      className="e-input mt-1.5"
                      autoComplete="name"
                    />
                    {err('name')}
                  </label>
                  <label className="block" data-invalid={tried && !!fieldErrors.phone}>
                    <span className="text-sm font-bold">Phone</span>
                    <input
                      value={contact.phone}
                      onChange={(e) => setContact({ phone: e.target.value })}
                      className="e-input mt-1.5"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="024 123 4567"
                    />
                    {err('phone')}
                  </label>
                </div>
              </Section>

              <Section title="Payment" id="sec-pay" step={3}>
                <div role="radiogroup" aria-label="Payment method" className="grid gap-2" data-invalid={tried && !!fieldErrors.method}>
                  {methods.map((m) => {
                    const Icon = m === 'momo' ? Smartphone : m === 'cash' ? Banknote : UtensilsCrossed
                    return (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={method === m}
                        onClick={() => setMethod(m)}
                        className={cn('e-choice text-left', method === m && '!border-[color:var(--e-primary-text)] e-soft')}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" aria-hidden />
                        <span className="flex-1">
                          <span className="block font-bold">
                            {m === 'momo' ? 'Mobile money' : m === 'cash' ? cashLabel : 'Pay at the table'}
                          </span>
                          <span className="block text-xs e-muted">
                            {m === 'momo'
                              ? `${NETWORK[r.payments.momo.network]} · ${r.payments.momo.number}`
                              : m === 'cash'
                                ? 'Pay when you get your order'
                                : 'Settle with your server — cash, card or MoMo'}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
                {err('method')}
                {method === 'momo' && (
                  <div className="mt-3 rounded-[var(--e-radius-control)] p-3 text-sm e-soft">
                    <p>
                      Send <strong>{formatMoney(priced.total, currency)}</strong> to <strong>{r.payments.momo.number}</strong> (
                      {r.payments.momo.accountName}, {NETWORK[r.payments.momo.network]}). Staff confirm the payment before preparing your
                      order.
                    </p>
                    <label className="mt-3 block">
                      <span className="font-bold">Transaction ID (optional)</span>
                      <input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        className="e-input mt-1.5"
                        placeholder="From your MoMo confirmation SMS"
                      />
                    </label>
                  </div>
                )}
                <label className="mt-4 block">
                  <span className="text-sm font-bold">Anything else?</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 300))}
                    className="e-input mt-1.5"
                    rows={2}
                    placeholder="Call when you’re outside, birthday candle…"
                  />
                </label>
              </Section>
            </div>

            <section aria-label="Total" className="e-card p-4 sm:p-6 lg:sticky lg:top-20 lg:col-start-2 lg:row-start-2">
              <dl className="grid gap-1.5 text-[15px]">
                <div className="flex justify-between">
                  <dt className="e-muted">Subtotal</dt>
                  <dd className="tabular-nums">{formatMoney(priced.subtotal, currency)}</dd>
                </div>
                {priced.discount > 0 && (
                  <div className="flex justify-between font-bold" style={{ color: 'var(--e-primary-text)' }}>
                    <dt>Deals</dt>
                    <dd className="tabular-nums">−{formatMoney(priced.discount, currency)}</dd>
                  </div>
                )}
                {priced.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <dt className="e-muted">Delivery</dt>
                    <dd className="tabular-nums">{formatMoney(priced.deliveryFee, currency)}</dd>
                  </div>
                )}
                <div className="mt-1 flex justify-between border-t pt-2 text-lg font-extrabold" style={{ borderColor: 'var(--e-border)' }}>
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatMoney(priced.total, currency)}</dd>
                </div>
              </dl>
              {priced.problems.length > 0 && (
                <ul className="mt-3 grid gap-1 text-sm font-bold" style={{ color: 'var(--e-primary-text)' }}>
                  {priced.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              {/* Desktop: the button sits with the total. Phones use the bar below. */}
              <div className="hidden lg:block">
                {serverError && (
                  <p role="alert" className="mt-3 flex items-start gap-2 text-sm font-bold" style={{ color: 'var(--e-primary-text)' }}>
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {serverError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void place()}
                  disabled={submitting || !!blocked}
                  className="e-btn mt-4 h-14 w-full text-base"
                >
                  {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                  {blocked ? blocked : `Place order · ${formatMoney(priced.total, currency)}`}
                </button>
                <p className="mt-2 text-center text-[11px] e-muted">Prices are confirmed by {r.name} when you order.</p>
              </div>
            </section>
          </>
        )}
      </div>

      {lines.length > 0 && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
          style={{ background: 'var(--e-surface)', borderColor: 'var(--e-border)' }}
        >
          <div className="mx-auto max-w-2xl">
            {serverError && (
              <p role="alert" className="mb-2 flex items-start gap-2 text-sm font-bold" style={{ color: 'var(--e-primary-text)' }}>
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {serverError}
              </p>
            )}
            <button type="button" onClick={() => void place()} disabled={submitting || !!blocked} className="e-btn h-14 w-full text-base">
              {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
              {blocked ? blocked : `Place order · ${formatMoney(priced.total, currency)}`}
            </button>
          </div>
        </div>
      )}
    </ThemeScope>
  )
}
