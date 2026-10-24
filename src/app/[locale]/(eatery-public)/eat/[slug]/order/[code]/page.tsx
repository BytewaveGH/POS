'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Bell, Check, MessageCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from '@/lib/eatery/cart'
import { useStorefront, useTrackedOrder } from '@/lib/eatery/hooks'
import { clockLabel, formatMoney } from '@/lib/eatery/menu'
import { askToNotify, chime, notify, notifyPermission } from '@/lib/eatery/notify'
import type { Order, OrderStatus } from '@/lib/eatery/types'
import { BrandMark, ThemeScope } from '@/components/eatery/theme-scope'

const STEPS = (o: Order): { status: OrderStatus; label: string; hint: string }[] => [
  { status: 'placed', label: 'Order sent', hint: 'Waiting for the restaurant to accept' },
  {
    status: 'accepted',
    label: 'Accepted',
    hint: o.payment.method === 'momo' && o.payment.status !== 'paid' ? 'Confirming your MoMo payment' : 'Your order is in the queue',
  },
  { status: 'preparing', label: 'Being prepared', hint: 'The kitchen is on it' },
  o.fulfilment.type === 'delivery'
    ? { status: 'out-for-delivery', label: 'On the way', hint: 'Your rider is heading to you' }
    : {
        status: 'ready',
        label: o.fulfilment.type === 'dine-in' ? 'Coming to your table' : 'Ready for pickup',
        hint: o.fulfilment.type === 'dine-in' ? `Table ${o.fulfilment.table}` : 'Show your order code at the counter',
      },
  { status: 'completed', label: 'Done', hint: 'Enjoy!' },
]
const STATUS_MESSAGE: Partial<Record<OrderStatus, (o: Order) => string>> = {
  accepted: () => 'Your order was accepted',
  preparing: () => 'Your order is being prepared',
  ready: (o) => (o.fulfilment.type === 'dine-in' ? 'Your order is on its way to your table' : 'Your order is ready — come and get it!'),
  'out-for-delivery': () => 'Your order is on the way',
  completed: () => 'Enjoy your order!',
  cancelled: () => 'Your order was cancelled',
}

const RANK: Record<OrderStatus, number> = {
  placed: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  'out-for-delivery': 3,
  completed: 4,
  cancelled: -1,
}

const wa = (phone: string) => {
  const d = phone.replace(/\D/g, '')
  return d.startsWith('0') ? `233${d.slice(1)}` : d
}

