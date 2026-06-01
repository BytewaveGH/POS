'use client'

import React, { useMemo, useState } from 'react'
import { TrendingUp, Package, ShoppingCart, AlertTriangle, Building2, BarChart2, DollarSign, Calendar } from 'lucide-react'
import { AgCharts } from 'ag-charts-react'
import { AgChartOptions } from 'ag-charts-community'
import DatagridTemplate from '@/components/templates/datagrid'
import { useFetchData } from '@/hooks/use-fetch'
import { useFetchPaginated } from '@/hooks/use-fetch-paginated'
import { StatisticsServices } from '../_logics/services'
import { ProductServices } from '../../products/inventory/_logics/services'
import { IGeneric } from '@/types/interfaces'

const fmt = (v: number) => `₵ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const StatCard = ({
    label, value, sub, icon: Icon, color,
}: {
    label: string; value: string | number; sub?: string; icon: React.ElementType; color: string
}) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
            <p className="bytewave-paragraph text-gray-500 text-sm">{label}</p>
            <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="h-4 w-4 text-white" />
            </div>
        </div>
        <p className="bytewave-heading text-2xl text-stone-800">{value}</p>
        {sub && <p className="bytewave-paragraph text-xs text-gray-400">{sub}</p>}
    </div>
)

const Pagination = ({
    page, pageSize, total, onPage, onPageSize,
}: {
    page: number; pageSize: number; total: number
    onPage: (p: number) => void; onPageSize: (s: number) => void
}) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const from = total === 0 ? 0 : page * pageSize + 1
    const to = Math.min((page + 1) * pageSize, total)
    return (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
            <span>{total > 0 ? `${from}–${to} of ${total}` : 'No records'}</span>
            <div className="flex items-center gap-2">
                <select value={pageSize} onChange={e => { onPageSize(Number(e.target.value)); onPage(0) }}
                    className="border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-endeavour">
                    {[100, 200, 500, 1000].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button disabled={page === 0} onClick={() => onPage(page - 1)}
                    className="px-1.5 py-0.5 rounded border border-gray-200 disabled:opacity-30 hover:border-endeavour transition-colors">‹</button>
                <span className="font-medium text-stone-600">{page + 1}/{totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}
                    className="px-1.5 py-0.5 rounded border border-gray-200 disabled:opacity-30 hover:border-endeavour transition-colors">›</button>
            </div>
        </div>
    )
}

const Main = () => {
    const [from, setFrom] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 1)
        return d.toISOString().split('T')[0]   // yesterday
    })
    const [to, setTo] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() + 1)
        return d.toISOString().split('T')[0]   // 2 days after yesterday (tomorrow)
    })

    // Include from/to in query keys so React Query refetches when dates change
    const dateKey = `${from}__${to}`
    const dateParams = { ...(from ? { from } : {}), ...(to ? { to } : {}) }

    const { data: overviewRaw } = useFetchData(`stats-overview-${dateKey}`, StatisticsServices.FetchAll(dateParams) as unknown as IGeneric)
    // ── Weekly chart duration selector ──────────────────────────────────────
    const [chartDuration, setChartDuration] = useState<'this-week' | '7d' | '14d' | '30d'>('this-week')

    const weekRange = useMemo(() => {
        const iso = (d: Date) => d.toISOString().split('T')[0]
        const now = new Date()
        if (chartDuration === 'this-week') {
            const dow = now.getDay()
            const diffToMon = dow === 0 ? -6 : 1 - dow
            const mon = new Date(now); mon.setDate(now.getDate() + diffToMon)
            const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
            return { from: iso(mon), to: iso(sun) }
        }
        const days = chartDuration === '7d' ? 7 : chartDuration === '14d' ? 14 : 30
        const start = new Date(now); start.setDate(now.getDate() - (days - 1))
        return { from: iso(start), to: iso(now) }
    }, [chartDuration])

    const { data: dailySalesRaw, refetch: refetchDailyChart } = useFetchData(
        `stats-sales-week-${weekRange.from}-${weekRange.to}`,
        StatisticsServices.FetchSales({ granularity: 'day', from: weekRange.from, to: weekRange.to }) as unknown as IGeneric
    )
    // Monthly chart uses its own 12-month range — independent of the date picker
    // so the current month always appears with its accumulated data so far.
    const monthlyRange = useMemo(() => {
        const now = new Date()
        const start = new Date(now)
        start.setMonth(start.getMonth() - 11)
        start.setDate(1)
        const iso = (d: Date) => d.toISOString().split('T')[0]
        return { from: iso(start), to: iso(now) }
    }, [])

    const { data: monthlySalesRaw } = useFetchData(
        `stats-sales-month-${monthlyRange.from}`,
        StatisticsServices.FetchSales({ granularity: 'month', from: monthlyRange.from, to: monthlyRange.to }) as unknown as IGeneric,
    )
    const [topPage, setTopPage] = useState(0)
    const [topPageSize, setTopPageSize] = useState(10)

    const [whPage, setWhPage] = useState(0)
    const [whPageSize, setWhPageSize] = useState(10)

    const { data: topProductsRaw, total: topTotal } = useFetchPaginated(
        `stats-top-${dateKey}`,
        StatisticsServices.FetchProducts({ ...dateParams }) as unknown as IGeneric,
        topPage,
        topPageSize,
    )
    const { data: allSoldRaw } = useFetchData(`stats-all-sold-${dateKey}`, StatisticsServices.FetchProducts({ limit: 1000, ...dateParams }) as unknown as IGeneric)

    // Separate fetch scoped to the chart's own date range (weekRange) — used to
    // compute the correct profit margin for the daily chart, independent of the
    // date picker above.
    const { data: chartSoldRaw } = useFetchData(
        `stats-chart-sold-${weekRange.from}-${weekRange.to}`,
        StatisticsServices.FetchProducts({ limit: 1000, from: weekRange.from, to: weekRange.to }) as unknown as IGeneric,
    )
    const { data: warehousesRaw, total: whTotal } = useFetchPaginated(
        `stats-warehouses-${dateKey}`,
        StatisticsServices.FetchWarehouses(dateParams) as unknown as IGeneric,
        whPage,
        whPageSize,
    )
    const { data: allProductsRaw } = useFetchData('overview-products', ProductServices.FetchAll() as unknown as IGeneric)

    const overview = overviewRaw as any
    // Fill all 7 days Mon–Sun; days with no sales default to 0
    const dailySales = useMemo(() => {
        const entries = (dailySalesRaw as any[]) ?? []

        if (chartDuration === 'this-week') {
            const byDay: Record<string, { revenue: number; count: number }> = {}
            entries.forEach((d: any) => {
                const [y, m, dy] = (d.date as string).split('-').map(Number)
                const label = new Date(y, m - 1, dy).toLocaleDateString('en-US', { weekday: 'short' })
                byDay[label] = { revenue: d.revenue ?? 0, count: d.count ?? 0 }
            })
            return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
                day,
                revenue: byDay[day]?.revenue ?? 0,
                count:   byDay[day]?.count   ?? 0,
            }))
        }

        // Multi-day range: label as "Mon 28"
        return entries.map((d: any) => {
            const [y, m, dy] = (d.date as string).split('-').map(Number)
            const label = new Date(y, m - 1, dy).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
            return { day: label, revenue: d.revenue ?? 0, count: d.count ?? 0 }
        })
    }, [dailySalesRaw, chartDuration])
    const monthlySalesRawArr = (monthlySalesRaw as any[]) ?? []
    const topProducts = (topProductsRaw as any[]) ?? []
    const allSold = (allSoldRaw as any[]) ?? []
    const warehouses = (warehousesRaw as any[]) ?? []
    const allProducts = (allProductsRaw as any[]) ?? []

    const purchasePriceMap = useMemo(() => {
        const map: Record<number, number> = {}
        allProducts.forEach((p: any) => { map[p.id] = p.purchasePrice ?? 0 })
        return map
    }, [allProducts])

    // Reference retail price per product — the price that purchasePrice corresponds to.
    // For box+piece products: boxRetailPrice (stored on the half-box piece unit) = full box retail.
    //   profit margin = (boxRetail - purchasePrice) / boxRetail
    //   Since piece cost = purchasePrice/boxSize and piece retail = boxRetail/boxSize,
    //   the margin is IDENTICAL for both box and piece sales.
    // For single-unit products: use that unit's retail price.
    const refRetailMap = useMemo(() => {
        const map: Record<number, number> = {}
        allProducts.forEach((p: any) => {
            const units: any[] = p.units ?? []

            // A half-box piece unit stores boxRetailPrice = the full box's retail price.
            // This is the natural denominator for purchasePrice (which is per box).
            const halfBoxUnit = units.find(
                (u: any) => u.pricingRule === 'half-box' && u.boxRetailPrice > 0
            )
            if (halfBoxUnit) {
                map[p.id] = halfBoxUnit.boxRetailPrice
                return
            }

            // No box relationship: use the highest retail price unit
            // (purchasePrice is typically the cost of the bulk/highest-value unit).
            const retailPrices = units
                .map((u: any) => u.retailPrice ?? 0)
                .filter((v: number) => v > 0)
            if (retailPrices.length > 0) map[p.id] = Math.max(...retailPrices)
        })
        return map
    }, [allProducts])

    // profit = revenue × (1 − purchasePrice / refRetail)
    // Consistent for all unit types of the same product because the margin is identical
    // whether you sell the box or its individual pieces.
    const calcProfit = (revenue: number, productId: number): number => {
        const purchasePrice = purchasePriceMap[productId] ?? 0
        const refRetail = refRetailMap[productId]
        if (!refRetail || refRetail <= 0 || purchasePrice <= 0) return 0
        const margin = 1 - purchasePrice / refRetail
        return revenue * Math.max(0, margin) // clamp to 0 just in case of bad data
    }

    const totalProfit = useMemo(() =>
        allSold.reduce((sum: number, p: any) =>
            sum + calcProfit(p.revenue ?? 0, p.productId), 0)
    , [allSold, purchasePriceMap, refRetailMap])

    const topProductsWithProfit = useMemo(() =>
        topProducts.map((p: any) => ({
            ...p,
            profit: calcProfit(p.revenue ?? 0, p.productId),
        }))
    , [topProducts, purchasePriceMap, refRetailMap])

    // Margin ratio for the CHART period — profit ÷ revenue from the same weekRange
    // that the daily chart is displaying. This means the profit line reflects
    // actual sales in the chart window, not the date-picker window.
    const overallMarginRatio = useMemo(() => {
        const sold = (chartSoldRaw as any[]) ?? []
        const chartRevenue = sold.reduce((s, p) => s + (p.revenue ?? 0), 0)
        const chartProfit  = sold.reduce((s, p) => s + calcProfit(p.revenue ?? 0, p.productId), 0)
        if (chartRevenue > 0) return Math.max(0, chartProfit / chartRevenue)
        // Fallback: use overall sold data if chart period has no sales yet
        const totalRevenue = ((allSoldRaw as any[]) ?? []).reduce((s: number, p: any) => s + (p.revenue ?? 0), 0)
        return totalRevenue > 0 ? Math.max(0, totalProfit / totalRevenue) : 0
    }, [chartSoldRaw, allSoldRaw, totalProfit, purchasePriceMap, refRetailMap])

    // Enrich daily sales with estimated gross profit
    const dailySalesWithProfit = useMemo(() =>
        dailySales.map(d => ({
            ...d,
            profit: Number((d.revenue * overallMarginRatio).toFixed(2)),
        }))
    , [dailySales, overallMarginRatio])

    const dailyChartOptions: AgChartOptions = useMemo(() => ({
        data: dailySalesWithProfit,
        series: [
            { type: 'line' as const, xKey: 'day', yKey: 'revenue', yName: 'Revenue (₵)', stroke: '#0865AC', strokeWidth: 2 },
            { type: 'line' as const, xKey: 'day', yKey: 'profit',  yName: 'Profit (₵)',  stroke: '#f97316', strokeWidth: 2 },
            { type: 'line' as const, xKey: 'day', yKey: 'count',   yName: 'Sales',        stroke: '#94a3b8', strokeWidth: 1.5 },
        ],
        axes: [
            { type: 'category' as const, position: 'bottom' as const },
            // Revenue + Profit on left axis — same magnitude, so ticks work correctly
            { type: 'number' as const, position: 'left' as const, keys: ['revenue', 'profit'], min: 0, tick: { count: 5 },  title: { text: 'Revenue' } } as any,
            // Count on right axis — different magnitude, separate scale
            { type: 'number' as const, position: 'right' as const, keys: ['count'], min: 0, tick: { count: 5 }, title: { text: 'Sales' } } as any,
        ],
        background: { fill: 'transparent' },
    }), [dailySalesWithProfit])

    // Monthly: enrich with profit after overallMarginRatio is available
    const monthlySalesWithProfit = useMemo(() =>
        monthlySalesRawArr.map((d: any) => ({
            ...d,
            profit: Number(((d.revenue ?? 0) * overallMarginRatio).toFixed(2)),
        }))
    , [monthlySalesRawArr, overallMarginRatio])

    const monthlyChartOptions: AgChartOptions = useMemo(() => ({
        data: monthlySalesWithProfit,
        series: [
            { type: 'bar' as const, xKey: 'date', yKey: 'revenue', yName: 'Revenue (₵)', fill: '#0865AC' },
            { type: 'bar' as const, xKey: 'date', yKey: 'profit',  yName: 'Profit (₵)',  fill: '#f97316' },
            { type: 'bar' as const, xKey: 'date', yKey: 'count',   yName: 'Sales',        fill: '#94a3b8' },
        ],
        axes: [
            { type: 'category' as const, position: 'bottom' as const },
            { type: 'number' as const, position: 'left' as const,  keys: ['revenue', 'profit'], min: 0, tick: { count: 5 } } as any,
            { type: 'number' as const, position: 'right' as const, keys: ['count'],              min: 0, tick: { count: 5 }, title: { text: 'Sales' } } as any,
        ],
        background: { fill: 'transparent' },
    }), [monthlySalesWithProfit])

    const topProductCols = useMemo(() => [
        { field: 'productName', headerName: 'Product', flex: 1 },
        { field: 'quantitySold', headerName: 'Qty Sold', width: 110 },
        { field: 'revenue', headerName: 'Revenue', width: 130, valueFormatter: (p: any) => fmt(p.value) },
        { field: 'profit', headerName: 'Profit', width: 130, valueFormatter: (p: any) => fmt(p.value), cellStyle: (p: any) => ({ color: p.value >= 0 ? '#16a34a' : '#dc2626' }) },
    ], [])

    const warehouseCols = useMemo(() => [
        { field: 'name', headerName: 'Warehouse', minWidth: 120 },
        { field: 'salesCount', headerName: 'Sales', width: 90 },
        { field: 'revenue', headerName: 'Revenue', width: 140, valueFormatter: (p: any) => fmt(p.value) },
        { field: 'totalStock', headerName: 'Stock', width: 90 },
        { field: 'productsCount', headerName: 'Products', width: 110 },
    ], [])

    return (
        <main className="w-full flex flex-col gap-6">

            {/* Header + date range picker */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h1 className="bytewave-heading">Overview</h1>
                    <p className="bytewave-paragraph text-gray-500">{"Here's what's happening with your store"}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex items-center gap-1">
                        <label className="bytewave-paragraph text-xs text-gray-500">From</label>
                        <input
                            type="date"
                            value={from}
                            onChange={e => setFrom(e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 bytewave-paragraph text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-endeavour"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <label className="bytewave-paragraph text-xs text-gray-500">To</label>
                        <input
                            type="date"
                            value={to}
                            onChange={e => setTo(e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 bytewave-paragraph text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-endeavour"
                        />
                    </div>
                    {(from || to) && (
                        <button
                            onClick={() => { setFrom(''); setTo('') }}
                            className="bytewave-paragraph text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </header>

            {/* Summary cards — 2 rows of 3 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="Total Revenue" value={fmt(overview?.revenue?.total ?? 0)} sub={`Cash ${fmt(overview?.revenue?.cash ?? 0)} · MoMo ${fmt(overview?.revenue?.momo ?? 0)}`} icon={TrendingUp} color="bg-endeavour" />
                <StatCard label="Total Sales" value={overview?.sales?.total ?? 0} sub={`Cash ${overview?.sales?.cash ?? 0} · MoMo ${overview?.sales?.momo ?? 0}`} icon={ShoppingCart} color="bg-green-500" />
                <StatCard label="Total Products" value={overview?.inventory?.totalProducts ?? 0} sub={`${overview?.inventory?.totalStock ?? 0} units in stock`} icon={Package} color="bg-purple-500" />
                <StatCard label="Low Stock" value={overview?.inventory?.lowStockProducts ?? 0} sub="Products below minimum quantity" icon={AlertTriangle} color="bg-red-500" />
                <StatCard label="Avg Sale Value" value={fmt(overview?.revenue?.average ?? 0)} sub="Average revenue per transaction" icon={DollarSign} color="bg-amber-500" />
                <StatCard label="Gross Profit" value={fmt(totalProfit)} sub={totalProfit < 0 ? 'Negative — check purchasePrice matches selling unit' : 'Revenue minus purchase cost'} icon={TrendingUp} color={totalProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'} />
            </div>

            {/* Charts */}
            <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-3 bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <p className="bytewave-paragraph font-semibold text-stone-700">Daily Performance</p>
                            <p className="bytewave-paragraph text-xs text-gray-400">Revenue · Profit · Sales count</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Refresh button */}
                            <button
                                onClick={() => refetchDailyChart()}
                                title="Refresh chart data"
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-endeavour hover:border-endeavour transition-colors"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                            {/* Duration selector */}
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                                {([
                                    { key: 'this-week', label: 'This Week' },
                                    { key: '7d',        label: '7 Days'    },
                                    { key: '14d',       label: '14 Days'   },
                                    { key: '30d',       label: '30 Days'   },
                                ] as const).map(opt => (
                                    <button
                                        key={opt.key}
                                        onClick={() => setChartDuration(opt.key)}
                                        className={`px-2.5 py-1 bytewave-paragraph transition-colors ${
                                            chartDuration === opt.key
                                                ? 'bg-endeavour text-white'
                                                : 'bg-white text-gray-500 hover:bg-gray-50'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <AgCharts options={dailyChartOptions} style={{ height: '240px' }} />
                </div>
                <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
                    <div className="mb-3">
                        <p className="bytewave-paragraph font-semibold text-stone-700">Monthly Performance</p>
                        <p className="bytewave-paragraph text-xs text-gray-400">Revenue by month</p>
                    </div>
                    <AgCharts options={monthlyChartOptions} style={{ height: '240px' }} />
                </div>
            </section>

            {/* Tables */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-endeavour" />
                        <p className="bytewave-paragraph font-semibold text-stone-700">Top Products</p>
                    </div>
                    <DatagridTemplate columns={topProductCols} data={topProductsWithProfit} enablePagination={false} paginationPageSize={topPageSize} selectionType="singleRow" />
                    <Pagination page={topPage} pageSize={topPageSize} total={topTotal} onPage={setTopPage} onPageSize={setTopPageSize} />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-endeavour" />
                        <p className="bytewave-paragraph font-semibold text-stone-700">Warehouses</p>
                    </div>
                    <DatagridTemplate columns={warehouseCols} data={warehouses} enablePagination={false} paginationPageSize={whPageSize} selectionType="singleRow" />
                    <Pagination page={whPage} pageSize={whPageSize} total={whTotal} onPage={setWhPage} onPageSize={setWhPageSize} />
                </div>
            </section>
        </main>
    )
}

export default Main
