// When the business is busy and when it's quiet: daily trend, weekday × hour
// grid, averages by weekday and hour, highs, lows and period change. Pure, so
// the charts and the insight sentences agree and can be tested.

import type { Order, WeeklyHours } from './types'
import { dayKey } from './sales'
import { toMinutes } from './menu'

export type Metric = 'sales' | 'orders'

const round2 = (n: number) => Math.round(n * 100) / 100
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
// Display order: the week starts on Monday.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
export const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`
export const hourRange = (h: number) => `${hourLabel(h)}–${hourLabel((h + 1) % 24)}`

// Hours the restaurant is open on each weekday, from its opening hours
// (overnight periods spill into the next day's early hours).
export const openHours = (hours: WeeklyHours): Set<number>[] => {
  const out = Array.from({ length: 7 }, () => new Set<number>())
  for (let d = 0; d < 7; d++) {
    for (const p of hours[d] ?? []) {
      const from = toMinutes(p.open)
      let to = toMinutes(p.close)
      if (to <= from) to += 24 * 60
      for (let m = Math.floor(from / 60) * 60; m < to; m += 60) {
        const h = Math.floor(m / 60)
        out[(d + Math.floor(h / 24)) % 7].add(h % 24)
      }
    }
  }
  return out
}

export interface DayPoint {
  key: string
  date: Date
  value: number
  orders: number
  sales: number
  // Trailing 7-day average of `value` (fewer days at the start of the range).
  avg7: number
  open: boolean
}

export interface Patterns {
  metric: Metric
  days: DayPoint[]
  // [weekday][hour] → average per occurrence of that weekday in the period
  heat: number[][]
  heatMax: number
  // Average per occurrence of each weekday (index 0 = Sunday)
  byWeekday: number[]
  // Average per day in the period, for each hour
  byHour: number[]
  total: number
  previousTotal: number
  // null when there's nothing to compare with
  change: number | null
  dailyAverage: number
  best?: DayPoint
  worst?: DayPoint
  bestWeekday?: number
  slowWeekday?: number
  peakHour?: number
  quietHour?: number
  insights: string[]
}

const valueOf = (o: Order, metric: Metric) => (metric === 'sales' ? o.total : 1)

export const salesPatterns = (
  orders: Order[],
  from: Date,
  to: Date,
  hours: WeeklyHours,
  metric: Metric,
  money: (n: number) => string
): Patterns => {
  const live = orders.filter((o) => o.status !== 'cancelled')
  const inRange = (o: Order, a: Date, b: Date) => {
    const t = new Date(o.createdAt).getTime()
    return t >= a.getTime() && t < b.getTime()
  }
  const current = live.filter((o) => inRange(o, from, to))
  const span = to.getTime() - from.getTime()
  const previous = live.filter((o) => inRange(o, new Date(from.getTime() - span), from))
  const open = openHours(hours)
  const fmt = (n: number) => (metric === 'sales' ? money(Math.round(n)) : `${Math.round(n * 10) / 10} orders`)

  // ── Days ──
  const perDay = new Map<string, { value: number; orders: number; sales: number }>()
  for (const o of current) {
    const k = dayKey(o.createdAt)
    const r = perDay.get(k) ?? { value: 0, orders: 0, sales: 0 }
    r.value += valueOf(o, metric)
    r.orders += 1
    r.sales += o.total
    perDay.set(k, r)
  }
  const days: DayPoint[] = []
  for (
    let d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    d < to && days.length < 400;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  ) {
    const k = dayKey(d)
    const r = perDay.get(k)
    days.push({
      key: k,
      date: d,
      value: round2(r?.value ?? 0),
      orders: r?.orders ?? 0,
      sales: round2(r?.sales ?? 0),
      avg7: 0,
      open: open[d.getDay()].size > 0 || !!r,
    })
  }
  days.forEach((p, i) => {
    const win = days.slice(Math.max(0, i - 6), i + 1)
    p.avg7 = round2(win.reduce((s, x) => s + x.value, 0) / win.length)
  })

  // ── Weekday × hour ──
  const occurrences = Array(7).fill(0) as number[]
  days.forEach((p) => occurrences[p.date.getDay()]++)
  const heatTotals = Array.from({ length: 7 }, () => Array(24).fill(0) as number[])
  for (const o of current) {
    const t = new Date(o.createdAt)
    heatTotals[t.getDay()][t.getHours()] += valueOf(o, metric)
  }
  const heat = heatTotals.map((row, d) => row.map((v) => (occurrences[d] ? round2(v / occurrences[d]) : 0)))
  const heatMax = Math.max(0, ...heat.flat())
  const byWeekday = heatTotals.map((row, d) => (occurrences[d] ? round2(row.reduce((s, v) => s + v, 0) / occurrences[d]) : 0))
  const byHour = Array.from({ length: 24 }, (_, h) => round2(heatTotals.reduce((s, row) => s + row[h], 0) / Math.max(1, days.length)))

  // ── Highs & lows ──
  const total = round2(days.reduce((s, p) => s + p.value, 0))
  const previousTotal = round2(previous.reduce((s, o) => s + valueOf(o, metric), 0))
  const openDays = days.filter((p) => p.open)
  const dailyAverage = openDays.length ? round2(total / openDays.length) : 0
  const withSales = days.filter((p) => p.value > 0)
  const best = withSales.length ? withSales.reduce((a, b) => (b.value > a.value ? b : a)) : undefined
  // Slowest *open* day (a closed Monday isn't a low).
  const worst = withSales.length > 1 ? openDays.reduce((a, b) => (b.value < a.value ? b : a)) : undefined
  const weekdaysSeen = WEEK_ORDER.filter((d) => occurrences[d] > 0 && (open[d].size > 0 || byWeekday[d] > 0))
  const bestWeekday = total > 0 ? weekdaysSeen.reduce((a, b) => (byWeekday[b] > byWeekday[a] ? b : a), weekdaysSeen[0]) : undefined
  const slowWeekday =
    total > 0 && weekdaysSeen.length > 1 ? weekdaysSeen.reduce((a, b) => (byWeekday[b] < byWeekday[a] ? b : a), weekdaysSeen[0]) : undefined
  const openAny = new Set(open.flatMap((s) => Array.from(s)))
  const hoursSeen = Array.from({ length: 24 }, (_, h) => h).filter((h) => openAny.has(h) || byHour[h] > 0)
  const peakHour = total > 0 ? hoursSeen.reduce((a, b) => (byHour[b] > byHour[a] ? b : a), hoursSeen[0]) : undefined
  const quietHour =
    total > 0 && hoursSeen.length > 1 ? hoursSeen.reduce((a, b) => (byHour[b] < byHour[a] ? b : a), hoursSeen[0]) : undefined
  const change = previousTotal > 0 ? (total - previousTotal) / previousTotal : null

  // ── Plain-language insights ──
  const insights: string[] = []
  if (change !== null && Math.abs(change) >= 0.02)
    insights.push(
      `${metric === 'sales' ? 'Sales' : 'Orders'} are ${change > 0 ? 'up' : 'down'} ${Math.abs(Math.round(change * 100))}% on the previous ${days.length} days.`
    )
  if (bestWeekday !== undefined && dailyAverage > 0) {
    const lift = byWeekday[bestWeekday] / dailyAverage - 1
    if (lift >= 0.1)
      insights.push(`${WEEKDAY_NAMES[bestWeekday]}s are your strongest day — ${Math.round(lift * 100)}% above an average day.`)
  }
  if (slowWeekday !== undefined && dailyAverage > 0 && slowWeekday !== bestWeekday) {
    const dip = 1 - byWeekday[slowWeekday] / dailyAverage
    if (dip >= 0.15) insights.push(`${WEEKDAY_NAMES[slowWeekday]}s run ${Math.round(dip * 100)}% below average — a good day for a deal.`)
  }
  if (peakHour !== undefined) {
    // The busiest two-hour stretch.
    let bestStart = 0
    for (let h = 0; h < 23; h++) if (byHour[h] + byHour[h + 1] > byHour[bestStart] + byHour[bestStart + 1]) bestStart = h
    const share = total > 0 ? ((byHour[bestStart] + byHour[bestStart + 1]) * days.length) / total : 0
    if (share > 0)
      insights.push(
        `${hourLabel(bestStart)}–${hourLabel((bestStart + 2) % 24)} brings ${Math.round(share * 100)}% of ${metric === 'sales' ? 'sales' : 'orders'} — have staff and stock ready.`
      )
  }
  if (quietHour !== undefined && openAny.has(quietHour) && byHour[quietHour] === 0)
    insights.push(`Nothing usually sells ${hourRange(quietHour)} — consider a promotion or shorter hours.`)
  if (best && worst && best.key !== worst.key)
    insights.push(
      `Best day: ${best.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} (${fmt(best.value)}). Slowest open day: ${worst.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} (${fmt(worst.value)}).`
    )

  return {
    metric,
    days,
    heat,
    heatMax,
    byWeekday,
    byHour,
    total,
    previousTotal,
    change,
    dailyAverage,
    best,
    worst,
    bestWeekday,
    slowWeekday,
    peakHour,
    quietHour,
    insights,
  }
}

// Sequential ramp (one hue, light → dark) for the heatmap; index 0 = no sales.
export const HEAT_RAMP = ['#f5f5f4', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#1c5cab', '#104281', '#0d366b']
export const heatColor = (v: number, max: number) => {
  if (!(v > 0) || !(max > 0)) return HEAT_RAMP[0]
  const step = Math.min(HEAT_RAMP.length - 1, 1 + Math.floor((v / max) * (HEAT_RAMP.length - 1) - 1e-9))
  return HEAT_RAMP[Math.max(1, step)]
}
