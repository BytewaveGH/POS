'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, SectionTitle } from '@/components/kit/ui'
import { Segmented } from '@/components/kit/form'
import { expenseLabel, itemProfit, periodRange, profitReport, stockStatus, type Period } from '@/lib/eatery/costing'
import { formatMoney } from '@/lib/eatery/menu'
import type { OwnerData } from '@/lib/eatery/hooks'
import type { Restaurant } from '@/lib/eatery/types'

const pct = (n: number) => `${Math.round(n * 100)}%`

// Where each cedi of sales went. Segments are labelled in the legend, so
// identity never depends on colour alone.
const SEGMENTS = [
  { key: 'costOfGoods', label: 'Ingredients used', color: '#D97706' },
  { key: 'waste', label: 'Waste', color: '#E11D48' },
  { key: 'expenses', label: 'Running costs', color: '#7C3AED' },
  { key: 'netProfit', label: 'Profit', color: '#0D9488' },
] as const

export const ProfitPanel = ({ o, now, href }: { o: OwnerData & { restaurant: Restaurant }; now: Date; href: (p: string) => string }) => {
  const [period, setPeriod] = useState<Period>('month')
  const { from, to, label } = periodRange(period, now)
  const r = o.restaurant
  const rep = profitReport({ orders: o.orders, stockMoves: o.stockMoves, expenses: o.expenses, recipes: o.recipes }, from, to)
  const items = itemProfit(o.orders, from, to).slice(0, 6)
  const money = (n: number) => formatMoney(Math.round(n), r.currency)
  const loss = rep.netProfit < 0
  const low = o.ingredients.filter((i) => stockStatus(i) !== 'ok')
  const base = Math.max(rep.sales, rep.costOfGoods + rep.waste + rep.expenses, 1)

  return (
    <Card className="p-5 mb-4">
      <SectionTitle title="Profit" hint={`${label} · sales minus what it cost you`} />
      <div className="mb-4 max-w-md">
        <Segmented
          ariaLabel="Period"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This week' },
            { value: 'month', label: 'This month' },
            { value: '30d', label: '30 days' },
          ]}
        />
      </div>

      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-stone-50 p-3">
          <dt className="text-xs font-semibold text-stone-500">Sales</dt>
          <dd className="text-2xl font-extrabold tabular-nums text-stone-900">{money(rep.sales)}</dd>
          <dd className="text-[11px] text-stone-500">
            {rep.orders} orders · counter {money(rep.byChannel.counter)} · online {money(rep.byChannel.online)}
          </dd>
        </div>
        <div className="rounded-xl bg-stone-50 p-3">
          <dt className="text-xs font-semibold text-stone-500">Ingredients used</dt>
          <dd className="text-2xl font-extrabold tabular-nums text-stone-900">{money(rep.costOfGoods)}</dd>
          <dd className="text-[11px] text-stone-500">
            Gross profit {money(rep.grossProfit)} · {pct(rep.grossMargin)}
          </dd>
        </div>
        <div className="rounded-xl bg-stone-50 p-3">
          <dt className="text-xs font-semibold text-stone-500">Waste & running costs</dt>
          <dd className="text-2xl font-extrabold tabular-nums text-stone-900">{money(rep.waste + rep.expenses)}</dd>
          <dd className="text-[11px] text-stone-500">
            Waste {money(rep.waste)} · expenses {money(rep.expenses)}
          </dd>
        </div>
        <div className={cn('rounded-xl p-3', loss ? 'bg-rose-50' : 'bg-teal-50')}>
          <dt className={cn('text-xs font-semibold', loss ? 'text-rose-700' : 'text-teal-800')}>{loss ? 'Loss' : 'Net profit'}</dt>
          <dd className={cn('text-2xl font-extrabold tabular-nums', loss ? 'text-rose-700' : 'text-teal-900')} data-testid="net-profit">
            {money(rep.netProfit)}
          </dd>
          <dd className={cn('text-[11px]', loss ? 'text-rose-700' : 'text-teal-800')}>
            {rep.sales ? `${pct(rep.netMargin)} of sales` : 'No sales yet'}
          </dd>
        </div>
      </dl>

      {(rep.sales > 0 || rep.expenses > 0) && (
        <div className="mt-4">
          <div
            className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-stone-100"
            role="img"
            aria-label={SEGMENTS.map((s) => `${s.label}: ${money(Math.max(0, rep[s.key]))}`).join(', ')}
          >
            {SEGMENTS.map((s) => {
              const v = Math.max(0, rep[s.key])
              return v > 0 ? (
                <span
                  key={s.key}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${(v / base) * 100}%`, background: s.color }}
                  title={`${s.label}: ${money(v)}`}
                />
              ) : null
            })}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
            {SEGMENTS.map((s) => (
              <li key={s.key} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
                {s.label} <span className="font-semibold tabular-nums text-stone-800">{money(Math.max(0, rep[s.key]))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {rep.uncostedLines > 0 && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {rep.uncostedLines} sold item{rep.uncostedLines === 1 ? ' has' : 's have'} no recipe, so their ingredient cost isn’t counted
              and profit looks higher than it is.{' '}
              <Link href={href('/eatery/stock')} className="font-bold underline">
                Add recipes
              </Link>
            </span>
          </p>
        )}
        {rep.spentOnStock > 0 && (
          <p className="flex items-start gap-2 text-xs text-stone-500">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            You spent {money(rep.spentOnStock)} buying stock. It counts as a cost when it’s used or wasted, not when it’s bought.
          </p>
        )}
        {low.length > 0 && (
          <p className="flex items-start gap-2 text-xs text-stone-500">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
            Running low:{' '}
            {low
              .slice(0, 4)
              .map((i) => i.name)
              .join(', ')}
            {low.length > 4 ? ` and ${low.length - 4} more` : ''}.{' '}
            <Link href={href('/eatery/stock')} className="font-semibold text-endeavour hover:underline">
              Restock
            </Link>
          </p>
        )}
      </div>

      {(items.length > 0 || rep.expensesByCategory.length > 0) && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {items.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-2">Best earners</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-stone-400">
                    <th className="font-semibold pb-1">Item</th>
                    <th className="font-semibold pb-1 text-right">Sold</th>
                    <th className="font-semibold pb-1 text-right">Sales</th>
                    <th className="font-semibold pb-1 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {items.map((i) => (
                    <tr key={i.itemId}>
                      <td className="py-1.5 font-semibold text-stone-800">{i.name}</td>
                      <td className="py-1.5 text-right tabular-nums text-stone-600">{i.sold}</td>
                      <td className="py-1.5 text-right tabular-nums text-stone-600">{money(i.revenue)}</td>
                      <td className="py-1.5 text-right tabular-nums font-semibold text-stone-900">
                        {i.costed ? `${money(i.profit)} · ${pct(i.margin)}` : <span className="text-stone-400 font-normal">no recipe</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rep.expensesByCategory.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-2">Running costs</p>
              <ul className="space-y-1.5 text-sm">
                {rep.expensesByCategory.map((e) => (
                  <li key={e.category} className="flex justify-between">
                    <span className="text-stone-700">{expenseLabel(e.category)}</span>
                    <span className="tabular-nums font-semibold text-stone-900">{money(e.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