export default function OrderPage() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const slug = String(params?.slug ?? '')
  const code = String(params?.code ?? '')
  const search = useSearchParams()
  const addTicket = useCart((s) => s.addTicket)
  const ticket = useCart((s) => s.tickets.find((t) => t.slug === slug && t.code === code)) ?? null
  const store = useStorefront(slug)
  const { data: order, isLoading } = useTrackedOrder(ticket)
  const r = store.data?.restaurant

  // The QR code on a counter receipt carries the order key: keep it on this phone.
  const key = search?.get('k')
  useEffect(() => {
    if (key && !ticket) addTicket({ slug, code, accessKey: key })
  }, [key, ticket, slug, code, addTicket])

  // Tell the customer when their order moves on — sound, vibration, and a
  // system notification if they allowed it (works while the tab is in the background).
  const [permission, setPermission] = useState<string>('unsupported')
  const [update, setUpdate] = useState<string | null>(null)
  useEffect(() => setPermission(notifyPermission()), [])
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (!order || !r) return
    const prev = last.current
    last.current = order.status
    if (prev === null || prev === order.status) return
    const msg = STATUS_MESSAGE[order.status]?.(order)
    if (!msg) return
    setUpdate(msg)
    chime(order.status === 'ready' || order.status === 'out-for-delivery' ? 'ready' : 'new')
    notify(`${r.name} · #${order.code}`, msg, `order-${order.code}`)
    document.title = `${msg} · ${r.name}`
  }, [order, r])

  if (!r || (ticket && isLoading))
    return (
      <div className="mx-auto max-w-xl px-4 py-10" aria-busy="true">
        <div className="h-80 animate-pulse rounded-3xl bg-stone-200/70" />
      </div>
    )

  if (!ticket || !order) {
    return (
      <ThemeScope theme={r.theme} as="main" className="min-h-[100dvh] px-6 py-24 text-center">
        <p className="e-display text-3xl">Order #{code}</p>
        <p className="mt-2 e-muted">We can only show orders placed on this device. Ask {r.name} about your order code.</p>
        <Link href={`/${locale}/eat/${slug}`} className="e-btn mt-6">
          Back to the menu
        </Link>
      </ThemeScope>
    )
  }

  const steps = STEPS(order)
  const rank = RANK[order.status]
  const cancelled = order.status === 'cancelled'
  const placedAt = new Date(order.createdAt)
  const message = `Hi ${r.name}, about my order #${order.code} (${order.lines.map((l) => `${l.quantity}× ${l.name}`).join(', ')}).`

  return (
    <ThemeScope theme={r.theme} as="main" className="min-h-[100dvh] pb-16">
      <header className="mx-auto flex h-16 max-w-xl items-center gap-3 px-4">
        <Link
          href={`/${locale}/eat/${slug}`}
          className="flex h-11 w-11 items-center justify-center rounded-full e-focus"
          aria-label={`Back to ${r.name}`}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <BrandMark restaurant={r} size={34} />
        <span className="e-display text-lg truncate">{r.name}</span>
      </header>

      <div className="mx-auto max-w-xl px-4">
        {update && (
          <p
            role="status"
            className="mb-3 flex items-center gap-2 px-4 py-3 text-sm font-extrabold e-accent"
            style={{ borderRadius: 'var(--e-radius)' }}
          >
            <Bell className="h-4 w-4 flex-shrink-0" aria-hidden /> {update}
          </p>
        )}
        {permission === 'default' && !['completed', 'cancelled'].includes(order.status) && (
          <button type="button" onClick={() => void askToNotify().then((p) => setPermission(p))} className="e-btn-quiet mb-3 w-full">
            <Bell className="h-4 w-4" /> Alert me when it’s ready
          </button>
        )}
        <section className="e-card p-6 text-center" aria-live="polite">
          <p className="text-xs font-bold uppercase tracking-[0.2em] e-muted">Your order code</p>
          <p className="e-display mt-1 text-6xl tracking-widest" style={{ color: 'var(--e-primary-text)' }}>
            {order.code}
          </p>
          <p className="mt-2 text-sm e-muted">
            Placed {clockLabel(`${placedAt.getHours()}:${placedAt.getMinutes()}`)} ·{' '}
            {order.fulfilment.type === 'dine-in'
              ? `Table ${order.fulfilment.table}`
              : order.fulfilment.type === 'delivery'
                ? 'Delivery'
                : order.fulfilment.pickupAt && order.fulfilment.pickupAt !== 'asap'
                  ? `Pickup at ${clockLabel(order.fulfilment.pickupAt)}`
                  : 'Pickup, as soon as ready'}
          </p>
        </section>

        {cancelled ? (
          <p role="status" className="mt-4 flex items-center gap-3 e-card p-4 font-bold">
            <XCircle className="h-6 w-6 flex-shrink-0" style={{ color: 'var(--e-primary-text)' }} /> This order was cancelled. Please
            contact {r.name} if you’ve already paid.
          </p>
        ) : (
          <ol className="mt-4 e-card p-5" aria-label="Order progress">
            {steps.map((s, i) => {
              // Steps line up with RANK: placed 0 … completed 4.
              const done = rank >= i
              const current = rank === i
              return (
                <li key={s.status} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < steps.length - 1 && (
                    <span
                      className="absolute left-[15px] top-8 bottom-0 w-0.5"
                      style={{ background: done && rank > i ? 'var(--e-primary)' : 'var(--e-border)' }}
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      'relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold',
                      current && !done && 'animate-pulse'
                    )}
                    style={
                      done ? { background: 'var(--e-primary)', color: 'var(--e-on-primary)' } : { border: '2px solid var(--e-border)' }
                    }
                  >
                    {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <div className={cn('pt-1', !done && 'opacity-60')}>
                    <p className="font-extrabold">
                      {s.label}
                      {current && done && <span className="sr-only"> (current step)</span>}
                    </p>
                    <p className="text-sm e-muted">{s.hint}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        <section className="mt-4 e-card p-5" aria-labelledby="what">
          <h2 id="what" className="e-display text-2xl">
            What you ordered
          </h2>
          <ul className="mt-2 divide-y divide-[color:var(--e-border)]">
            {order.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3 py-2.5">
                <span>
                  <span className="font-bold">
                    {l.quantity} × {l.name}
                  </span>
                  {l.summary && <span className="block text-sm e-muted">{l.summary}</span>}
                </span>
                <span className="tabular-nums">{formatMoney(l.lineTotal, r.currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 grid gap-1 border-t pt-3 text-sm" style={{ borderColor: 'var(--e-border)' }}>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <dt className="e-muted">Deals</dt>
                <dd>−{formatMoney(order.discount, r.currency)}</dd>
              </div>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between">
                <dt className="e-muted">Delivery</dt>
                <dd>{formatMoney(order.deliveryFee, r.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold">
              <dt>Total</dt>
              <dd>{formatMoney(order.total, r.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="e-muted">Payment</dt>
              <dd className="font-semibold">
                {order.payment.method === 'momo'
                  ? 'Mobile money'
                  : order.payment.method === 'cash'
                    ? 'Cash'
                    : order.payment.method === 'card'
                      ? 'Card'
                      : 'At the table'}{' '}
                · {order.payment.status === 'paid' ? 'paid' : order.payment.status === 'pending' ? 'being confirmed' : 'to pay'}
              </dd>
            </div>
          </dl>
        </section>

        {r.whatsapp && (
          <a
            href={`https://wa.me/${wa(r.whatsapp)}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="e-btn-quiet mt-4 w-full"
          >
            <MessageCircle className="h-5 w-5" /> Message {r.name} on WhatsApp
          </a>
        )}
      </div>
    </ThemeScope>
  )
}
