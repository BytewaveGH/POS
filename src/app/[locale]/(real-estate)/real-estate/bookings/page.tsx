'use client'

import React, { useMemo, useState } from 'react'
import { addDays, differenceInCalendarDays, endOfMonth, format, isWeekend, startOfMonth, startOfWeek } from 'date-fns'
import { BedDouble, CalendarCheck2, CalendarPlus, ChevronLeft, ChevronRight, LogIn, LogOut, Moon, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortfolio, useRealEstateActions } from '../_logics/hooks'
import { NoAccess } from '../_components/load-state'
import { bookingNights, bookingTotal, parseDate, shortStayOccupancy, toISODate, todayISO } from '../_logics/calc'
import { channelLabel } from '../_logics/constants'
import { dayMonth, money, percent, plural } from '../_logics/format'
import type { Booking } from '../_logics/types'
import {
  Avatar,
  Badge,
  BOOKING,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  LoadingGrid,
  PageHeader,
  SectionTitle,
  StatCard,
} from '../_components/ui'
import { BookingForm } from '../_components/forms/booking-maintenance-forms'

const DAYS = 14
const BAR: Record<string, string> = {
  confirmed: 'bg-endeavour text-white',
  'checked-in': 'bg-emerald-500 text-white',
  'checked-out': 'bg-stone-300 text-stone-700',
  inquiry: 'bg-white text-stone-600 border border-dashed border-stone-400',
}

