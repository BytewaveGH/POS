'use client'

import React from 'react'
import Link from 'next/link'
import { isSameDay } from 'date-fns'
import { ClipboardList, Flame, Palette, Receipt, Settings, TrendingUp, UtensilsCrossed, Wallet } from 'lucide-react'
import { Card, PageHeader, SectionTitle, StatCard } from '@/components/kit/ui'
import { useNow } from '@/lib/eatery/hooks'
import { formatMoney, openState, promotionLive } from '@/lib/eatery/menu'
import { presetFor } from '@/lib/eatery/presets'
import { BrandMark, Cover, ThemeScope } from '@/components/eatery/theme-scope'
import { EateryFrame, RestaurantSwitcher, useLocalePath } from './_components/frame'
import { LIVE, OrderCard } from './_components/order-bits'
import { ProfitPanel } from './_components/profit'
import { SalesPatterns } from './_components/patterns'

export default function EateryOverview() {
  const now = useNow()
  const path = useLocalePath()
  return (
    <EateryFrame>
      {(o) => {
        const r = o.restaurant
        const today = o.orders.filter((x) => isSameDay(new Date(x.createdAt), now) && x.status !== 'cancelled')
        const revenue = today.reduce((s, x) => s + x.total, 0)
        const live = o.orders.filter((x) => LIVE.includes(x.status))
        const fresh = live.filter((x) => x.status === 'placed').length
        const state = openState(r.hours, now)
        const soldOut = o.items.filter((i) => i.status === 'sold-out').length
        const promo = o.promotions.find((p) => promotionLive(p, now))
        const counts = new Map<string, number>()
        o.orders
          .filter((x) => x.status !== 'cancelled' && +now - +new Date(x.createdAt) < 30 * 86_400_000)
          .forEach((x) => x.lines.forEach((l) => counts.set(l.name, (counts.get(l.name) ?? 0) + l.quantity)))
        const top = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
        const maxTop = top[0]?.[1] ?? 1

        return (
          <>
            <PageHeader
              eyebrow="Eatery"
              title={r.name}
              description={`${presetFor(r.category).label} · ${state.open ? state.label : `Closed · ${state.label.toLowerCase()}`}${r.acceptingOrders ? '' : ' · orders paused'}`}
              actions={<RestaurantSwitcher o={o} />}
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard
                label="Live orders"
                value={live.length}
                hint={fresh ? `${fresh} waiting to be accepted` : 'All caught up'}
                icon={ClipboardList}
                tone={fresh ? 'rose' : 'green'}
              />
              <StatCard label="Orders today" value={today.length} icon={Receipt} tone="blue" />
              <StatCard
                label="Sales today"
                value={formatMoney(revenue, r.currency)}
                hint={today.length ? `Avg ${formatMoney(revenue / today.length, r.currency)}` : undefined}
                icon={Wallet}
                tone="green"
                footer={
                  <Link href={path('/eatery/sales')} className="text-xs font-semibold text-endeavour hover:underline">
                    Sales history & daily totals →
                  </Link>
                }
              />
              <StatCard
                label="Menu"
                value={o.items.length}
                hint={soldOut ? `${soldOut} sold out` : 'Everything available'}
                icon={UtensilsCrossed}
                tone={soldOut ? 'amber' : 'stone'}
              />
            </div>

            <ProfitPanel o={o} now={now} href={path} />
            <SalesPatterns o={o} now={now} />

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <SectionTitle
                  title="Live orders"
                  hint="Refreshes on its own"
                  action={
                    <Link href={path('/eatery/orders')} className="text-sm font-semibold text-endeavour hover:underline">
                      Open the board →
                    </Link>
                  }
                />
                {live.length === 0 ? (
                  <p className="py-10 text-center text-sm text-stone-500">No open orders. New ones appear here as customers order.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {live.slice(0, 4).map((x) => (
                      <OrderCard key={x.id} order={x} currency={r.currency} now={now} compact />
                    ))}
                  </div>
                )}
              </Card>

              <div className="flex flex-col gap-4">
                <ThemeScope theme={r.theme} className="overflow-hidden rounded-2xl border">
                  <Cover theme={r.theme} className="h-24" />
                  <div className="p-4">
                    <div className="-mt-10 mb-2">
                      <BrandMark restaurant={r} size={48} />
                    </div>
                    <p className="e-display text-2xl">{r.name}</p>
                    <p className="text-xs e-muted mt-0.5">/eat/{r.slug}</p>
                    {promo && (
                      <p className="mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold e-accent">{promo.name} is on now</p>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Link href={path('/eatery/brand')} className="e-btn-quiet text-xs">
                        <Palette className="h-4 w-4" /> Brand
                      </Link>
                      <Link href={path('/eatery/settings')} className="e-btn-quiet text-xs">
                        <Settings className="h-4 w-4" /> Settings
                      </Link>
                    </div>
                  </div>
                </ThemeScope>

                <Card className="p-5">
                  <SectionTitle title="Best sellers" hint="Last 30 days" />
                  {top.length === 0 ? (
                    <p className="text-sm text-stone-500 py-4">Your first orders will show here.</p>
                  ) : (
                    <ol className="space-y-2.5">
                      {top.map(([name, qty], i) => (
                        <li key={name}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-stone-800 inline-flex items-center gap-1.5">
                              {i === 0 && <Flame className="h-3.5 w-3.5 text-amber-500" />}
                              {name}
                            </span>
                            <span className="tabular-nums text-stone-500">{qty}</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                            <div className="h-full rounded-full bg-endeavour" style={{ width: `${(qty / maxTop) * 100}%` }} />
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              </div>
            </div>

            {o.restaurants.length > 1 && (
              <Card className="p-5 mt-4">
                <SectionTitle
                  title="Your restaurants"
                  hint={`${o.restaurants.length} on Sellix`}
                  action={<TrendingUp className="h-4 w-4 text-stone-300" />}
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {o.restaurants.map((x) => (
                    <button key={x.id} type="button" onClick={() => o.select(x.id)} className="text-left" aria-pressed={x.id === r.id}>
                      <ThemeScope
                        theme={x.theme}
                        className={`flex items-center gap-3 rounded-2xl border p-3 ${x.id === r.id ? 'ring-2 ring-endeavour' : ''}`}
                      >
                        <BrandMark restaurant={x} size={40} />
                        <span className="min-w-0">
                          <span className="block e-display text-lg truncate">{x.name}</span>
                          <span className="block text-xs e-muted">{openState(x.hours, now).open ? 'Open now' : 'Closed'}</span>
                        </span>
                      </ThemeScope>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </>
        )
      }}
    </EateryFrame>
  )
}
