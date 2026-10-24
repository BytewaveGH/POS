'use client'

import React from 'react'
import { Bike, CheckCircle2, ChefHat, Clock, Loader2, PackageCheck, ShoppingBag, Smartphone, UtensilsCrossed, XCircle } from 'lucide-react'
import { differenceInMinutes } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge, type BadgeSpec } from '@/components/kit/ui'
import { clockLabel, formatMoney } from '@/lib/eatery/menu'
import type { Order, OrderStatus } from '@/lib/eatery/types'

export const STATUS: Record<OrderStatus, BadgeSpec> = {
  placed: { label: 'New', icon: Clock, className: 'bg-rose-50 text-rose-700 ring-rose-600/15', dot: '#E11D48' },
  accepted: { label: 'Accepted', icon: CheckCircle2, className: 'bg-endeavour/10 text-endeavour ring-endeavour/15', dot: '#0865AC' },
  preparing: { label: 'Preparing', icon: ChefHat, className: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: '#F59E0B' },
  ready: { label: 'Ready', icon: PackageCheck, className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', dot: '#10B981' },
  'out-for-delivery': { label: 'On the way', icon: Bike, className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', dot: '#10B981' },
  completed: { label: 'Completed', icon: CheckCircle2, className: 'bg-stone-100 text-stone-600 ring-stone-400/20', dot: '#A8A29E' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'bg-stone-100 text-stone-500 ring-stone-400/20', dot: '#D6D3D1' },
}

export const LIVE: OrderStatus[] = ['placed', 'accepted', 'preparing', 'ready', 'out-for-delivery']

// The one obvious next step for an order.
export const nextStep = (o: Order): { to: OrderStatus; label: string } | null => {
  switch (o.status) {
    case 'placed':
      return { to: 'accepted', label: 'Accept' }
    case 'accepted':
      return { to: 'preparing', label: 'Start preparing' }
    case 'preparing':
      return o.fulfilment.type === 'delivery' ? { to: 'out-for-delivery', label: 'Send out' } : { to: 'ready', label: 'Mark ready' }
    case 'ready':
      return { to: 'completed', label: o.fulfilment.type === 'dine-in' ? 'Served' : 'Picked up' }
    case 'out-for-delivery':
      return { to: 'completed', label: 'Delivered' }
    default:
      return null
  }
}

export const fulfilmentLabel = (o: Order) =>
  o.fulfilment.type === 'dine-in'
    ? `Table ${o.fulfilment.table}`
    : o.fulfilment.type === 'delivery'
      ? 'Delivery'
      : o.fulfilment.pickupAt && o.fulfilment.pickupAt !== 'asap'
        ? `Pickup ${clockLabel(o.fulfilment.pickupAt)}`
        : 'Pickup ASAP'

const FULFIL_ICON = { 'dine-in': UtensilsCrossed, delivery: Bike, pickup: ShoppingBag }

export const ago = (iso: string, now: Date) => {
  const m = differenceInMinutes(now, new Date(iso))
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 24 * 60 ? `${Math.floor(m / 60)} h ago` : new Date(iso).toLocaleDateString()
}

export const paymentLabel = (o: Order) =>
  `${o.payment.method === 'momo' ? 'MoMo' : o.payment.method === 'cash' ? 'Cash' : o.payment.method === 'card' ? 'Card' : 'At table'} · ${o.payment.status === 'paid' ? 'paid' : o.payment.status === 'pending' ? 'to confirm' : 'unpaid'}`

export const OrderCard = ({
  order,
  currency,
  now,
  busy,
  onAdvance,
  onCancel,
  onMarkPaid,
  compact,
}: {
  order: Order
  currency: string
  now: Date
  busy?: boolean
  onAdvance?: (to: OrderStatus) => void
  onCancel?: () => void
  onMarkPaid?: () => void
  compact?: boolean
}) => {
  const step = nextStep(order)
  const Icon = FULFIL_ICON[order.fulfilment.type]
  const waiting = order.status === 'placed' && differenceInMinutes(now, new Date(order.createdAt)) >= 5
  return (
    <article
      className={cn('rounded-2xl border bg-white p-4 shadow-sm', waiting ? 'border-rose-300 ring-2 ring-rose-100' : 'border-stone-200')}
      aria-label={`Order ${order.code}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-extrabold tracking-wider text-stone-900">#{order.code}</p>
          <p className="text-xs text-stone-500">
            {order.customer.name} · {ago(order.createdAt, now)}
          </p>
        </div>
        <Badge spec={STATUS[order.status]} />
      </header>
      <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">
        <Icon className="h-3.5 w-3.5" /> {fulfilmentLabel(order)}
        {order.channel === 'counter' && <span className="ml-1 rounded bg-white px-1 text-[10px] text-stone-500">Counter</span>}
      </p>
      {!compact && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {order.lines.map((l, i) => (
            <li key={i}>
              <span className="font-bold text-stone-900">
                {l.quantity}× {l.name}
              </span>
              {l.summary && <span className="block text-xs text-stone-500">{l.summary}</span>}
              {l.note && <span className="block text-xs italic text-amber-700">“{l.note}”</span>}
            </li>
          ))}
        </ul>
      )}
      {!compact && order.fulfilment.type === 'delivery' && (
        <p className="mt-2 text-xs text-stone-600">
          {order.fulfilment.address}
          {order.fulfilment.landmark ? ` · ${order.fulfilment.landmark}` : ''} ·{' '}
          <a href={`tel:${order.customer.phone.replace(/\s/g, '')}`} className="font-semibold text-endeavour">
            {order.customer.phone}
          </a>
        </p>
      )}
      {!compact && order.notes && <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-800">“{order.notes}”</p>}
      <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
        <div>
          <p className="text-base font-extrabold tabular-nums text-stone-900">{formatMoney(order.total, currency)}</p>
          <p
            className={cn(
              'text-[11px] font-semibold inline-flex items-center gap-1',
              order.payment.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'
            )}
          >
            {order.payment.method === 'momo' && <Smartphone className="h-3 w-3" />}
            {paymentLabel(order)}
            {order.payment.reference ? ` · ref ${order.payment.reference}` : ''}
          </p>
        </div>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-stone-400" />}
      </div>
      {(onAdvance || onCancel || onMarkPaid) && (step || order.payment.status !== 'paid') && order.status !== 'cancelled' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {step && onAdvance && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAdvance(step.to)}
              className="h-10 flex-1 rounded-xl bg-endeavour px-3 text-sm font-bold text-white hover:bg-veniceBlue disabled:opacity-50"
            >
              {step.label}
            </button>
          )}
          {onMarkPaid && order.payment.status !== 'paid' && (
            <button
              type="button"
              disabled={busy}
              onClick={onMarkPaid}
              className="h-10 rounded-xl border border-stone-200 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              Mark paid
            </button>
          )}
          {onCancel && ['placed', 'accepted'].includes(order.status) && (
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="h-10 rounded-xl px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              {order.status === 'placed' ? 'Decline' : 'Cancel'}
            </button>
          )}
        </div>
      )}
    </article>
  )
}
