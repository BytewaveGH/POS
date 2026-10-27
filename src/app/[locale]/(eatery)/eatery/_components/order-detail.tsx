'use client'

import React from 'react'
import { Ban, Check, Printer, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge, Button } from '@/components/kit/ui'
import { Drawer } from '@/components/kit/form'
import { clockLabel, formatMoney } from '@/lib/eatery/menu'
import { fulfilmentName, methodLabel } from '@/lib/eatery/sales'
import type { Order, Restaurant } from '@/lib/eatery/types'
import { STATUS } from './order-bits'

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

const Row = ({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) => (
  <div className={cn('flex justify-between gap-3 text-sm', strong && 'text-base font-extrabold text-stone-900')}>
    <dt className={strong ? '' : 'text-stone-500'}>{label}</dt>
    <dd className="tabular-nums text-right">{children}</dd>
  </div>
)

// One transaction in full, with what staff can still do about it.
export const OrderDetail = ({
  order,
  restaurant,
  onOpenChange,
  onMarkPaid,
  onCancel,
  onPrint,
  busy,
}: {
  order: Order | null
  restaurant: Restaurant
  onOpenChange: (o: boolean) => void
  onMarkPaid: (o: Order) => void
  onCancel: (o: Order) => void
  onPrint: (o: Order) => void
  busy?: boolean
}) => {
  if (!order) return null
  const m = (n: number) => formatMoney(n, restaurant.currency)
  const cancelled = order.status === 'cancelled'
  const f = order.fulfilment
  const profit = order.costOfGoods !== undefined && !cancelled ? Math.round((order.total - order.costOfGoods) * 100) / 100 : null
  return (
    <Drawer
      open={!!order}
      onOpenChange={onOpenChange}
      title={`Order #${order.code}`}
      description={`${when(order.createdAt)} · ${order.channel === 'counter' ? 'Counter' : 'Online'} · ${fulfilmentName(f.type)}`}
      footer={
        <>
          {!cancelled && order.status !== 'completed' && (
            <Button
              variant="ghost"
              icon={Ban}
              className="mr-auto text-rose-600 hover:bg-rose-50"
              onClick={() => onCancel(order)}
              disabled={busy}
            >
              Cancel order
            </Button>
          )}
          <Button variant="secondary" icon={Printer} onClick={() => onPrint(order)}>
            Receipt
          </Button>
          {!cancelled && order.payment.status !== 'paid' && (
            <Button icon={Wallet} onClick={() => onMarkPaid(order)} loading={busy}>
              Mark paid
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge spec={STATUS[order.status]} />
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-bold',
              order.payment.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
            )}
          >
            {methodLabel(order.payment.method)} ·{' '}
            {order.payment.status === 'paid' ? 'paid' : order.payment.status === 'pending' ? 'to confirm' : 'not paid'}
          </span>
        </div>

        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Customer</h3>
          <dl className="space-y-1">
            <Row label="Name">{order.customer.name}</Row>
            {order.customer.phone && (
              <Row label="Phone">
                <a href={`tel:${order.customer.phone.replace(/\s/g, '')}`} className="font-semibold text-endeavour">
                  {order.customer.phone}
                </a>
              </Row>
            )}
            {f.type === 'dine-in' && <Row label="Table">{f.table ?? '—'}</Row>}
            {f.type === 'delivery' && <Row label="Deliver to">{[f.address, f.landmark].filter(Boolean).join(' · ')}</Row>}
            {f.type === 'pickup' && f.pickupAt && f.pickupAt !== 'asap' && <Row label="Pickup at">{clockLabel(f.pickupAt)}</Row>}
          </dl>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Items</h3>
          <ul className="divide-y divide-stone-100">
            {order.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-bold text-stone-900">
                    {l.quantity}× {l.name}
                  </span>
                  {l.summary && <span className="block text-xs text-stone-500">{l.summary}</span>}
                  {l.note && <span className="block text-xs italic text-amber-700">“{l.note}”</span>}
                </span>
                <span className="tabular-nums text-stone-800">{m(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          {order.notes && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">“{order.notes}”</p>}
        </section>

        <section>
          <dl className="space-y-1 border-t border-stone-100 pt-3">
            <Row label="Items">{m(order.subtotal)}</Row>
            {order.discount > 0 && <Row label="Deals">−{m(order.discount)}</Row>}
            {order.deliveryFee > 0 && <Row label="Delivery">{m(order.deliveryFee)}</Row>}
            <Row label="Total" strong>
              {m(order.total)}
            </Row>
            {order.tendered && order.tendered > order.total && (
              <>
                <Row label="Cash given">{m(order.tendered)}</Row>
                <Row label="Change">{m(Math.round((order.tendered - order.total) * 100) / 100)}</Row>
              </>
            )}
            {order.payment.reference && <Row label="MoMo reference">{order.payment.reference}</Row>}
            {profit !== null && (
              <Row label="Ingredients · profit">
                {m(order.costOfGoods!)} · <strong className={profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{m(profit)}</strong>
              </Row>
            )}
          </dl>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Timeline</h3>
          <ol className="space-y-2">
            {order.history.map((h, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full',
                    h.status === 'cancelled' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="font-semibold text-stone-800">{STATUS[h.status].label}</span>
                <span className="ml-auto text-xs tabular-nums text-stone-400">{when(h.at)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Drawer>
  )
}
