'use client'

import React, { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Receipt,
  Search,
  ShoppingBag,
  Wallet,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge, BarChart, Button, Card, EmptyState, PageHeader, SectionTitle, StatCard } from '@/components/kit/ui'
import { ConfirmDialog, Segmented } from '@/components/kit/form'
import { useEateryActions, useNow, type OwnerData } from '@/lib/eatery/hooks'
import { formatMoney } from '@/lib/eatery/menu'
import {
  PAYMENT_METHODS,
  dailyCsv,
  dailySeries,
  dailyTotals,
  dayFromKey,
  dayKey,
  downloadCsv,
  filterOrders,
  fulfilmentName,
  methodLabel,
  ordersCsv,
  totalsOf,
  type SalesFilter,
} from '@/lib/eatery/sales'
import type { Order, Restaurant } from '@/lib/eatery/types'
import { EateryFrame, RestaurantSwitcher } from '../_components/frame'
import { STATUS } from '../_components/order-bits'
import { OrderDetail } from '../_components/order-detail'
import { printDayReport, printReceipt, trackingUrl } from '../_components/receipt'

type Period = 'today' | 'yesterday' | 'week' | 'month' | '30d' | 'custom'
const PAGE = 25

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

const rangeFor = (p: Period, now: Date, custom: { from: string; to: string }) => {
  const today = startOfDay(now)
  switch (p) {
    case 'today':
      return { from: today, to: addDays(today, 1) }
    case 'yesterday':
      return { from: addDays(today, -1), to: today }
    case 'week':
      return { from: addDays(today, -((today.getDay() + 6) % 7)), to: addDays(today, 1) }
    case 'month':
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: addDays(today, 1) }
    case '30d':
      return { from: addDays(today, -29), to: addDays(today, 1) }
    default: {
      const from = custom.from ? dayFromKey(custom.from) : today
      const to = custom.to ? addDays(dayFromKey(custom.to), 1) : addDays(today, 1)
      return to > from ? { from, to } : { from, to: addDays(from, 1) }
    }
  }
}

const time = (iso: string, withDate: boolean) =>
  new Date(iso).toLocaleString(
    undefined,
    withDate ? { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' } : { hour: 'numeric', minute: '2-digit' }
  )

const Th = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <th
    scope="col"
    className={cn(
      'whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-stone-400',
      right ? 'text-right' : 'text-left'
    )}
  >
    {children}
  </th>
)

