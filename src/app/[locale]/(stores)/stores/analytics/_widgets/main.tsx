'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  AlertTriangle,
  Building2,
  BarChart2,
  DollarSign,
  Calendar,
  Lightbulb,
  Target,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Zap,
  Clock,
  Activity,
} from 'lucide-react'
import { AgCharts } from 'ag-charts-react'
import { AgChartOptions } from 'ag-charts-community'
import DatagridTemplate from '@/components/templates/datagrid'
import { useFetchData } from '@/hooks/use-fetch'
import { useFetchPaginated } from '@/hooks/use-fetch-paginated'
import { StatisticsServices } from '../../overview/_logics/services'
import { ProductServices, OperationsServices } from '../../products/inventory/_logics/services'
import { IGeneric } from '@/types/interfaces'
import { cn } from '@/lib/utils'

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (v: number) => `₵ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtShort = (v: number): string => {
  const n = Number(v ?? 0)
  if (n >= 1_000_000) return `₵ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₵ ${(n / 1_000).toFixed(1)}K`
  return fmt(n)
}

const trendPct = (current: number, prev: number): number | null => {
  if (prev <= 0) return null
  return ((current - prev) / prev) * 100
}

const isoDate = (d: Date) => d.toISOString().split('T')[0]

// ── Extract hour + JS day-of-week from an API hourly entry ────────────────────
// The API returns date as "YYYY-MM-DDTHH" (no minutes/seconds), which new Date()
// cannot parse. Split on T, parse the hour integer, and build the date from the
// date-only part (appended with T00:00:00 so JS treats it as local midnight).
const extractHourDay = (d: any): { hour: number | null; dayOfWeek: number | null } => {
  const raw = d.date as string
  if (!raw) return { hour: null, dayOfWeek: null }

  const tIdx = raw.indexOf('T')
  if (tIdx !== -1) {
    const datePart = raw.slice(0, tIdx) // "2026-05-29"
    const hourStr = raw.slice(tIdx + 1) // "11"
    const hour = parseInt(hourStr, 10)
    const dt = new Date(`${datePart}T00:00:00`)
    if (isNaN(dt.getTime()) || isNaN(hour)) return { hour: null, dayOfWeek: null }
    return { hour, dayOfWeek: dt.getDay() }
  }

  // Fallback: { date: "YYYY-MM-DD", hour: N } or full ISO datetime
  if (d.hour !== undefined) {
    const dt = new Date(`${raw}T00:00:00`)
    if (isNaN(dt.getTime())) return { hour: null, dayOfWeek: null }
    return { hour: Number(d.hour), dayOfWeek: dt.getDay() }
  }

  const dt = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`)
  if (isNaN(dt.getTime())) return { hour: null, dayOfWeek: null }
  return { hour: dt.getHours(), dayOfWeek: dt.getDay() }
}

// Unwrap the hourly API response — handles plain array, { data: [] }, { sales: [] }, etc.
const toHourlyArray = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw
  if (raw?.hourly && Array.isArray(raw.hourly)) return raw.hourly
  if (raw?.sales && Array.isArray(raw.sales)) return raw.sales
  if (raw?.items && Array.isArray(raw.items)) return raw.items
  if (raw?.data && Array.isArray(raw.data)) return raw.data
  return []
}

// Mon-first ordering for the heatmap (JS getDay: Sun=0, Mon=1…Sat=6)
const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HEATMAP_DAY_JS = [1, 2, 3, 4, 5, 6, 0]
// Visible hour range: 7 am → 8 pm
const HOUR_START = 7
const HOUR_END = 20
const HEATMAP_HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => i + HOUR_START)

// ── Refresh button ─────────────────────────────────────────────────────────────
const RefreshBtn = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    title="Refresh"
    className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-endeavour hover:border-endeavour transition-colors flex-shrink-0"
  >
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  </button>
)

