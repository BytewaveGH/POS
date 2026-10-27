// Sales history and daily totals. Pure functions of the order list, so the
// numbers on the Sales page, the CSV export and the printed day report agree.
//
// Money terms (per order):
//   gross     = items before deals (order.subtotal)
//   discounts = deals (order.discount)
//   delivery  = delivery fee
//   net       = what the customer pays (order.total = gross − discounts + delivery)
// Cancelled orders are listed but never counted in totals.

import type { FulfilmentType, Order, OrderChannel, OrderStatus, PaymentMethod } from './types'

const round2 = (n: number) => Math.round(n * 100) / 100

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'momo', label: 'MoMo' },
  { value: 'card', label: 'Card' },
  { value: 'pay-at-table', label: 'At table' },
]
export const methodLabel = (m: PaymentMethod) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m
export const fulfilmentName = (t: FulfilmentType) => (t === 'dine-in' ? 'Dine-in' : t === 'delivery' ? 'Delivery' : 'Take-away')

// Local calendar day, "2026-10-27".
export const dayKey = (iso: string | Date) => {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const dayFromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export interface SalesFilter {
  from?: Date
  // Exclusive
  to?: Date
  channel?: OrderChannel | 'all'
  method?: PaymentMethod | 'all'
  payment?: 'paid' | 'unpaid' | 'all'
  status?: 'open' | 'completed' | 'cancelled' | 'all'
  fulfilment?: FulfilmentType | 'all'
  // Order code, customer name or phone, item name
  query?: string
}

const OPEN: OrderStatus[] = ['placed', 'accepted', 'preparing', 'ready', 'out-for-delivery']

export const filterOrders = (orders: Order[], f: SalesFilter) => {
  const q = f.query?.trim().toLowerCase()
  return orders
    .filter((o) => {
      const t = new Date(o.createdAt).getTime()
      if (f.from && t < f.from.getTime()) return false
      if (f.to && t >= f.to.getTime()) return false
      if (f.channel && f.channel !== 'all' && (o.channel ?? 'online') !== f.channel) return false
      if (f.method && f.method !== 'all' && o.payment.method !== f.method) return false
      if (f.fulfilment && f.fulfilment !== 'all' && o.fulfilment.type !== f.fulfilment) return false
      if (f.payment === 'paid' && o.payment.status !== 'paid') return false
      if (f.payment === 'unpaid' && (o.payment.status === 'paid' || o.status === 'cancelled')) return false
      if (f.status === 'open' && !OPEN.includes(o.status)) return false
      if (f.status === 'completed' && o.status !== 'completed') return false
      if (f.status === 'cancelled' && o.status !== 'cancelled') return false
      if (q) {
        const hay = `${o.code} ${o.customer.name} ${o.customer.phone} ${o.lines.map((l) => l.name).join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export interface Totals {
  orders: number
  cancelled: number
  items: number
  gross: number
  discounts: number
  delivery: number
  net: number
  average: number
  byMethod: Record<PaymentMethod, number>
  byChannel: Record<OrderChannel, number>
  byFulfilment: Record<FulfilmentType, number>
  // Not yet paid (open or completed orders still owing)
  unpaid: number
  unpaidCount: number
  costOfGoods: number
}

const empty = (): Totals => ({
  orders: 0,
  cancelled: 0,
  items: 0,
  gross: 0,
  discounts: 0,
  delivery: 0,
  net: 0,
  average: 0,
  byMethod: { cash: 0, momo: 0, card: 0, 'pay-at-table': 0 },
  byChannel: { online: 0, counter: 0 },
  byFulfilment: { pickup: 0, delivery: 0, 'dine-in': 0 },
  unpaid: 0,
  unpaidCount: 0,
  costOfGoods: 0,
})

export const totalsOf = (orders: Order[]): Totals => {
  const t = empty()
  for (const o of orders) {
    if (o.status === 'cancelled') {
      t.cancelled++
      continue
    }
    t.orders++
    t.items += o.lines.reduce((s, l) => s + l.quantity, 0)
    t.gross += o.subtotal
    t.discounts += o.discount
    t.delivery += o.deliveryFee
    t.net += o.total
    t.byMethod[o.payment.method] = (t.byMethod[o.payment.method] ?? 0) + o.total
    t.byChannel[o.channel ?? 'online'] += o.total
    t.byFulfilment[o.fulfilment.type] += o.total
    t.costOfGoods += o.costOfGoods ?? 0
    if (o.payment.status !== 'paid') {
      t.unpaid += o.total
      t.unpaidCount++
    }
  }
  for (const k of ['gross', 'discounts', 'delivery', 'net', 'unpaid', 'costOfGoods'] as const) t[k] = round2(t[k])
  for (const m of Object.keys(t.byMethod) as PaymentMethod[]) t.byMethod[m] = round2(t.byMethod[m])
  for (const c of Object.keys(t.byChannel) as OrderChannel[]) t.byChannel[c] = round2(t.byChannel[c])
  for (const f of Object.keys(t.byFulfilment) as FulfilmentType[]) t.byFulfilment[f] = round2(t.byFulfilment[f])
  t.average = t.orders ? round2(t.net / t.orders) : 0
  return t
}

export interface DayTotals extends Totals {
  day: string
}

// One row per calendar day that has orders, newest first.
export const dailyTotals = (orders: Order[]): DayTotals[] => {
  const byDay = new Map<string, Order[]>()
  for (const o of orders) {
    const k = dayKey(o.createdAt)
    byDay.set(k, [...(byDay.get(k) ?? []), o])
  }
  return Array.from(byDay.entries())
    .map(([day, list]) => ({ day, ...totalsOf(list) }))
    .sort((a, b) => (a.day < b.day ? 1 : -1))
}

// Every day in [from, to) with its net sales (0 for quiet days) — for the chart.
export const dailySeries = (orders: Order[], from: Date, to: Date) => {
  const days = new Map(dailyTotals(orders).map((d) => [d.day, d.net]))
  const out: { key: string; label: string; detail: string; value: number }[] = []
  for (let d = new Date(from); d < to && out.length < 92; d.setDate(d.getDate() + 1)) {
    const k = dayKey(d)
    out.push({
      key: k,
      label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      detail: d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
      value: days.get(k) ?? 0,
    })
  }
  return out
}

// Best sellers within a set of orders.
export const topItems = (orders: Order[], limit = 5) => {
  const m = new Map<string, { name: string; qty: number; sales: number }>()
  for (const o of orders) {
    if (o.status === 'cancelled') continue
    for (const l of o.lines) {
      const r = m.get(l.name) ?? { name: l.name, qty: 0, sales: 0 }
      r.qty += l.quantity
      r.sales = round2(r.sales + l.lineTotal)
      m.set(l.name, r)
    }
  }
  return Array.from(m.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit)
}

// ── CSV ──

const cell = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v)
  // Quote anything with a comma, quote or newline; neutralise spreadsheet formulas.
  const safe = /^[=+\-@]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}
export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(cell).join(',')).join('\r\n')

export const ordersCsv = (orders: Order[]) =>
  toCsv([
    [
      'Date',
      'Time',
      'Order',
      'Channel',
      'Type',
      'Table',
      'Customer',
      'Phone',
      'Items',
      'Gross',
      'Discounts',
      'Delivery',
      'Total',
      'Payment',
      'Payment status',
      'Reference',
      'Status',
    ],
    ...orders.map((o) => {
      const d = new Date(o.createdAt)
      return [
        dayKey(d),
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        o.code,
        o.channel === 'counter' ? 'Counter' : 'Online',
        fulfilmentName(o.fulfilment.type),
        o.fulfilment.table ?? '',
        o.customer.name,
        o.customer.phone,
        o.lines.map((l) => `${l.quantity}x ${l.name}${l.summary ? ` (${l.summary})` : ''}`).join('; '),
        o.subtotal,
        o.discount,
        o.deliveryFee,
        o.total,
        methodLabel(o.payment.method),
        o.payment.status,
        o.payment.reference ?? '',
        o.status,
      ]
    }),
  ])

export const dailyCsv = (days: DayTotals[]) =>
  toCsv([
    [
      'Date',
      'Orders',
      'Cancelled',
      'Items',
      'Gross',
      'Discounts',
      'Delivery',
      'Net sales',
      'Cash',
      'MoMo',
      'Card',
      'At table',
      'Unpaid',
      'Average order',
    ],
    ...days.map((d) => [
      d.day,
      d.orders,
      d.cancelled,
      d.items,
      d.gross,
      d.discounts,
      d.delivery,
      d.net,
      d.byMethod.cash,
      d.byMethod.momo,
      d.byMethod.card,
      d.byMethod['pay-at-table'],
      d.unpaid,
      d.average,
    ]),
  ])

export const downloadCsv = (name: string, csv: string) => {
  // BOM so Excel opens accents (₵, é) correctly.
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
