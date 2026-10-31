'use client'

// Cash vs MoMo takings for one day or one month, to reconcile against the
// till and the MoMo wallet statement. Totals come from /stats/overview for
// exactly that day or month (sales + paid invoices, as the backend counts them).

import React, { useState } from 'react'
import { Banknote, ChevronLeft, ChevronRight, Smartphone, Wallet } from 'lucide-react'
import { useFetchData } from '@/hooks/use-fetch'
import { IGeneric } from '@/types/interfaces'
import { cn } from '@/lib/utils'
import { StatisticsServices } from '../_logics/services'
import { localYmd, rangeParams } from '../_logics/range'

type Mode = 'day' | 'month'

const fmt = (v: number) => `₵ ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// The first and last day ("YYYY-MM-DD") of the selected day or month.
export const periodBounds = (mode: Mode, value: string) => {
  if (mode === 'day') return { from: value, to: value }
  const [y, m] = value.split('-').map(Number)
  return { from: localYmd(new Date(y, m - 1, 1)), to: localYmd(new Date(y, m, 0)) }
}

export const shiftPeriod = (mode: Mode, value: string, by: number) => {
  const [y, m, d] = value.split('-').map(Number)
  if (mode === 'day') return localYmd(new Date(y, m - 1, d + by))
  return localYmd(new Date(y, m - 1 + by, 1)).slice(0, 7)
}

const periodLabel = (mode: Mode, value: string) => {
  const [y, m, d] = value.split('-').map(Number)
  return mode === 'day'
    ? new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

const Method = ({
  icon: Icon,
  label,
  amount,
  count,
  share,
  tone,
}: {
  icon: React.ElementType
  label: string
  amount: number
  count: number
  share: number
  tone: string
}) => (
  <div className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-gray-50 p-3">
    <div className="flex items-center gap-2">
      <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg text-white', tone)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="bytewave-paragraph text-xs font-semibold text-stone-600">{label}</p>
      <span className="ml-auto text-[10px] font-semibold text-gray-400">{share.toFixed(0)}%</span>
    </div>
    <p className="bytewave-heading text-xl text-stone-800 tabular-nums">{fmt(amount)}</p>
    <p className="bytewave-paragraph text-[11px] text-gray-400">
      {count} {count === 1 ? 'payment' : 'payments'}
    </p>
  </div>
)

export const PaymentsReconciliation = () => {
  const [mode, setMode] = useState<Mode>('day')
  const today = localYmd(new Date())
  const [day, setDay] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const value = mode === 'day' ? day : `${month}-01`
  const { from, to } = periodBounds(mode, value)
  const isCurrent = mode === 'day' ? day >= today : month >= today.slice(0, 7)

  const { data, isLoading } = useFetchData(
    `payments-${from}-${to}`,
    StatisticsServices.FetchAll(rangeParams(from, to)) as unknown as IGeneric
  )
  const o = data as any
  const cash = Number(o?.revenue?.cash) || 0
  const momo = Number(o?.revenue?.momo) || 0
  const total = Number(o?.revenue?.total) || cash + momo
  const cashCount = Number(o?.sales?.cash) || 0
  const momoCount = Number(o?.sales?.momo) || 0
  const share = (n: number) => (total > 0 ? (n / total) * 100 : 0)

  const step = (by: number) => (mode === 'day' ? setDay(shiftPeriod('day', day, by)) : setMonth(shiftPeriod('month', `${month}-01`, by)))

  return (
    <section aria-label="Cash and MoMo totals" className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="bytewave-paragraph font-semibold text-stone-700">Cash &amp; MoMo</p>
          <p className="bytewave-paragraph text-xs text-gray-400">Totals to check against the till and the MoMo statement</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div role="radiogroup" aria-label="Period" className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {(['day', 'month'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'px-3 py-1.5 bytewave-paragraph transition-colors border-l border-gray-200 first:border-l-0',
                  mode === m ? 'bg-endeavour text-white' : 'bg-white text-gray-500 hover:text-endeavour'
                )}
              >
                {m === 'day' ? 'Daily' : 'Monthly'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={mode === 'day' ? 'Previous day' : 'Previous month'}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-endeavour hover:border-endeavour"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {mode === 'day' ? (
              <input
                type="date"
                aria-label="Day"
                value={day}
                max={today}
                onChange={(e) => e.target.value && setDay(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1 bytewave-paragraph text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-endeavour"
              />
            ) : (
              <input
                type="month"
                aria-label="Month"
                value={month}
                max={today.slice(0, 7)}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1 bytewave-paragraph text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-endeavour"
              />
            )}
            <button
              type="button"
              onClick={() => step(1)}
              disabled={isCurrent}
              aria-label={mode === 'day' ? 'Next day' : 'Next month'}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-endeavour hover:border-endeavour disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <p className="bytewave-paragraph text-xs text-gray-500" aria-live="polite">
        {periodLabel(mode, value)}
        {isLoading ? ' · updating…' : ''}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Method icon={Banknote} label="Cash" amount={cash} count={cashCount} share={share(cash)} tone="bg-green-500" />
        <Method icon={Smartphone} label="MoMo" amount={momo} count={momoCount} share={share(momo)} tone="bg-amber-500" />
        <div className="flex flex-col gap-1 rounded-xl border border-endeavour/20 bg-endeavour/5 p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-endeavour text-white">
              <Wallet className="h-3.5 w-3.5" />
            </span>
            <p className="bytewave-paragraph text-xs font-semibold text-stone-600">Total taken</p>
          </div>
          <p className="bytewave-heading text-xl text-stone-800 tabular-nums">{fmt(total)}</p>
          <p className="bytewave-paragraph text-[11px] text-gray-400">
            {cashCount + momoCount} {cashCount + momoCount === 1 ? 'payment' : 'payments'}
          </p>
        </div>
      </div>

      {total > 0 && (
        <div className="flex h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden>
          <div className="bg-green-500" style={{ width: `${share(cash)}%` }} />
          <div className="bg-amber-500" style={{ width: `${share(momo)}%` }} />
        </div>
      )}
      <p className="bytewave-paragraph text-[11px] text-gray-400">
        Includes counter sales and paid invoices (counted on the day the invoice was created).
      </p>
    </section>
  )
}
