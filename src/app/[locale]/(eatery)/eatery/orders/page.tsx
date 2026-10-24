'use client'

import React, { useEffect, useState } from 'react'
import { isSameDay } from 'date-fns'
import { Card, PageHeader } from '@/components/kit/ui'
import { ConfirmDialog, Segmented } from '@/components/kit/form'
import { useEateryActions, useNow } from '@/lib/eatery/hooks'
import type { FulfilmentType, Order, OrderStatus } from '@/lib/eatery/types'
import { EateryFrame, RestaurantSwitcher } from '../_components/frame'
import { OrderCard } from '../_components/order-bits'
import { SoundToggle, useNewOrderAlert } from '../_components/alerts'

const COLUMNS: { key: string; title: string; statuses: OrderStatus[]; empty: string }[] = [
  { key: 'new', title: 'New', statuses: ['placed'], empty: 'New orders land here' },
  { key: 'kitchen', title: 'In the kitchen', statuses: ['accepted', 'preparing'], empty: 'Nothing cooking' },
  { key: 'ready', title: 'Ready & on the way', statuses: ['ready', 'out-for-delivery'], empty: 'Nothing waiting' },
]

// "(2) Orders" in the tab title so a waiting order is noticed from another tab.
const TitleCount = ({ count }: { count: number }) => {
  useEffect(() => {
    document.title = count ? `(${count}) Orders · Sellix` : 'Orders · Sellix'
  }, [count])
  return null
}

const Alerts = ({ orders, currency }: { orders: Order[]; currency: string }) => {
  const { sound, toggle } = useNewOrderAlert(orders, currency)
  return (
    <div className="mb-3 flex justify-end">
      <SoundToggle sound={sound} onToggle={() => void toggle()} />
    </div>
  )
}

export default function OrdersBoard() {
  const now = useNow(15_000)
  const actions = useEateryActions()
  const [type, setType] = useState<FulfilmentType | 'all'>('all')
  const [busy, setBusy] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState<Order | null>(null)

  const update = async (o: Order, body: Partial<Order>) => {
    setBusy(o.id)
    try {
      await actions.update('orders', o.id, body)
    } catch {
      // toast shown
    } finally {
      setBusy(null)
    }
  }

  return (
    <EateryFrame>
      {(o) => {
        const list = o.orders.filter((x) => type === 'all' || x.fulfilment.type === type)
        const done = list.filter((x) => ['completed', 'cancelled'].includes(x.status) && isSameDay(new Date(x.updatedAt), now))
        const fresh = o.orders.filter((x) => x.status === 'placed').length
        const r = o.restaurant
        return (
          <>
            <TitleCount count={fresh} />
            <Alerts orders={o.orders} currency={r.currency} />
            <PageHeader
              eyebrow={r.name}
              title="Live orders"
              description="Move each order along as it’s made. Customers see every step on their phone."
              actions={<RestaurantSwitcher o={o} />}
            />
            <div className="mb-4 max-w-md">
              <Segmented
                ariaLabel="Order type"
                value={type}
                onChange={setType}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'dine-in', label: 'Dine-in' },
                  { value: 'pickup', label: 'Pickup' },
                  { value: 'delivery', label: 'Delivery' },
                ]}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {COLUMNS.map((c) => {
                const orders = list.filter((x) => c.statuses.includes(x.status)).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
                return (
                  <section key={c.key} aria-labelledby={`col-${c.key}`} className="rounded-2xl bg-stone-50 p-3">
                    <h2 id={`col-${c.key}`} className="mb-3 flex items-center justify-between px-1 text-sm font-extrabold text-stone-800">
                      {c.title}
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs tabular-nums text-stone-500 ring-1 ring-stone-200">
                        {orders.length}
                      </span>
                    </h2>
                    <div className="flex flex-col gap-3">
                      {orders.length === 0 && <p className="py-8 text-center text-xs text-stone-400">{c.empty}</p>}
                      {orders.map((x) => (
                        <OrderCard
                          key={x.id}
                          order={x}
                          currency={r.currency}
                          now={now}
                          busy={busy === x.id}
                          onAdvance={(to) => void update(x, { status: to })}
                          onMarkPaid={() => void update(x, { payment: { ...x.payment, status: 'paid' } })}
                          onCancel={() => setCancelling(x)}
                        />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
            {done.length > 0 && (
              <Card className="mt-6 p-5">
                <h2 className="text-sm font-extrabold text-stone-800 mb-3">Finished today · {done.length}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {done.map((x) => (
                    <OrderCard
                      key={x.id}
                      order={x}
                      currency={r.currency}
                      now={now}
                      compact
                      onMarkPaid={
                        x.status === 'completed' ? () => void update(x, { payment: { ...x.payment, status: 'paid' } }) : undefined
                      }
                    />
                  ))}
                </div>
              </Card>
            )}
            <ConfirmDialog
              open={!!cancelling}
              onOpenChange={(v) => !v && setCancelling(null)}
              title={`Cancel order #${cancelling?.code ?? ''}?`}
              description="The customer sees it as cancelled. If they paid by MoMo, refund them yourself."
              confirmLabel="Cancel order"
              onConfirm={() => (cancelling ? actions.update('orders', cancelling.id, { status: 'cancelled' }) : undefined)}
            />
          </>
        )
      }}
    </EateryFrame>
  )
}