const SalesScreen = ({ o }: { o: OwnerData & { restaurant: Restaurant } }) => {
  const r = o.restaurant
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const now = useNow(60_000)
  const actions = useEateryActions()
  const money = (n: number) => formatMoney(n, r.currency)

  const [period, setPeriod] = useState<Period>('today')
  const [custom, setCustom] = useState({ from: dayKey(addDays(now, -6)), to: dayKey(now) })
  const [view, setView] = useState<'transactions' | 'daily'>('transactions')
  const [filter, setFilter] = useState<SalesFilter>({
    channel: 'all',
    method: 'all',
    payment: 'all',
    status: 'all',
    fulfilment: 'all',
    query: '',
  })
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState<Order | null>(null)
  const [cancelling, setCancelling] = useState<Order | null>(null)
  const [busy, setBusy] = useState(false)

  const { from, to } = rangeFor(period, now, custom)
  const inPeriod = useMemo(() => filterOrders(o.orders, { from, to }), [o.orders, from.getTime(), to.getTime()]) // eslint-disable-line react-hooks/exhaustive-deps
  const t = totalsOf(inPeriod)
  // Same length just before, for the trend arrow.
  const span = to.getTime() - from.getTime()
  const previous = totalsOf(filterOrders(o.orders, { from: new Date(from.getTime() - span), to: from }))
  const trend = previous.net > 0 ? (t.net - previous.net) / previous.net : null
  const singleDay = span <= 86_400_000 + 3_600_000
  const rows = filterOrders(inPeriod, filter)
  const days = dailyTotals(inPeriod)
  const pageRows = rows.slice(page * PAGE, page * PAGE + PAGE)
  const live = open ? (o.orders.find((x) => x.id === open.id) ?? open) : null

  // Hour by hour for one day (from the first to the last busy hour), day by day otherwise.
  const hours = Array.from({ length: 24 }, (_, h) => {
    const v = inPeriod.filter((x) => x.status !== 'cancelled' && new Date(x.createdAt).getHours() === h).reduce((s, x) => s + x.total, 0)
    const name = `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`
    return { key: String(h), label: name.replace('m', ''), detail: name, value: Math.round(v * 100) / 100 }
  })
  const firstHour = hours.findIndex((x) => x.value > 0)
  const lastHour = hours.length - 1 - [...hours].reverse().findIndex((x) => x.value > 0)
  const chart = singleDay ? (firstHour < 0 ? [] : hours.slice(firstHour, lastHour + 1)) : dailySeries(inPeriod, from, to)

  const setF = (p: Partial<SalesFilter>) => {
    setFilter((f) => ({ ...f, ...p }))
    setPage(0)
  }
  const update = async (order: Order, body: Partial<Order>) => {
    setBusy(true)
    try {
      await actions.update('orders', order.id, body)
    } catch {
      // toast shown
    } finally {
      setBusy(false)
    }
  }
  const label =
    period === 'custom'
      ? `${custom.from} to ${custom.to}`
      : { today: 'today', yesterday: 'yesterday', week: 'this-week', month: 'this-month', '30d': 'last-30-days' }[period]
  const exportCsv = () =>
    view === 'daily'
      ? downloadCsv(`${r.slug}-daily-totals-${label}.csv`, dailyCsv(days))
      : downloadCsv(`${r.slug}-transactions-${label}.csv`, ordersCsv(rows))

  return (
    <>
      <PageHeader
        eyebrow={r.name}
        title="Sales"
        description="Every transaction — counter and online — with daily totals, payments to collect and end-of-day reports."
        actions={
          <>
            <RestaurantSwitcher o={o} />
            <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={view === 'daily' ? !days.length : !rows.length}>
              Export CSV
            </Button>
            <Button icon={Printer} onClick={() => printDayReport(dayKey(singleDay ? from : now), o.orders, r)}>
              {singleDay ? 'Day report' : 'Today’s report'}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="max-w-xl flex-1">
          <Segmented
            ariaLabel="Period"
            value={period}
            onChange={(p) => {
              setPeriod(p)
              setPage(0)
            }}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: 'week', label: 'This week' },
              { value: 'month', label: 'This month' },
              { value: '30d', label: '30 days' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              aria-label="From"
              value={custom.from}
              max={custom.to}
              onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
              className="h-10 rounded-xl border border-stone-200 px-3"
            />
            <span className="text-stone-400">to</span>
            <input
              type="date"
              aria-label="To"
              value={custom.to}
              min={custom.from}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              className="h-10 rounded-xl border border-stone-200 px-3"
            />
          </div>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Net sales"
          value={<span data-testid="net-sales">{money(t.net)}</span>}
          hint={
            trend === null ? (
              t.discounts > 0 ? (
                `After ${money(t.discounts)} in deals`
              ) : (
                'No earlier period to compare'
              )
            ) : (
              <span className={cn('inline-flex items-center gap-0.5 font-semibold', trend >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                {trend >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {Math.abs(Math.round(trend * 100))}% vs previous {singleDay ? 'day' : 'period'}
              </span>
            )
          }
          icon={Wallet}
          tone="green"
        />
        <StatCard
          label="Orders"
          value={t.orders}
          hint={t.orders ? `Avg ${money(t.average)} · ${t.items} items${t.cancelled ? ` · ${t.cancelled} cancelled` : ''}` : 'None yet'}
          icon={Receipt}
          tone="blue"
        />
        <StatCard
          label="How it was paid"
          value={<span className="text-lg">{money(t.byMethod.cash)} cash</span>}
          hint={`MoMo ${money(t.byMethod.momo)} · Card ${money(t.byMethod.card)}${t.byMethod['pay-at-table'] ? ` · At table ${money(t.byMethod['pay-at-table'])}` : ''}`}
          icon={ShoppingBag}
          tone="stone"
        />
        <button
          type="button"
          onClick={() => {
            setView('transactions')
            setF({ payment: 'unpaid' })
          }}
          className="text-left"
          aria-label={`Show ${t.unpaidCount} unpaid orders`}
        >
          <StatCard
            label="Not paid yet"
            value={money(t.unpaid)}
            hint={t.unpaidCount ? `${t.unpaidCount} order${t.unpaidCount === 1 ? '' : 's'} · tap to see` : 'All collected'}
            icon={AlertCircle}
            tone={t.unpaidCount ? 'amber' : 'green'}
          />
        </button>
      </div>

      {t.orders > 0 && (
        <Card className="mb-4 p-5">
          <SectionTitle title={singleDay ? 'Sales by hour' : 'Sales by day'} hint={`${money(t.net)} in total`} />
          <BarChart data={chart} format={(n) => money(n)} ariaLabel={singleDay ? 'Net sales by hour' : 'Net sales by day'} />
        </Card>
      )}

      <div className="mb-3 max-w-xs">
        <Segmented
          ariaLabel="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'transactions', label: `Transactions · ${inPeriod.length}` },
            { value: 'daily', label: 'Daily totals' },
          ]}
        />
      </div>

      {view === 'daily' ? (
        days.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No sales in this period"
            description="Orders from the counter and the online menu appear here."
          />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-stone-100 bg-stone-50/60">
                <tr>
                  <Th>Day</Th>
                  <Th right>Orders</Th>
                  <Th right>Net sales</Th>
                  <Th right>Cash</Th>
                  <Th right>MoMo</Th>
                  <Th right>Card</Th>
                  <Th right>At table</Th>
                  <Th right>Not paid</Th>
                  <Th right>Avg order</Th>
                  <Th right>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {days.map((d) => (
                  <tr key={d.day} className="hover:bg-stone-50/60">
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPeriod('custom')
                          setCustom({ from: d.day, to: d.day })
                          setView('transactions')
                          setPage(0)
                        }}
                        className="font-semibold text-endeavour hover:underline"
                      >
                        {dayFromKey(d.day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                      </button>
                      {d.cancelled > 0 && <span className="ml-2 text-[11px] text-stone-400">{d.cancelled} cancelled</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{d.orders}</td>
                    <td className="px-3 py-2.5 text-right font-extrabold tabular-nums text-stone-900">{money(d.net)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(d.byMethod.cash)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(d.byMethod.momo)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(d.byMethod.card)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(d.byMethod['pay-at-table'])}</td>
                    <td className={cn('px-3 py-2.5 text-right tabular-nums', d.unpaid > 0 && 'font-semibold text-amber-700')}>
                      {money(d.unpaid)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(d.average)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => printDayReport(d.day, o.orders, r)}
                        aria-label={`Print day report for ${d.day}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-stone-200 bg-stone-50/60 font-extrabold">
                <tr>
                  <td className="px-3 py-2.5">Total</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{t.orders}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums" data-testid="daily-total">
                    {money(t.net)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(t.byMethod.cash)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(t.byMethod.momo)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(t.byMethod.card)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(t.byMethod['pay-at-table'])}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(t.unpaid)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(t.average)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </Card>
        )
      ) : (
        <>
          <div className="mb-3 flex flex-col gap-2 lg:flex-row">
            <label className="relative lg:w-72">
              <span className="sr-only">Search transactions</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                value={filter.query}
                onChange={(e) => setF({ query: e.target.value })}
                placeholder="Order code, customer, phone, item"
                className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-sm"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  [
                    'channel',
                    'Channel',
                    [
                      ['all', 'All channels'],
                      ['counter', 'Counter'],
                      ['online', 'Online'],
                    ],
                  ],
                  [
                    'fulfilment',
                    'Type',
                    [
                      ['all', 'All types'],
                      ['dine-in', 'Dine-in'],
                      ['pickup', 'Take-away'],
                      ['delivery', 'Delivery'],
                    ],
                  ],
                  ['method', 'Payment method', [['all', 'All payments'], ...PAYMENT_METHODS.map((m) => [m.value, m.label])]],
                  [
                    'payment',
                    'Payment status',
                    [
                      ['all', 'Paid & unpaid'],
                      ['paid', 'Paid'],
                      ['unpaid', 'Not paid'],
                    ],
                  ],
                  [
                    'status',
                    'Order status',
                    [
                      ['all', 'Any status'],
                      ['open', 'Open'],
                      ['completed', 'Completed'],
                      ['cancelled', 'Cancelled'],
                    ],
                  ],
                ] as [keyof SalesFilter, string, [string, string][]][]
              ).map(([key, aria, opts]) => (
                <select
                  key={key}
                  aria-label={aria}
                  value={String(filter[key] ?? 'all')}
                  onChange={(e) => setF({ [key]: e.target.value } as Partial<SalesFilter>)}
                  className={cn(
                    'h-10 rounded-xl border bg-white px-2.5 text-sm',
                    filter[key] && filter[key] !== 'all' ? 'border-endeavour text-endeavour' : 'border-stone-200 text-stone-700'
                  )}
                >
                  {opts.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={inPeriod.length ? 'Nothing matches those filters' : 'No sales in this period'}
              description={inPeriod.length ? 'Try clearing a filter.' : 'Orders from the counter and the online menu appear here.'}
            />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="border-b border-stone-100 bg-stone-50/60">
                  <tr>
                    <Th>Time</Th>
                    <Th>Order</Th>
                    <Th>Customer</Th>
                    <Th>Type</Th>
                    <Th>Items</Th>
                    <Th right>Total</Th>
                    <Th>Payment</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {pageRows.map((x) => (
                    <tr
                      key={x.id}
                      className={cn('cursor-pointer hover:bg-stone-50/80', x.status === 'cancelled' && 'text-stone-400')}
                      onClick={() => setOpen(x)}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-stone-500">{time(x.createdAt, !singleDay)}</td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={(e) => (e.stopPropagation(), setOpen(x))}
                          className="font-extrabold tracking-wider text-stone-900 hover:text-endeavour"
                          aria-label={`Order ${x.code}`}
                        >
                          #{x.code}
                        </button>
                        <span className="ml-1.5 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-500">
                          {x.channel === 'counter' ? 'Counter' : 'Online'}
                        </span>
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-2.5">{x.customer.name}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {fulfilmentName(x.fulfilment.type)}
                        {x.fulfilment.table ? ` · ${x.fulfilment.table}` : ''}
                      </td>
                      <td
                        className="max-w-[260px] truncate px-3 py-2.5 text-stone-600"
                        title={x.lines.map((l) => `${l.quantity}× ${l.name}`).join(', ')}
                      >
                        {x.lines.map((l) => `${l.quantity}× ${l.name}`).join(', ')}
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2.5 text-right font-extrabold tabular-nums',
                          x.status === 'cancelled' ? 'line-through' : 'text-stone-900'
                        )}
                      >
                        {money(x.total)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-bold',
                            x.status === 'cancelled'
                              ? 'bg-stone-100 text-stone-400'
                              : x.payment.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-800'
                          )}
                        >
                          {methodLabel(x.payment.method)} · {x.payment.status === 'paid' ? 'paid' : 'unpaid'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge spec={STATUS[x.status]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-3 py-2.5 text-xs text-stone-500">
                <span>
                  {page * PAGE + 1}–{Math.min(rows.length, (page + 1) * PAGE)} of {rows.length} · {money(totalsOf(rows).net)} net
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-stone-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={(page + 1) * PAGE >= rows.length}
                    onClick={() => setPage((p) => p + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-stone-100 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </span>
              </div>
            </Card>
          )}
        </>
      )}

      <OrderDetail
        order={live}
        restaurant={r}
        busy={busy}
        onOpenChange={(v) => !v && setOpen(null)}
        onMarkPaid={(x) => void update(x, { payment: { ...x.payment, status: 'paid' } })}
        onCancel={(x) => setCancelling(x)}
        onPrint={(x) =>
          void printReceipt(
            x,
            r,
            (x as Order & { accessKey?: string }).accessKey
              ? trackingUrl(window.location.origin, locale, r.slug, x as Order & { accessKey?: string })
              : undefined
          )
        }
      />
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(v) => !v && setCancelling(null)}
        title={`Cancel order #${cancelling?.code ?? ''}?`}
        description="It stops counting in sales, its ingredients go back into stock, and the customer sees it as cancelled. Refund any payment yourself."
        confirmLabel="Cancel order"
        onConfirm={() => (cancelling ? actions.update('orders', cancelling.id, { status: 'cancelled' }) : undefined)}
      />
    </>
  )
}

export default function SalesPage() {
  return <EateryFrame>{(o) => <SalesScreen o={o} />}</EateryFrame>
}