// ── KPI card with trend indicator ─────────────────────────────────────────────
const KpiCard = ({
  label,
  value,
  sub,
  icon: Icon,
  color,
  trend,
  extra,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
  trend?: number | null
  extra?: React.ReactNode
}) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
    <div className="flex items-center justify-between">
      <p className="bytewave-paragraph text-gray-500 text-xs">{label}</p>
      <div className={cn('p-1.5 rounded-lg', color)}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
    </div>
    <p className="bytewave-heading text-xl text-stone-800 leading-tight">{value}</p>
    <div className="flex items-center gap-1.5 min-h-[16px]">
      {trend !== null && trend !== undefined && (
        <div
          className={cn(
            'flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0',
            trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
          )}
        >
          {trend >= 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
      {sub && <p className="bytewave-paragraph text-[10px] text-gray-400 truncate">{sub}</p>}
    </div>
    {extra}
  </div>
)

// ── Budget progress row ────────────────────────────────────────────────────────
const BudgetRow = ({
  label,
  actual,
  target,
  color,
  formatter = fmt,
}: {
  label: string
  actual: number
  target: number
  color: string
  formatter?: (v: number) => string
}) => {
  const pct = target > 0 ? Math.min(100, (actual / target) * 100) : 0
  const over = actual >= target && target > 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-stone-700">{label}</p>
        <p className="text-xs text-gray-500">
          <span className={cn('font-semibold', over ? 'text-green-600' : 'text-stone-700')}>{formatter(actual)}</span>
          <span className="text-gray-400"> / {formatter(target)}</span>
        </p>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', over ? 'bg-green-500' : color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400">
        {over
          ? `Target exceeded by ${formatter(actual - target)}`
          : target > 0
            ? `${formatter(target - actual)} remaining to target`
            : 'No target set'}
        {target > 0 && ` · ${pct.toFixed(0)}% complete`}
      </p>
    </div>
  )
}

// ── Smart insight item ─────────────────────────────────────────────────────────
type InsightType = 'positive' | 'negative' | 'neutral' | 'warning'

const InsightItem = ({ icon: Icon, text, type = 'neutral' }: { icon: React.ElementType; text: string; type?: InsightType }) => {
  const styles: Record<InsightType, string> = {
    positive: 'bg-green-50 text-green-700 border-green-100',
    negative: 'bg-red-50 text-red-700 border-red-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    neutral: 'bg-blue-50 text-blue-700 border-blue-100',
  }
  const iconStyles: Record<InsightType, string> = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    warning: 'text-amber-500',
    neutral: 'text-blue-500',
  }
  return (
    <div className={cn('flex items-start gap-2.5 p-3 rounded-xl border', styles[type])}>
      <Icon className={cn('h-3.5 w-3.5 flex-shrink-0 mt-0.5', iconStyles[type])} />
      <p className="text-xs leading-relaxed">{text}</p>
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────
const SectionHeader = ({
  icon: Icon,
  color,
  title,
  sub,
  action,
}: {
  icon: React.ElementType
  color: string
  title: string
  sub?: string
  action?: React.ReactNode
}) => (
  <div className="flex items-center justify-between gap-2 mb-1">
    <div className="flex items-center gap-2">
      <div className={cn('p-1.5 rounded-lg', color)}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <div>
        <p className="bytewave-paragraph font-semibold text-stone-700 leading-tight">{title}</p>
        {sub && <p className="bytewave-paragraph text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
    {action}
  </div>
)

// ── Main ───────────────────────────────────────────────────────────────────────
const Main = () => {
  // ── Global date range ──────────────────────────────────────────────────────
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return isoDate(d)
  })
  const [to, setTo] = useState(() => isoDate(new Date()))

  const dateKey = `${from}__${to}`
  const dateParams = { ...(from ? { from } : {}), ...(to ? { to } : {}) }

  // ── Previous period (same duration, ending the day before `from`) ──────────
  const prevRange = useMemo(() => {
    if (!from || !to) return null
    const ms = new Date(to).getTime() - new Date(from).getTime()
    const prevToD = new Date(new Date(from).getTime() - 86_400_000)
    const prevFromD = new Date(prevToD.getTime() - ms)
    return { from: isoDate(prevFromD), to: isoDate(prevToD) }
  }, [from, to])

  // ── Daily chart range ──────────────────────────────────────────────────────
  const thisWeekRange = () => {
    const now = new Date()
    const dow = now.getDay()
    const mon = new Date(now)
    mon.setDate(now.getDate() + (dow === 0 ? -6 : 1 - dow))
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return { from: isoDate(mon), to: isoDate(sun) }
  }
  const [chartFrom, setChartFrom] = useState(() => thisWeekRange().from)
  const [chartTo, setChartTo] = useState(() => thisWeekRange().to)

  const applyChartPreset = (preset: 'this-week' | '7d' | '14d' | '30d') => {
    const now = new Date()
    if (preset === 'this-week') {
      const r = thisWeekRange()
      setChartFrom(r.from)
      setChartTo(r.to)
    } else {
      const days = preset === '7d' ? 7 : preset === '14d' ? 14 : 30
      setChartFrom(isoDate(new Date(now.getTime() - (days - 1) * 86_400_000)))
      setChartTo(isoDate(now))
    }
  }

  // ── Quick preset for global date range ────────────────────────────────────
  const applyGlobalPreset = (preset: '7d' | '30d' | '90d' | 'this-month' | 'last-month') => {
    const now = new Date()
    if (preset === 'this-month') {
      setFrom(isoDate(new Date(now.getFullYear(), now.getMonth(), 1)))
      setTo(isoDate(now))
    } else if (preset === 'last-month') {
      setFrom(isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)))
      setTo(isoDate(new Date(now.getFullYear(), now.getMonth(), 0)))
    } else {
      const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
      setFrom(isoDate(new Date(now.getTime() - (days - 1) * 86_400_000)))
      setTo(isoDate(now))
    }
  }

  // ── Budget targets (persisted in localStorage) ─────────────────────────────
  const [dailyTarget, setDailyTarget] = useState(0)
  const [monthlyTarget, setMonthlyTarget] = useState(0)
  const [editingBudget, setEditingBudget] = useState(false)
  const [draftDaily, setDraftDaily] = useState('')
  const [draftMonthly, setDraftMonthly] = useState('')

  useEffect(() => {
    setDailyTarget(Number(localStorage.getItem('analytics-daily-target') || 0))
    setMonthlyTarget(Number(localStorage.getItem('analytics-monthly-target') || 0))
  }, [])

  const saveBudget = () => {
    const d = Number(draftDaily) || dailyTarget
    const m = Number(draftMonthly) || monthlyTarget
    setDailyTarget(d)
    setMonthlyTarget(m)
    localStorage.setItem('analytics-daily-target', String(d))
    localStorage.setItem('analytics-monthly-target', String(m))
    setEditingBudget(false)
  }

  // ── Data fetches ───────────────────────────────────────────────────────────
  const { data: overviewRaw, refetch: refetchOverview } = useFetchData(
    `analytics-ov-${dateKey}`,
    StatisticsServices.FetchAll(dateParams) as unknown as IGeneric
  )
  const { data: prevOverviewRaw } = useFetchData(
    `analytics-ov-prev-${prevRange?.from}-${prevRange?.to}`,
    StatisticsServices.FetchAll({ from: prevRange?.from, to: prevRange?.to }) as unknown as IGeneric,
    !!prevRange
  )
  const { data: dailySalesRaw, refetch: refetchDailyChart } = useFetchData(
    `analytics-daily-${chartFrom}-${chartTo}`,
    StatisticsServices.FetchSales({ granularity: 'day', from: chartFrom, to: chartTo }) as unknown as IGeneric
  )
  const { data: allSoldRaw } = useFetchData(
    `analytics-sold-${dateKey}`,
    StatisticsServices.FetchProducts({ limit: 1000, ...dateParams }) as unknown as IGeneric
  )
  const { data: chartSoldRaw } = useFetchData(
    `analytics-csold-${chartFrom}-${chartTo}`,
    StatisticsServices.FetchProducts({ limit: 1000, from: chartFrom, to: chartTo }) as unknown as IGeneric
  )
  const { data: warehousesRaw, refetch: refetchWarehouses } = useFetchData(
    `analytics-wh-${dateKey}`,
    StatisticsServices.FetchWarehouses(dateParams) as unknown as IGeneric
  )
  const { data: allProductsRaw } = useFetchData('analytics-products', ProductServices.FetchAll() as unknown as IGeneric)
  const { data: shortagesRaw } = useFetchData('analytics-shortages', StatisticsServices.FetchShortages() as unknown as IGeneric)
  const { data: operationsRaw } = useFetchData(
    `analytics-ops-${dateKey}`,
    OperationsServices.FetchAll({ limit: 1000, ...dateParams }) as unknown as IGeneric
  )
  const { data: hourlySalesRaw, refetch: refetchHourlyChart } = useFetchData(
    `analytics-hourly-${dateKey}`,
    StatisticsServices.FetchSales({ granularity: 'hour', ...dateParams }) as unknown as IGeneric
  )

  const monthlyRange = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    start.setMonth(start.getMonth() - 11)
    start.setDate(1)
    return { from: isoDate(start), to: isoDate(now) }
  }, [])
  const { data: monthlySalesRaw, refetch: refetchMonthlyChart } = useFetchData(
    `analytics-monthly-${monthlyRange.from}`,
    StatisticsServices.FetchSales({ granularity: 'month', from: monthlyRange.from, to: monthlyRange.to }) as unknown as IGeneric
  )

  const [topPage, setTopPage] = useState(0)
  const topPageSize = 8
  const {
    data: topProductsRaw,
    total: topTotal,
    refetch: refetchTop,
  } = useFetchPaginated(
    `analytics-top-${dateKey}`,
    StatisticsServices.FetchProducts({ ...dateParams }) as unknown as IGeneric,
    topPage,
    topPageSize
  )

  // ── Global refresh + auto-refresh every 10 min ────────────────────────────
  const [lastUpdated, setLastUpdated] = useState(() => new Date())

  const refreshAll = useCallback(() => {
    refetchOverview()
    refetchDailyChart()
    refetchHourlyChart()
    refetchMonthlyChart()
    refetchTop()
    refetchWarehouses()
    setLastUpdated(new Date())
  }, [refetchOverview, refetchDailyChart, refetchHourlyChart, refetchMonthlyChart, refetchTop, refetchWarehouses])

  useEffect(() => {
    const id = setInterval(refreshAll, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [refreshAll])

  // ── Raw casts ──────────────────────────────────────────────────────────────
  const overview = overviewRaw as any
  const prevOverview = prevOverviewRaw as any
  const monthlySalesArr = (monthlySalesRaw as any[]) ?? []
  const topProducts = (topProductsRaw as any[]) ?? []
  const allSold = (allSoldRaw as any[]) ?? []
  const warehouses = (warehousesRaw as any[]) ?? []
  const allProducts = (allProductsRaw as any[]) ?? []
  const shortages = (shortagesRaw as any[]) ?? []
  const operations = (operationsRaw as any[]) ?? []

  // ── Profit calculation ─────────────────────────────────────────────────────
  const purchasePriceMap = useMemo(() => {
    const map: Record<number, number> = {}
    allProducts.forEach((p: any) => {
      map[p.id] = p.purchasePrice ?? 0
    })
    return map
  }, [allProducts])

  const refRetailMap = useMemo(() => {
    const map: Record<number, number> = {}
    allProducts.forEach((p: any) => {
      const units: any[] = p.units ?? []
      const halfBox = units.find((u: any) => u.pricingRule === 'half-box' && u.boxRetailPrice > 0)
      if (halfBox) {
        map[p.id] = halfBox.boxRetailPrice
        return
      }
      const prices = units.map((u: any) => u.retailPrice ?? 0).filter(Boolean)
      if (prices.length) map[p.id] = Math.max(...prices)
    })
    return map
  }, [allProducts])

  const calcProfit = (revenue: number, productId: number) => {
    const pp = purchasePriceMap[productId] ?? 0
    const rr = refRetailMap[productId]
    if (!rr || rr <= 0 || pp <= 0) return 0
    return revenue * Math.max(0, 1 - pp / rr)
  }

  const totalProfit = useMemo(
    () => allSold.reduce((s: number, p: any) => s + calcProfit(p.revenue ?? 0, p.productId), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allSold, purchasePriceMap, refRetailMap]
  )

  const totalOperations = useMemo(() => operations.reduce((s: number, op: any) => s + (op.amount ?? 0), 0), [operations])

  const netProfit = Math.max(0, totalProfit - totalOperations)

  const overallMarginRatio = useMemo(() => {
    const sold = (chartSoldRaw as any[]) ?? []
    const cRev = sold.reduce((s: number, p: any) => s + (p.revenue ?? 0), 0)
    const cProf = sold.reduce((s: number, p: any) => s + calcProfit(p.revenue ?? 0, p.productId), 0)
    if (cRev > 0) return Math.max(0, cProf / cRev)
    const tRev = allSold.reduce((s: number, p: any) => s + (p.revenue ?? 0), 0)
    return tRev > 0 ? Math.max(0, totalProfit / tRev) : 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartSoldRaw, allSold, totalProfit, purchasePriceMap, refRetailMap])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalRevenue = overview?.revenue?.total ?? 0
  const prevRevenue = prevOverview?.revenue?.total ?? 0
  const totalSales = overview?.sales?.total ?? 0
  const prevSales = prevOverview?.sales?.total ?? 0
  const avgSaleValue = overview?.revenue?.average ?? 0
  const prevAvgSale = prevOverview?.revenue?.average ?? 0
  const momoRevenue = overview?.revenue?.momo ?? 0
  const cashRevenue = overview?.revenue?.cash ?? 0
  const lowStockCount = overview?.inventory?.lowStockProducts ?? 0
  const profitMarginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  // ── Daily chart data ───────────────────────────────────────────────────────
  const dailySalesWithProfit = useMemo(() => {
    const entries = (dailySalesRaw as any[]) ?? []
    return entries.map((d: any) => {
      const [y, m, dy] = (d.date as string).split('-').map(Number)
      const label = new Date(y, m - 1, dy).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
      const revenue = d.revenue ?? 0
      return { day: label, date: d.date, revenue, count: d.count ?? 0, profit: Number((revenue * overallMarginRatio).toFixed(2)) }
    })
  }, [dailySalesRaw, overallMarginRatio])

  // Today's revenue (looked up from raw daily data)
  const todayRevenue = useMemo(() => {
    const today = isoDate(new Date())
    const raw = (dailySalesRaw as any[]) ?? []
    return raw.find((d: any) => d.date === today)?.revenue ?? 0
  }, [dailySalesRaw])

  // ── Monthly chart data ─────────────────────────────────────────────────────
  const monthlySalesWithProfit = useMemo(
    () =>
      monthlySalesArr.map((d: any) => ({
        ...d,
        profit: Number(((d.revenue ?? 0) * overallMarginRatio).toFixed(2)),
      })),
    [monthlySalesArr, overallMarginRatio]
  )

  // Current month revenue + profit for budget tracker
  const currentMonthKey = new Date().toISOString().slice(0, 7)
  const currentMonthRevenue = useMemo(
    () => monthlySalesArr.find((d: any) => (d.date as string)?.startsWith(currentMonthKey))?.revenue ?? 0,
    [monthlySalesArr, currentMonthKey]
  )
  const currentMonthProfit = currentMonthRevenue * overallMarginRatio

  // ── Top products with contribution % ──────────────────────────────────────
  const totalSoldRevenue = allSold.reduce((s: number, p: any) => s + (p.revenue ?? 0), 0)
  const topProductsEnriched = useMemo(
    () =>
      topProducts.map((p: any) => ({
        ...p,
        profit: calcProfit(p.revenue ?? 0, p.productId),
        share: totalSoldRevenue > 0 ? Number((((p.revenue ?? 0) / totalSoldRevenue) * 100).toFixed(1)) : 0,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topProducts, totalSoldRevenue, purchasePriceMap, refRetailMap]
  )

  // ── Chart options ──────────────────────────────────────────────────────────
  const dailyChartOptions: AgChartOptions = useMemo(
    () => ({
      data: dailySalesWithProfit,
      series: [
        { type: 'line' as const, xKey: 'day', yKey: 'revenue', yName: 'Revenue (₵)', stroke: '#0865AC', strokeWidth: 2 },
        { type: 'line' as const, xKey: 'day', yKey: 'profit', yName: 'Profit (₵)', stroke: '#f97316', strokeWidth: 2 },
        { type: 'line' as const, xKey: 'day', yKey: 'count', yName: 'Sales', stroke: '#94a3b8', strokeWidth: 1.5 },
      ],
      axes: [
        { type: 'category' as const, position: 'bottom' as const },
        { type: 'number' as const, position: 'left' as const, keys: ['revenue', 'profit'], min: 0, tick: { count: 5 } } as any,
        { type: 'number' as const, position: 'right' as const, keys: ['count'], min: 0, tick: { count: 5 } } as any,
      ],
      background: { fill: 'transparent' },
    }),
    [dailySalesWithProfit]
  )

  const monthlyChartOptions: AgChartOptions = useMemo(
    () => ({
      data: monthlySalesWithProfit,
      series: [
        { type: 'bar' as const, xKey: 'date', yKey: 'revenue', yName: 'Revenue (₵)', fill: '#0865AC' },
        { type: 'bar' as const, xKey: 'date', yKey: 'profit', yName: 'Profit (₵)', fill: '#f97316' },
        { type: 'bar' as const, xKey: 'date', yKey: 'count', yName: 'Sales', fill: '#94a3b8' },
      ],
      axes: [
        { type: 'category' as const, position: 'bottom' as const },
        { type: 'number' as const, position: 'left' as const, keys: ['revenue', 'profit'], min: 0, tick: { count: 5 } } as any,
        { type: 'number' as const, position: 'right' as const, keys: ['count'], min: 0, tick: { count: 5 } } as any,
      ],
      background: { fill: 'transparent' },
    }),
    [monthlySalesWithProfit]
  )

  const paymentSplitOptions: AgChartOptions = useMemo(
    () => ({
      data: [
        { type: 'MoMo', value: momoRevenue },
        { type: 'Cash', value: cashRevenue },
      ],
      series: [
        {
          type: 'pie' as const,
          calloutLabelKey: 'type',
          angleKey: 'value',
          innerRadiusRatio: 0.65,
          fills: ['#0865AC', '#10b981'],
          strokes: ['#ffffff', '#ffffff'],
          strokeWidth: 2,
        } as any,
      ],
      background: { fill: 'transparent' },
      legend: { enabled: false },
    }),
    [momoRevenue, cashRevenue]
  )

  // ── Hourly aggregation (summed across all days in the date range) ────────────
  const hourlySalesData = useMemo(() => {
    const raw = toHourlyArray(hourlySalesRaw)
    const byHour: Record<number, { revenue: number; sales: number }> = {}
    raw.forEach((d: any) => {
      const { hour } = extractHourDay(d)
      if (hour === null) return
      if (!byHour[hour]) byHour[hour] = { revenue: 0, sales: 0 }
      byHour[hour].revenue += d.revenue ?? d.totalRevenue ?? d.total ?? d.amount ?? 0
      byHour[hour].sales += d.count ?? d.salesCount ?? d.orders ?? d.totalOrders ?? 0
    })
    return HEATMAP_HOURS.map((h) => ({
      hour: h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`,
      revenue: byHour[h]?.revenue ?? 0,
      sales: byHour[h]?.sales ?? 0,
    }))
  }, [hourlySalesRaw])

  // ── Heatmap grid [dayOfWeek 0-6][hour 0-23] = cumulative revenue ──────────
  const heatmapGrid = useMemo(() => {
    const raw = toHourlyArray(hourlySalesRaw)
    const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))
    raw.forEach((d: any) => {
      const { hour, dayOfWeek } = extractHourDay(d)
      if (hour === null || dayOfWeek === null) return
      grid[dayOfWeek][hour] += d.revenue ?? d.totalRevenue ?? d.total ?? d.amount ?? 0
    })
    return grid
  }, [hourlySalesRaw])

  const heatmapMax = useMemo(() => Math.max(1, ...heatmapGrid.flat()), [heatmapGrid])

  // ── Hourly bar chart ──────────────────────────────────────────────────────
  const hourlyChartOptions: AgChartOptions = useMemo(
    () => ({
      data: hourlySalesData,
      series: [{ type: 'bar' as const, xKey: 'hour', yKey: 'revenue', yName: 'Revenue (₵)', fill: '#0865AC' }],
      axes: [
        { type: 'category' as const, position: 'bottom' as const } as any,
        { type: 'number' as const, position: 'left' as const, min: 0, tick: { count: 4 } } as any,
      ],
      background: { fill: 'transparent' },
    }),
    [hourlySalesData]
  )

  // ── Peak hour (for the insights insight) ─────────────────────────────────
  const peakHour = useMemo(() => {
    const peak = hourlySalesData.reduce((best, d) => (d.revenue > best.revenue ? d : best), hourlySalesData[0])
    return peak?.revenue > 0 ? peak : null
  }, [hourlySalesData])

  // ── AG Grid column defs ────────────────────────────────────────────────────
  const topProductCols = useMemo(
    () => [
      { field: 'productName', headerName: 'Product', flex: 1, minWidth: 140 },
      { field: 'quantitySold', headerName: 'Qty', width: 70 },
      { field: 'revenue', headerName: 'Revenue', width: 120, valueFormatter: (p: any) => fmt(p.value) },
      {
        field: 'profit',
        headerName: 'Profit',
        width: 110,
        valueFormatter: (p: any) => fmt(p.value),
        cellStyle: (p: any) => ({ color: (p.value ?? 0) >= 0 ? '#16a34a' : '#dc2626' }),
      },
      {
        field: 'share',
        headerName: 'Share',
        width: 80,
        valueFormatter: (p: any) => `${p.value}%`,
        cellStyle: () => ({ color: '#6b7280' }),
      },
    ],
    []
  )

  // ── Auto-generated smart insights ─────────────────────────────────────────
  const insights = useMemo(() => {
    const list: { icon: React.ElementType; text: string; type: InsightType }[] = []

    const revTrend = trendPct(totalRevenue, prevRevenue)
    if (revTrend !== null) {
      list.push({
        icon: revTrend >= 0 ? TrendingUp : TrendingDown,
        text: `Revenue is ${revTrend >= 0 ? 'up' : 'down'} ${Math.abs(revTrend).toFixed(1)}% compared to the previous period.`,
        type: revTrend >= 0 ? 'positive' : 'negative',
      })
    }

    const salesTrend = trendPct(totalSales, prevSales)
    if (salesTrend !== null && Math.abs(salesTrend) > 3) {
      list.push({
        icon: ShoppingCart,
        text: `Transaction count is ${salesTrend >= 0 ? 'up' : 'down'} ${Math.abs(salesTrend).toFixed(1)}% vs the previous period.`,
        type: salesTrend >= 0 ? 'positive' : 'negative',
      })
    }

    if (profitMarginPct > 0) {
      list.push({
        icon: Percent,
        text:
          profitMarginPct < 12
            ? `Profit margin is ${profitMarginPct.toFixed(1)}% — consider reviewing pricing or purchase costs.`
            : profitMarginPct >= 30
              ? `Strong profit margin of ${profitMarginPct.toFixed(1)}% — well above average.`
              : `Healthy profit margin at ${profitMarginPct.toFixed(1)}%.`,
        type: profitMarginPct < 12 ? 'warning' : 'positive',
      })
    }

    const topP = topProducts[0]
    if (topP && totalSoldRevenue > 0) {
      const share = (((topP.revenue ?? 0) / totalSoldRevenue) * 100).toFixed(1)
      list.push({
        icon: Package,
        text: `"${topP.productName}" is your top seller, contributing ${share}% of total revenue.`,
        type: 'neutral',
      })
    }

    const totalWhRev = warehouses.reduce((s: number, w: any) => s + (w.revenue ?? 0), 0)
    const topWh = warehouses.reduce((best: any, w: any) => (!best || (w.revenue ?? 0) > (best.revenue ?? 0) ? w : best), null as any)
    if (topWh && totalWhRev > 0) {
      const share = (((topWh.revenue ?? 0) / totalWhRev) * 100).toFixed(1)
      list.push({
        icon: Building2,
        text: `"${topWh.name}" leads warehouse performance at ${fmtShort(topWh.revenue ?? 0)} (${share}% of warehouse revenue).`,
        type: 'neutral',
      })
    }

    if (totalRevenue > 0) {
      const momoShare = ((momoRevenue / totalRevenue) * 100).toFixed(0)
      list.push({
        icon: Wallet,
        text: `${momoShare}% of revenue comes via MoMo, ${(100 - Number(momoShare)).toFixed(0)}% via cash payments.`,
        type: 'neutral',
      })
    }

    if (dailySalesWithProfit.length > 0) {
      const peak = dailySalesWithProfit.reduce((best, d) => (d.revenue > best.revenue ? d : best), dailySalesWithProfit[0])
      if (peak.revenue > 0) {
        list.push({
          icon: Zap,
          text: `Peak day in this chart period: ${peak.day} with ${fmtShort(peak.revenue)} revenue.`,
          type: 'positive',
        })
      }
    }

    if (peakHour) {
      list.push({
        icon: Clock,
        text: `Busiest hour of the day is ${peakHour.hour} with ${fmtShort(peakHour.revenue)} in revenue across the period.`,
        type: 'neutral',
      })
    }

    if (shortages.length > 0) {
      list.push({
        icon: AlertTriangle,
        text: `${shortages.length} product${shortages.length > 1 ? 's are' : ' is'} critically low on stock and need restocking soon.`,
        type: 'warning',
      })
    }

    if (lowStockCount > 0) {
      list.push({
        icon: AlertTriangle,
        text: `${lowStockCount} product${lowStockCount > 1 ? 's are' : ' is'} below the minimum stock threshold.`,
        type: lowStockCount > 5 ? 'negative' : 'warning',
      })
    }

    const avgTrend = trendPct(avgSaleValue, prevAvgSale)
    if (avgTrend !== null && Math.abs(avgTrend) > 5) {
      list.push({
        icon: DollarSign,
        text: `Average transaction value is ${avgTrend >= 0 ? 'up' : 'down'} ${Math.abs(avgTrend).toFixed(1)}% — ${avgTrend >= 0 ? 'customers are spending more per visit' : 'smaller basket sizes than last period'}.`,
        type: avgTrend >= 0 ? 'positive' : 'warning',
      })
    }

    return list
  }, [
    totalRevenue,
    prevRevenue,
    totalSales,
    prevSales,
    profitMarginPct,
    topProducts,
    totalSoldRevenue,
    warehouses,
    momoRevenue,
    dailySalesWithProfit,
    shortages,
    lowStockCount,
    avgSaleValue,
    prevAvgSale,
  ])

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <main className="w-full flex flex-col gap-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="bytewave-heading">Analytics</h1>
            <p className="bytewave-paragraph text-gray-500">Deep insights into your store performance</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 self-start">
            <span className="text-xs text-gray-400 hidden sm:inline">
              Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={refreshAll}
              title="Refresh all data"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-endeavour hover:border-endeavour transition-colors text-xs font-medium"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Global date filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500 font-medium flex-shrink-0">Date range</span>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 bytewave-paragraph text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-endeavour"
              />
              <span className="text-gray-400 text-xs flex-shrink-0">→</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 bytewave-paragraph text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-endeavour"
              />
            </div>
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {(
              [
                { key: '7d', label: '7D' },
                { key: '30d', label: '30D' },
                { key: '90d', label: '90D' },
                { key: 'this-month', label: 'This Month' },
                { key: 'last-month', label: 'Last Month' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => applyGlobalPreset(opt.key)}
                className="flex-1 py-1.5 bytewave-paragraph transition-colors whitespace-nowrap bg-white text-gray-500 hover:bg-gray-50 hover:text-endeavour border-l border-gray-200 first:border-l-0 text-center"
              >
                {opt.label}
              </button>
            ))}
          </div>
          {prevRange && (
            <p className="text-[10px] text-gray-400">
              Comparing against: {prevRange.from} → {prevRange.to}
            </p>
          )}
        </div>
      </header>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard
          label="Total Revenue"
          value={fmtShort(totalRevenue)}
          sub="vs prior period"
          icon={TrendingUp}
          color="bg-endeavour"
          trend={trendPct(totalRevenue, prevRevenue)}
        />
        <KpiCard
          label="Gross Profit"
          value={fmtShort(totalProfit)}
          sub={`${profitMarginPct.toFixed(1)}% margin`}
          icon={DollarSign}
          color="bg-emerald-500"
          trend={trendPct(totalProfit, prevRevenue * overallMarginRatio)}
        />
        <KpiCard
          label="Net Profit"
          value={fmtShort(netProfit)}
          sub={`after ${fmtShort(totalOperations)} expenses`}
          icon={Wallet}
          color="bg-teal-500"
          trend={null}
        />
        <KpiCard
          label="Total Sales"
          value={totalSales.toLocaleString()}
          sub="transactions"
          icon={ShoppingCart}
          color="bg-blue-500"
          trend={trendPct(totalSales, prevSales)}
        />
        <KpiCard
          label="Avg Sale Value"
          value={fmtShort(avgSaleValue)}
          sub="per transaction"
          icon={BarChart2}
          color="bg-purple-500"
          trend={trendPct(avgSaleValue, prevAvgSale)}
        />
        <KpiCard
          label="Profit Margin"
          value={`${profitMarginPct.toFixed(1)}%`}
          sub="gross margin"
          icon={Percent}
          color={profitMarginPct >= 20 ? 'bg-green-500' : profitMarginPct >= 10 ? 'bg-amber-500' : 'bg-red-500'}
          trend={null}
        />
        <KpiCard
          label="Low Stock Items"
          value={lowStockCount}
          sub={`${shortages.length} critical`}
          icon={AlertTriangle}
          color={lowStockCount > 5 ? 'bg-red-500' : lowStockCount > 0 ? 'bg-amber-500' : 'bg-gray-400'}
          trend={null}
        />
      </section>

      {/* ── Revenue Trend + Payment Split ──────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col gap-2.5 mb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="bytewave-paragraph font-semibold text-stone-700">Revenue Trend</p>
                <p className="bytewave-paragraph text-xs text-gray-400">Daily revenue · profit · sales count</p>
              </div>
              <RefreshBtn onClick={() => refetchDailyChart()} />
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={chartFrom}
                onChange={(e) => setChartFrom(e.target.value)}
                className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 bytewave-paragraph text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-endeavour"
              />
              <span className="text-gray-400 text-xs flex-shrink-0">→</span>
              <input
                type="date"
                value={chartTo}
                onChange={(e) => setChartTo(e.target.value)}
                className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 bytewave-paragraph text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-endeavour"
              />
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {(
                [
                  { key: 'this-week', label: 'This Week' },
                  { key: '7d', label: '7 Days' },
                  { key: '14d', label: '14 Days' },
                  { key: '30d', label: '30 Days' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => applyChartPreset(opt.key)}
                  className="flex-1 py-1.5 bytewave-paragraph transition-colors whitespace-nowrap bg-white text-gray-500 hover:bg-gray-50 hover:text-endeavour border-l border-gray-200 first:border-l-0 text-center"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <AgCharts options={dailyChartOptions} style={{ height: '260px' }} />
        </div>

        {/* Hourly sales distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-3">
            <SectionHeader icon={Clock} color="bg-blue-500" title="Hourly Sales" sub="Revenue by hour of day" />
            <RefreshBtn onClick={() => refetchHourlyChart()} />
          </div>
          <AgCharts options={hourlyChartOptions} style={{ height: '220px' }} />
          {peakHour && (
            <div className="mt-3 flex items-center gap-2 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
              <Zap className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Peak at <span className="font-semibold">{peakHour.hour}</span> — {fmtShort(peakHour.revenue)} revenue
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Monthly Performance ─────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="bytewave-paragraph font-semibold text-stone-700">Monthly Performance</p>
            <p className="bytewave-paragraph text-xs text-gray-400">Revenue · Profit · Sales count — last 12 months</p>
          </div>
          <RefreshBtn onClick={() => refetchMonthlyChart()} />
        </div>
        <AgCharts options={monthlyChartOptions} style={{ height: '280px' }} />
      </section>

      {/* ── Revenue Heatmap ─────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-2 mb-4">
          <SectionHeader icon={Activity} color="bg-rose-500" title="Revenue Heatmap" sub="Day of week × hour — darker = higher revenue" />
          <RefreshBtn onClick={() => refetchHourlyChart()} />
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: '580px' }}>
            {/* Hour labels row */}
            <div className="flex items-center mb-1" style={{ paddingLeft: '36px' }}>
              {HEATMAP_HOURS.map((h) => (
                <div key={h} className="flex-1 text-center" style={{ fontSize: '9px', color: '#9ca3af' }}>
                  {h % 2 === 1 ? (h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`) : ''}
                </div>
              ))}
            </div>

            {/* Day rows */}
            {HEATMAP_DAYS.map((day, rowIdx) => {
              const jsDay = HEATMAP_DAY_JS[rowIdx]
              return (
                <div key={day} className="flex items-center gap-0 mb-0.5">
                  {/* Day label */}
                  <div className="text-[10px] text-gray-400 font-medium flex-shrink-0 text-right pr-2" style={{ width: '36px' }}>
                    {day}
                  </div>
                  {/* 7am–8pm cells */}
                  {HEATMAP_HOURS.map((h) => {
                    const value = heatmapGrid[jsDay][h]
                    const intensity = value / heatmapMax
                    const bg = intensity < 0.01 ? 'rgba(243,244,246,1)' : `rgba(8,101,172,${(0.12 + intensity * 0.88).toFixed(2)})`
                    const label = h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
                    return (
                      <div
                        key={h}
                        className="flex-1 rounded-sm transition-colors cursor-default"
                        style={{ height: '22px', backgroundColor: bg }}
                        title={value > 0 ? `${day} ${label} — ${fmt(value)}` : `${day} ${label} — no sales`}
                      />
                    )
                  })}
                </div>
              )
            })}

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3" style={{ paddingLeft: '36px' }}>
              <span className="text-[10px] text-gray-400">No sales</span>
              <div
                className="flex-1 h-2 rounded-full"
                style={{ background: 'linear-gradient(to right, rgba(243,244,246,1), rgba(8,101,172,0.2), rgba(8,101,172,1))' }}
              />
              <span className="text-[10px] text-gray-400">Peak {fmtShort(heatmapMax)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Top Products + Smart Insights ──────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top products */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-endeavour" />
              <p className="bytewave-paragraph font-semibold text-stone-700">Top Products</p>
              {topTotal > 0 && (
                <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{topTotal} total</span>
              )}
            </div>
            <RefreshBtn onClick={() => refetchTop()} />
          </div>
          <div className="overflow-x-auto flex-1">
            <DatagridTemplate
              columns={topProductCols}
              data={topProductsEnriched}
              enablePagination={false}
              paginationPageSize={topPageSize}
              selectionType="singleRow"
              containerHeight={310}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
            <span>
              {topTotal > 0
                ? `${topPage * topPageSize + 1}–${Math.min((topPage + 1) * topPageSize, topTotal)} of ${topTotal}`
                : 'No records'}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={topPage === 0}
                onClick={() => setTopPage((p) => p - 1)}
                className="px-1.5 py-0.5 rounded border border-gray-200 disabled:opacity-30 hover:border-endeavour transition-colors"
              >
                ‹
              </button>
              <span className="font-medium text-stone-600">
                {topPage + 1}/{Math.max(1, Math.ceil(topTotal / topPageSize))}
              </span>
              <button
                disabled={topPage >= Math.ceil(topTotal / topPageSize) - 1}
                onClick={() => setTopPage((p) => p + 1)}
                className="px-1.5 py-0.5 rounded border border-gray-200 disabled:opacity-30 hover:border-endeavour transition-colors"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Smart insights */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <SectionHeader icon={Lightbulb} color="bg-amber-500" title="Smart Insights" sub="Auto-generated from your data" />
            <RefreshBtn onClick={() => refetchOverview()} />
          </div>
          {insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
              <Lightbulb className="h-8 w-8 opacity-30" />
              <p className="text-xs text-center">Insights appear once data is loaded.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '360px' }}>
              {insights.map((ins, i) => (
                <InsightItem key={i} icon={ins.icon} text={ins.text} type={ins.type} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Budget Tracker + Warehouse Revenue ─────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Budget tracker */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <SectionHeader icon={Target} color="bg-endeavour" title="Budget Tracker" sub="Revenue & profit vs targets" />
            <button
              onClick={() => {
                setDraftDaily(String(dailyTarget || ''))
                setDraftMonthly(String(monthlyTarget || ''))
                setEditingBudget(!editingBudget)
              }}
              className="text-xs text-gray-400 hover:text-endeavour transition-colors border border-gray-200 hover:border-endeavour rounded-lg px-2.5 py-1 flex-shrink-0"
            >
              {editingBudget ? 'Cancel' : 'Set targets'}
            </button>
          </div>

          {editingBudget ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600">Daily Revenue Target (₵)</label>
                <input
                  type="number"
                  value={draftDaily}
                  onChange={(e) => setDraftDaily(e.target.value)}
                  placeholder="e.g. 1000"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-1 focus:ring-endeavour"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600">Monthly Revenue Target (₵)</label>
                <input
                  type="number"
                  value={draftMonthly}
                  onChange={(e) => setDraftMonthly(e.target.value)}
                  placeholder="e.g. 30000"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-1 focus:ring-endeavour"
                />
              </div>
              <button
                onClick={saveBudget}
                className="w-full py-2.5 bg-endeavour text-white rounded-xl text-sm font-semibold hover:bg-veniceBlue transition-colors"
              >
                Save Targets
              </button>
            </div>
          ) : dailyTarget === 0 && monthlyTarget === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
              <Target className="h-8 w-8 opacity-30" />
              <p className="text-sm font-medium">No targets set</p>
              <p className="text-xs text-center text-gray-300">Click "Set targets" above to define your daily and monthly revenue goals</p>
              <button
                onClick={() => setEditingBudget(true)}
                className="mt-1 text-xs text-endeavour border border-endeavour/30 hover:border-endeavour rounded-lg px-3 py-1.5 transition-colors"
              >
                Set targets now
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {dailyTarget > 0 && <BudgetRow label="Today's Revenue" actual={todayRevenue} target={dailyTarget} color="bg-endeavour" />}
              {monthlyTarget > 0 && (
                <>
                  <BudgetRow label="This Month's Revenue" actual={currentMonthRevenue} target={monthlyTarget} color="bg-blue-500" />
                  <BudgetRow
                    label="This Month's Profit (est.)"
                    actual={currentMonthProfit}
                    target={monthlyTarget * 0.25}
                    color="bg-emerald-500"
                  />
                </>
              )}
              <div className="pt-2 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Period Revenue</p>
                    <p className="text-base font-bold text-stone-800">{fmtShort(totalRevenue)}</p>
                    <p className="text-[10px] text-gray-400">Selected date range</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Period Profit</p>
                    <p className="text-base font-bold text-stone-800">{fmtShort(totalProfit)}</p>
                    <p className="text-[10px] text-gray-400">{profitMarginPct.toFixed(1)}% margin</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Warehouse revenue breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <SectionHeader icon={Building2} color="bg-purple-500" title="Warehouse Revenue" sub="Contribution per location" />
            <RefreshBtn onClick={() => refetchWarehouses()} />
          </div>
          {warehouses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
              <Building2 className="h-8 w-8 opacity-30" />
              <p className="text-xs text-center">No warehouse data for this period.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {(() => {
                const totalWhRev = warehouses.reduce((s: number, w: any) => s + (w.revenue ?? 0), 0)
                return warehouses.slice(0, 7).map((w: any, i: number) => {
                  const pct = totalWhRev > 0 ? ((w.revenue ?? 0) / totalWhRev) * 100 : 0
                  const barColors = [
                    'bg-purple-500',
                    'bg-endeavour',
                    'bg-emerald-500',
                    'bg-amber-500',
                    'bg-rose-500',
                    'bg-cyan-500',
                    'bg-indigo-500',
                  ]
                  return (
                    <div key={w.name ?? i} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-stone-700 truncate max-w-[55%]">{w.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-gray-400">{pct.toFixed(0)}%</span>
                          <span className="font-semibold text-stone-700">{fmtShort(w.revenue ?? 0)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700', barColors[i % barColors.length])}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              })()}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                <span className="text-gray-500 font-medium">Total</span>
                <span className="font-bold text-stone-800">
                  {fmtShort(warehouses.reduce((s: number, w: any) => s + (w.revenue ?? 0), 0))}
                </span>
              </div>
              {/* Extra stats row */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Locations</p>
                  <p className="text-lg font-bold text-stone-800 mt-0.5">{warehouses.length}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Avg Rev</p>
                  <p className="text-lg font-bold text-stone-800 mt-0.5">
                    {fmtShort(
                      warehouses.length > 0 ? warehouses.reduce((s: number, w: any) => s + (w.revenue ?? 0), 0) / warehouses.length : 0
                    )}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Total Stock</p>
                  <p className="text-lg font-bold text-stone-800 mt-0.5">
                    {warehouses.reduce((s: number, w: any) => s + (w.totalStock ?? 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default Main
