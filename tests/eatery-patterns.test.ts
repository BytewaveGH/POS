import { heatColor, HEAT_RAMP, openHours, salesPatterns } from '@/lib/eatery/patterns'
import { formatMoney } from '@/lib/eatery/menu'
import type { Order, WeeklyHours } from '@/lib/eatery/types'

const money = (n: number) => formatMoney(n, 'GHS')
let id = 0
const order = (at: Date, total: number, status: Order['status'] = 'completed'): Order =>
  ({
    id: ++id,
    code: `X${id}`,
    restaurantId: 1,
    createdAt: at.toISOString(),
    updatedAt: at.toISOString(),
    customer: { name: 'Guest', phone: '' },
    fulfilment: { type: 'pickup' },
    payment: { method: 'cash', status: 'paid' },
    lines: [],
    subtotal: total,
    discount: 0,
    deliveryFee: 0,
    total,
    status,
    history: [],
  }) as Order

// Open 11:00–22:00 every day except Monday.
const hours: WeeklyHours = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, d === 1 ? [] : [{ open: '11:00', close: '22:00' }]]))
// Two weeks: Sun 18 Oct … Sat 31 Oct 2026.
const from = new Date(2026, 9, 18)
const to = new Date(2026, 9, 32)
const at = (day: number, h: number) => new Date(2026, 9, day, h, 15)

const orders: Order[] = [
  // Fridays are big, mostly 12–2pm.
  order(at(23, 12), 300),
  order(at(23, 13), 300),
  order(at(30, 12), 400),
  order(at(30, 19), 100),
  // Ordinary days
  order(at(20, 12), 100),
  order(at(21, 18), 100),
  order(at(22, 12), 100),
  order(at(27, 18), 100),
  order(at(28, 13), 100),
  order(at(29, 12), 100),
  order(at(24, 14), 120),
  order(at(25, 15), 80),
  order(at(31, 16), 60),
  // Ignored
  order(at(30, 12), 999, 'cancelled'),
  // Previous two weeks, for the change
  order(new Date(2026, 9, 10, 12), 600),
  order(new Date(2026, 9, 11, 12), 400),
]

describe('sales patterns', () => {
  const p = salesPatterns(orders, from, to, hours, 'sales', money)

  it('builds one point per day with a 7-day average, ignoring cancelled orders', () => {
    expect(p.days).toHaveLength(14)
    expect(p.total).toBe(1960)
    const fri30 = p.days.find((d) => d.key === '2026-10-30')!
    expect(fri30).toMatchObject({ value: 500, orders: 2 })
    // 24–30 Oct: 120 + 80 + 0 + 0 + 100 + 100 + 100 + 500 → window of 7 = 24..30
    expect(fri30.avg7).toBe(Math.round(((120 + 80 + 0 + 100 + 100 + 100 + 500) / 7) * 100) / 100)
  })

  it('finds highs and lows, skipping days the place is closed', () => {
    expect(p.best?.key).toBe('2026-10-23')
    // Mondays are closed, so they aren't "slowest"; the slowest open day had no sales.
    expect(p.worst?.date.getDay()).not.toBe(1)
    expect(p.bestWeekday).toBe(5)
    expect(p.peakHour).toBe(12)
    expect(p.change).toBeCloseTo(0.96)
  })

  it('averages the weekday × hour grid per occurrence of each weekday', () => {
    // Two Fridays in range: 12pm totals 300 + 400 → 350 on average.
    expect(p.heat[5][12]).toBe(350)
    expect(p.byWeekday[5]).toBe(550)
    expect(p.heatMax).toBe(350)
  })

  it('says what matters in plain words', () => {
    expect(p.insights.join(' ')).toMatch(/Sales are up 96% on the previous 14 days/)
    expect(p.insights.join(' ')).toMatch(/Fridays are your strongest day/)
    expect(p.insights.join(' ')).toMatch(/12pm–2pm brings/)
  })

  it('counts orders instead of money on request', () => {
    const q = salesPatterns(orders, from, to, hours, 'orders', money)
    expect(q.total).toBe(13)
    expect(q.days.find((d) => d.key === '2026-10-30')!.value).toBe(2)
  })

  it('knows open hours, including past midnight', () => {
    const late = openHours({ 5: [{ open: '20:00', close: '02:00' }] } as WeeklyHours)
    expect(Array.from(late[5]).sort((a, b) => a - b)).toEqual([20, 21, 22, 23])
    expect(Array.from(late[6]).sort((a, b) => a - b)).toEqual([0, 1])
  })

  it('shades the heatmap lightest for nothing and darkest for the peak', () => {
    expect(heatColor(0, 100)).toBe(HEAT_RAMP[0])
    expect(heatColor(100, 100)).toBe(HEAT_RAMP[HEAT_RAMP.length - 1])
    expect(heatColor(1, 100)).toBe(HEAT_RAMP[1])
  })
})