export default function BookingsPage() {
  const p = usePortfolio()
  const canEdit = p.can.write('lettings')
  const actions = useRealEstateActions()
  const today = todayISO()
  const [from, setFrom] = useState(() => toISODate(startOfWeek(parseDate(today), { weekStartsOn: 1 })))
  const [form, setForm] = useState<{ booking?: Booking | null; preset?: { unitId?: number; checkIn?: string } | null } | null>(null)

  const units = useMemo(
    () =>
      p.units
        .filter((u) => u.rentalMode === 'short-stay')
        .sort((a, b) => a.propertyId - b.propertyId || a.name.localeCompare(b.name, undefined, { numeric: true })),
    [p.units]
  )
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => toISODate(addDays(parseDate(from), i))), [from])
  const to = toISODate(addDays(parseDate(from), DAYS))

  const stats = useMemo(() => {
    const ms = toISODate(startOfMonth(parseDate(today)))
    const me = toISODate(addDays(endOfMonth(parseDate(today)), 1))
    const live = p.bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'inquiry')
    const monthly = live.filter((b) => b.checkIn >= ms && b.checkIn < me)
    const weekAhead = toISODate(addDays(parseDate(today), 7))
    return {
      occupancy: shortStayOccupancy(p.units, p.bookings, ms, me),
      revenue: monthly.reduce((s, b) => s + bookingTotal(b), 0),
      collected: monthly.reduce((s, b) => s + (b.amountPaid || 0), 0),
      arrivals: live.filter((b) => b.status === 'confirmed' && b.checkIn >= today && b.checkIn <= weekAhead).length,
    }
  }, [p.units, p.bookings, today])

  const agenda = useMemo(
    () =>
      p.bookings
        .filter((b) => (b.status === 'confirmed' || b.status === 'checked-in' || b.status === 'inquiry') && b.checkOut >= today)
        .sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1)),
    [p.bookings, today]
  )

  const setStatus = (b: Booking, status: Booking['status']) => void actions.update('bookings', b.id, { status }).catch(() => {})

  if (p.isLoading || !p.can.read('lettings')) {
    return (
      <>
        <PageHeader eyebrow="Real estate" title="Short-stay bookings" />
        {p.can.read('lettings') ? <LoadingGrid /> : <NoAccess />}
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Real estate"
        title="Short-stay bookings"
        description="Airbnb and nightly guests across your short-stay units."
        actions={
          canEdit &&
          units.length > 0 && (
            <Button icon={CalendarPlus} onClick={() => setForm({ booking: null, preset: null })}>
              New booking
            </Button>
          )
        }
      />
      {p.error && <ErrorNote message={p.error} />}

      {units.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title="No short-stay units yet"
          description="Add a property of type “Short stay / Airbnb”, or switch a unit to nightly rates, and its calendar shows up here."
        />
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Occupancy this month"
              value={percent(stats.occupancy.rate)}
              icon={Moon}
              hint={`${stats.occupancy.booked} of ${stats.occupancy.available} nights`}
            />
            <StatCard label="Booked this month" value={money(stats.revenue)} icon={CalendarCheck2} tone="green" hint="By check-in date" />
            <StatCard
              label="Collected"
              value={money(stats.collected)}
              icon={Wallet}
              tone={stats.collected < stats.revenue ? 'amber' : 'green'}
              hint={stats.revenue > stats.collected ? `${money(stats.revenue - stats.collected)} still to collect` : 'All paid'}
            />
            <StatCard label="Arrivals in 7 days" value={String(stats.arrivals)} icon={LogIn} tone="blue" />
          </div>

          {/* Timeline */}
          <Card className="mt-6 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-100">
              <p className="text-sm font-bold text-stone-900">
                {format(parseDate(from), 'd MMM')} – {format(addDays(parseDate(from), DAYS - 1), 'd MMM yyyy')}
              </p>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setFrom(toISODate(startOfWeek(parseDate(today), { weekStartsOn: 1 })))}>
                  Today
                </Button>
                <button
                  type="button"
                  aria-label="Previous week"
                  onClick={() => setFrom(toISODate(addDays(parseDate(from), -7)))}
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next week"
                  onClick={() => setFrom(toISODate(addDays(parseDate(from), 7)))}
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[860px]">
                {/* Day header */}
                <div className="grid border-b border-stone-100" style={{ gridTemplateColumns: `168px repeat(${DAYS}, minmax(0, 1fr))` }}>
                  <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-stone-400">Unit</div>
                  {days.map((d) => {
                    const date = parseDate(d)
                    return (
                      <div
                        key={d}
                        className={cn(
                          'py-2 text-center border-l border-stone-100',
                          isWeekend(date) && 'bg-stone-50/70',
                          d === today && 'bg-endeavour/[0.06]'
                        )}
                      >
                        <p className="text-[10px] font-semibold text-stone-400 uppercase">{format(date, 'EEE')}</p>
                        <p className={cn('text-sm font-bold tabular-nums', d === today ? 'text-endeavour' : 'text-stone-700')}>
                          {format(date, 'd')}
                        </p>
                      </div>
                    )
                  })}
                </div>
                {/* Rows */}
                {units.map((u) => {
                  const rowBookings = p.bookings.filter(
                    (b) => b.unitId === u.id && b.status !== 'cancelled' && b.checkIn < to && b.checkOut > from
                  )
                  return (
                    <div
                      key={u.id}
                      className="grid border-b border-stone-100 last:border-b-0 relative"
                      style={{ gridTemplateColumns: `168px repeat(${DAYS}, minmax(0, 1fr))` }}
                    >
                      <div className="px-4 py-3 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 truncate">{u.name}</p>
                        <p className="text-[11px] text-stone-500 truncate">
                          {p.propertyById.get(u.propertyId)?.name} · {money(u.nightlyRate)}
                        </p>
                      </div>
                      {days.map((d) => (
                        <button
                          key={d}
                          type="button"
                          aria-label={`Book ${u.name} from ${dayMonth(d)}`}
                          disabled={!canEdit}
                          onClick={() => setForm({ booking: null, preset: { unitId: u.id, checkIn: d } })}
                          className={cn(
                            'h-14 border-l border-stone-100 hover:bg-endeavour/[0.05] transition-colors',
                            isWeekend(parseDate(d)) && 'bg-stone-50/70',
                            d === today && 'bg-endeavour/[0.04]'
                          )}
                        />
                      ))}
                      {/* Bars: noon of check-in to noon of check-out */}
                      <div className="absolute inset-y-0 right-0 pointer-events-none" style={{ left: 168 }}>
                        {rowBookings.map((b) => {
                          const start = Math.max(-0.5, differenceInCalendarDays(parseDate(b.checkIn), parseDate(from)) + 0.5)
                          const end = Math.min(DAYS, differenceInCalendarDays(parseDate(b.checkOut), parseDate(from)) + 0.5)
                          const left = (Math.max(0, start) / DAYS) * 100
                          const width = ((end - Math.max(0, start)) / DAYS) * 100
                          if (width <= 0) return null
                          return (
                            <button
                              key={b.id}
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setForm({ booking: b, preset: null })}
                              title={`${b.guestName} · ${dayMonth(b.checkIn)} → ${dayMonth(b.checkOut)} · ${BOOKING[b.status].label}`}
                              className={cn(
                                'pointer-events-auto absolute top-2.5 h-9 rounded-lg px-2 text-left text-xs font-semibold shadow-sm truncate flex items-center gap-1.5 hover:brightness-110 transition',
                                BAR[b.status] ?? BAR.confirmed,
                                start < 0 && 'rounded-l-none'
                              )}
                              style={{ left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)` }}
                            >
                              {b.status === 'checked-in' && <LogIn className="h-3 w-3 flex-shrink-0" />}
                              <span className="truncate">{b.guestName}</span>
                              <span className="opacity-70 tabular-nums flex-shrink-0">{bookingNights(b)}n</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 px-4 py-3 border-t border-stone-100 bg-stone-50/50">
              {(['confirmed', 'checked-in', 'inquiry', 'checked-out'] as const).map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 text-xs text-stone-600">
                  <span className={cn('h-3 w-5 rounded', BAR[s])} />
                  {BOOKING[s].label}
                </span>
              ))}
              <span className="text-xs text-stone-400 ml-auto">Tap an empty day to start a booking</span>
            </div>
          </Card>

          {/* Agenda */}
          <div className="mt-6">
            <SectionTitle title="Upcoming & in house" hint={plural(agenda.length, 'booking')} />
            {agenda.length === 0 ? (
              <p className="text-sm text-stone-500">Nothing coming up.</p>
            ) : (
              <Card className="divide-y divide-stone-100">
                {agenda.map((b) => {
                  const total = bookingTotal(b)
                  const due = total - (b.amountPaid || 0)
                  return (
                    <div key={b.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => setForm({ booking: b, preset: null })}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left"
                      >
                        <Avatar name={b.guestName} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-stone-900 truncate">{b.guestName}</p>
                          <p className="text-xs text-stone-500 truncate">
                            {p.unitById.get(b.unitId)?.name} · {dayMonth(b.checkIn)} → {dayMonth(b.checkOut)} ·{' '}
                            {plural(bookingNights(b), 'night')} · {plural(b.guests, 'guest')} · {channelLabel(b.channel)}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-left sm:text-right">
                          <Badge spec={BOOKING[b.status]} />
                          <p className={cn('text-[11px] mt-1 tabular-nums', due > 0 ? 'text-amber-700 font-semibold' : 'text-stone-500')}>
                            {due > 0 ? `${money(due)} to collect` : `${money(total)} paid`}
                          </p>
                        </div>
                        {canEdit && b.status === 'confirmed' && b.checkIn <= today && (
                          <Button size="sm" icon={LogIn} onClick={() => setStatus(b, 'checked-in')}>
                            Check in
                          </Button>
                        )}
                        {canEdit && b.status === 'checked-in' && (
                          <Button size="sm" variant="secondary" icon={LogOut} onClick={() => setStatus(b, 'checked-out')}>
                            Check out
                          </Button>
                        )}
                        {canEdit && b.status === 'inquiry' && (
                          <Button size="sm" variant="secondary" onClick={() => setStatus(b, 'confirmed')}>
                            Confirm
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </Card>
            )}
          </div>
        </>
      )}

      <BookingForm open={!!form} onOpenChange={(o) => !o && setForm(null)} booking={form?.booking ?? null} preset={form?.preset ?? null} />
    </>
  )
}
