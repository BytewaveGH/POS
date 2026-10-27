import { dailySeries, dailyTotals, dayKey, filterOrders, ordersCsv, toCsv, totalsOf } from '@/lib/eatery/sales'
import type { Order } from '@/lib/eatery/types'

let id = 0
const order = (over: Partial<Order> & { at: string }): Order => {
  const { at, ...rest } = over
  return {
    id: ++id,
    code: `C${id}`,
    restaurantId: 1,
    createdAt: new Date(at).toISOString(),
    updatedAt: new Date(at).toISOString(),
    customer: { name: 'Guest', phone: '' },
    fulfilment: { type: 'pickup' },
    payment: { method: 'cash', status: 'paid' },
    lines: [{ itemId: 1, quantity: 2, choices: {}, name: 'Fries', summary: '', unitPrice: 25, discountPerUnit: 0, lineTotal: 50 }],
    subtotal: 50,
    discount: 0,
    deliveryFee: 0,
    total: 50,
    status: 'completed',
    history: [],
    channel: 'counter',
    ...rest,
  }
}

const orders = [
  order({ at: '2026-10-21T09:15:00' }),
  order({
    at: '2026-10-21T12:40:00',
    payment: { method: 'momo', status: 'unpaid' },
    total: 80,
    subtotal: 90,
    discount: 10,
    channel: 'online',
    fulfilment: { type: 'delivery', address: 'x' },
    deliveryFee: 0,
  }),
  order({ at: '2026-10-21T13:00:00', status: 'cancelled', total: 999 }),
  order({
    at: '2026-10-20T19:00:00',
    payment: { method: 'card', status: 'paid' },
    total: 120,
    subtotal: 120,
    fulfilment: { type: 'dine-in', table: '4' },
  }),
]

describe('sales totals', () => {
  it('counts net sales by payment, channel and type — never cancelled orders', () => {
    const t = totalsOf(orders)
    expect(t).toMatchObject({
      orders: 3,
      cancelled: 1,
      items: 6,
      gross: 260,
      discounts: 10,
      net: 250,
      average: 83.33,
      unpaid: 80,
      unpaidCount: 1,
    })
    expect(t.byMethod).toEqual({ cash: 50, momo: 80, card: 120, 'pay-at-table': 0 })
    expect(t.byChannel).toEqual({ counter: 170, online: 80 })
    expect(t.byFulfilment).toEqual({ pickup: 50, delivery: 80, 'dine-in': 120 })
  })

  it('groups by local calendar day, newest first', () => {
    const days = dailyTotals(orders)
    expect(days.map((d) => [d.day, d.orders, d.net, d.cancelled])).toEqual([
      ['2026-10-21', 2, 130, 1],
      ['2026-10-20', 1, 120, 0],
    ])
  })

  it('fills quiet days with zero for the chart', () => {
    const s = dailySeries(orders, new Date(2026, 9, 19), new Date(2026, 9, 22))
    expect(s.map((d) => [d.key, d.value])).toEqual([
      ['2026-10-19', 0],
      ['2026-10-20', 120],
      ['2026-10-21', 130],
    ])
  })

  it('filters by period, channel, payment, status and search', () => {
    const day = { from: new Date(2026, 9, 21), to: new Date(2026, 9, 22) }
    expect(filterOrders(orders, day).map((o) => o.code)).toEqual(['C3', 'C2', 'C1'])
    expect(filterOrders(orders, { ...day, payment: 'unpaid' }).map((o) => o.code)).toEqual(['C2'])
    expect(filterOrders(orders, { method: 'card' }).map((o) => o.code)).toEqual(['C4'])
    expect(filterOrders(orders, { status: 'cancelled' }).map((o) => o.code)).toEqual(['C3'])
    expect(filterOrders(orders, { channel: 'online' }).map((o) => o.code)).toEqual(['C2'])
    expect(filterOrders(orders, { fulfilment: 'dine-in' }).map((o) => o.code)).toEqual(['C4'])
    expect(filterOrders(orders, { query: 'c4' }).map((o) => o.code)).toEqual(['C4'])
    expect(dayKey('2026-10-21T23:30:00')).toBe('2026-10-21')
  })
})

describe('CSV export', () => {
  it('quotes commas, quotes and newlines, and defuses spreadsheet formulas', () => {
    expect(toCsv([['a,b', 'say "hi"', 'line\nbreak', '=SUM(A1)', '-12.5', 7]])).toBe('"a,b","say ""hi""","line\nbreak",\'=SUM(A1),-12.5,7')
  })

  it('exports one row per transaction with its items and payment', () => {
    const csv = ordersCsv([orders[3]]).split('\r\n')
    expect(csv[0]).toMatch(/^Date,Time,Order,Channel,Type,Table,Customer/)
    expect(csv[1]).toBe('2026-10-20,19:00,C4,Counter,Dine-in,4,Guest,,2x Fries,120,0,0,120,Card,paid,,completed')
  })
})
