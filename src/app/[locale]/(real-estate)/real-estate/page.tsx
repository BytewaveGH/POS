'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  Building,
  CalendarClock,
  CircleDollarSign,
  DoorOpen,
  Hammer,
  KeyRound,
  Plus,
  Receipt,
  Wallet,
} from 'lucide-react'
import { usePortfolio } from './_logics/hooks'
import {
  bookingTotal,
  collectedByMonth,
  leasesExpiringWithin,
  occupancyBreakdown,
  openMaintenance,
  parseDate,
  shortStayOccupancy,
  toISODate,
  todayISO,
} from './_logics/calc'
import { byUrgency, propertyStats, tenancyRows } from './_logics/selectors'
import { dayMonth, money, percent, plural, shortDate } from './_logics/format'
import {
  Badge,
  Button,
  Card,
  CollectedChart,
  EmptyState,
  ErrorNote,
  LoadingGrid,
  OccupancyBar,
  PageHeader,
  PRIORITY,
  Ring,
  SectionTitle,
  StatCard,
} from './_components/ui'
import { PropertyCard, TenancyItem } from './_components/cards'
import { useLocaleHref } from './_components/module-frame'
import { PropertyForm } from './_components/forms/property-form'
import { MoveInForm, PaymentForm } from './_components/forms/tenancy-forms'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function RealEstateDashboard() {
  const p = usePortfolio()
  const href = useLocaleHref()
  const today = todayISO()
  const [drawer, setDrawer] = useState<null | 'property' | 'move-in' | 'payment'>(null)
  const [payLease, setPayLease] = useState<number | null>(null)

  const view = useMemo(() => {
    const rows = tenancyRows(p, today)
    const live = rows.filter((r) => r.state !== 'ended' || r.rent.arrears > 0)
    const occupancy = occupancyBreakdown(p.units, p.leases, p.bookings, today)
    const monthStart = toISODate(startOfMonth(parseDate(today)))
    const monthEnd = toISODate(endOfMonth(parseDate(today)))
    const collected = collectedByMonth(p.payments, p.bookings, today, 6)
    const thisMonth = collected[collected.length - 1]?.amount ?? 0
    const lastMonth = collected[collected.length - 2]?.amount ?? 0
    const shortStayUnits = p.units.filter((u) => u.rentalMode === 'short-stay')
    return {
      rows: live.sort(byUrgency),
      occupancy,
      rentRoll: rows.filter((r) => r.state === 'active').reduce((s, r) => s + r.lease.monthlyRent, 0),
      potential: p.units
        .filter((u) => u.rentalMode === 'long-term' && u.availability !== 'unlisted')
        .reduce((s, u) => s + u.monthlyRent, 0),
      arrears: rows.reduce((s, r) => s + r.rent.arrears, 0),
      overdueCount: rows.filter((r) => r.rent.status === 'overdue').length,
      collected,
      thisMonth,
      lastMonth,
      expiring: leasesExpiringWithin(p.leases, today, 60),
      repairs: openMaintenance(p.maintenance).sort(
        (a, b) => ['urgent', 'high', 'medium', 'low'].indexOf(a.priority) - ['urgent', 'high', 'medium', 'low'].indexOf(b.priority)
      ),
      shortStayUnits,
      stayRate: shortStayOccupancy(p.units, p.bookings, monthStart, toISODate(new Date(parseDate(monthEnd).getTime() + 86_400_000))),
      arrivals: p.bookings
        .filter((b) => b.status === 'confirmed' && b.checkIn >= today)
        .sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1))
        .slice(0, 4),
      departures: p.bookings.filter((b) => b.status === 'checked-in' && b.checkOut >= today).length,
    }
  }, [p, today])

  const pay = (leaseId?: number) => {
    setPayLease(leaseId ?? null)
    setDrawer('payment')
  }

  const drawers = (
    <>
      <PropertyForm open={drawer === 'property'} onOpenChange={(o) => setDrawer(o ? 'property' : null)} />
      <MoveInForm open={drawer === 'move-in'} onOpenChange={(o) => setDrawer(o ? 'move-in' : null)} />
      <PaymentForm open={drawer === 'payment'} onOpenChange={(o) => setDrawer(o ? 'payment' : null)} leaseId={payLease} />
    </>
  )

  if (p.isLoading) {
    return (
      <>
        <PageHeader eyebrow="Real estate" title="Portfolio" />
        <LoadingGrid />
        <LoadingGrid count={3} className="mt-4 xl:grid-cols-3" />
      </>
    )
  }

  if (p.properties.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Real estate"
          title={`${greeting()}`}
          description="Manage compound houses, apartments and short-stay homes in one place."
        />
        {p.error && <ErrorNote message={p.error} />}
        <EmptyState
          icon={Building}
          title="Add your first property"
          description="Set up the building and its rooms in one step — e.g. 2 single rooms and 7 self-contained chamber & halls — then move your tenants in."
          action={
            <Button icon={Plus} onClick={() => setDrawer('property')}>
              Add property
            </Button>
          }
        />
        <div className="grid gap-3 sm:grid-cols-3 mt-4">
          {[
            { icon: Building, title: 'Add the property', text: 'Type, address and its rooms with rents.' },
            { icon: KeyRound, title: 'Move tenants in', text: 'Record their advance — 1 or 2 years upfront works.' },
            { icon: Receipt, title: 'Stay on top of rent', text: 'See who’s paid, who’s due soon and who owes.' },
          ].map((s, i) => (
            <Card key={s.title} className="p-4 flex gap-3">
              <span className="h-8 w-8 rounded-full bg-stone-100 text-stone-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-bold text-stone-900">{s.title}</p>
                <p className="text-xs text-stone-500 mt-0.5">{s.text}</p>
              </div>
            </Card>
          ))}
        </div>
        {drawers}
      </>
    )
  }

  const change = view.lastMonth > 0 ? (view.thisMonth - view.lastMonth) / view.lastMonth : null
  const attention = view.rows.filter((r) => r.rent.status === 'overdue' || r.rent.status === 'due-soon')

  return (
    <>
      <PageHeader
        eyebrow={format(parseDate(today), 'EEEE, d MMMM')}
        title={`${greeting()}`}
        description={`${plural(p.properties.length, 'property', 'properties')} · ${plural(p.units.length, 'unit')} · ${plural(view.rows.filter((r) => r.state === 'active').length, 'tenant')}`}
        actions={
          <>
            <Button variant="secondary" icon={Wallet} onClick={() => pay()}>
              Record payment
            </Button>
            <Button variant="secondary" icon={KeyRound} onClick={() => setDrawer('move-in')}>
              Move tenant in
            </Button>
            <Button icon={Plus} onClick={() => setDrawer('property')}>
              Add property
            </Button>
          </>
        }
      />
      {p.error && <ErrorNote message={p.error} />}

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4 sm:p-5 flex items-center gap-4">
          <Ring value={view.occupancy.rate} size={72}>
            <span className="text-base font-extrabold text-stone-900 tabular-nums">{percent(view.occupancy.rate)}</span>
          </Ring>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-stone-500">Occupancy</p>
            <p className="text-sm text-stone-900 mt-1">
              <span className="font-bold tabular-nums">{view.occupancy.counts.occupied}</span> of {view.occupancy.rentable} units let
            </p>
            <p className="text-xs text-stone-500 mt-0.5">{plural(view.occupancy.counts.vacant, 'vacant unit')}</p>
          </div>
        </Card>
        <StatCard
          label="Monthly rent roll"
          value={money(view.rentRoll)}
          icon={CircleDollarSign}
          hint={
            view.potential > 0 ? `${percent(view.rentRoll / view.potential)} of ${money(view.potential)} if full` : 'From active leases'
          }
        />
        <StatCard
          label={`Collected in ${format(parseDate(today), 'MMMM')}`}
          value={money(view.thisMonth)}
          icon={Wallet}
          tone="green"
          hint={change === null ? 'Rent and short-stay payments' : `${change >= 0 ? '▲' : '▼'} ${percent(Math.abs(change))} vs last month`}
        />
        <StatCard
          label="Outstanding rent"
          value={money(view.arrears)}
          icon={AlertTriangle}
          tone={view.arrears > 0 ? 'rose' : 'stone'}
          hint={view.overdueCount > 0 ? `${plural(view.overdueCount, 'tenant')} behind` : 'Everyone is up to date'}
        />
      </div>

      {/* Money + attention */}
      <div className="grid gap-4 xl:grid-cols-3 mt-4">
        <Card className="p-5 xl:col-span-2">
          <SectionTitle title="Collected" hint="Rent and short-stay income, last 6 months" />
          <CollectedChart data={view.collected} />
        </Card>
        <Card className="p-5">
          <SectionTitle
            title="Needs attention"
            hint={attention.length ? `${plural(attention.length, 'tenant')} to follow up` : undefined}
            action={
              <Link href={href('/rent')} className="text-xs font-semibold text-endeavour hover:underline inline-flex items-center gap-1">
                Rent <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          {attention.length === 0 && view.expiring.length === 0 && view.repairs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold text-stone-900">All clear</p>
              <p className="text-xs text-stone-500 mt-1">No overdue rent, expiring leases or open repairs.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 -my-1">
              {attention.slice(0, 5).map((r) => (
                <button
                  key={r.lease.id}
                  type="button"
                  onClick={() => pay(r.lease.id)}
                  className="w-full text-left hover:bg-stone-50 -mx-2 px-2 rounded-xl"
                >
                  <TenancyItem row={r} compact />
                </button>
              ))}
              {view.expiring.slice(0, 3).map((l) => (
                <div key={`exp-${l.id}`} className="flex items-center gap-3 py-2.5">
                  <span className="h-9 w-9 rounded-full bg-endeavour/10 text-endeavour flex items-center justify-center flex-shrink-0">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-900 truncate">Lease ends {shortDate(l.endDate)}</p>
                    <p className="text-xs text-stone-500 truncate">
                      {p.tenantById.get(l.tenantId)?.fullName} · {p.unitById.get(l.unitId)?.name} — renew or plan the move-out
                    </p>
                  </div>
                </div>
              ))}
              {view.repairs.slice(0, 3).map((m) => (
                <Link
                  key={`rep-${m.id}`}
                  href={href('/maintenance')}
                  className="flex items-center gap-3 py-2.5 hover:bg-stone-50 -mx-2 px-2 rounded-xl"
                >
                  <span className="h-9 w-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <Hammer className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-900 truncate">{m.title}</p>
                    <p className="text-xs text-stone-500 truncate">
                      {p.propertyById.get(m.propertyId)?.name}
                      {m.unitId ? ` · ${p.unitById.get(m.unitId)?.name}` : ''}
                    </p>
                  </div>
                  <Badge spec={PRIORITY[m.priority]} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Short stays */}
      {view.shortStayUnits.length > 0 && (
        <Card className="p-5 mt-4">
          <SectionTitle
            title="Short stays"
            hint={`${percent(view.stayRate.rate)} of nights booked this month · ${plural(view.departures, 'guest')} in house`}
            action={
              <Link
                href={href('/bookings')}
                className="text-xs font-semibold text-endeavour hover:underline inline-flex items-center gap-1"
              >
                Calendar <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          {view.arrivals.length === 0 ? (
            <p className="text-sm text-stone-500">No upcoming arrivals.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {view.arrivals.map((b) => (
                <div key={b.id} className="rounded-2xl border border-stone-200 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-endeavour">
                    <BedDouble className="h-3.5 w-3.5" /> {dayMonth(b.checkIn)} → {dayMonth(b.checkOut)}
                  </div>
                  <p className="text-sm font-bold text-stone-900 mt-1.5 truncate">{b.guestName}</p>
                  <p className="text-xs text-stone-500 truncate">
                    {p.unitById.get(b.unitId)?.name} · {money(bookingTotal(b))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Properties */}
      <div className="mt-8">
        <SectionTitle
          title="Properties"
          action={
            <Link
              href={href('/properties')}
              className="text-xs font-semibold text-endeavour hover:underline inline-flex items-center gap-1"
            >
              All properties <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {p.properties.map((prop) => (
            <PropertyCard key={prop.id} property={prop} stats={propertyStats(p, prop.id, today)} />
          ))}
        </div>
        <Card className="p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <DoorOpen className="h-4 w-4 text-stone-400" />
            <p className="text-sm font-semibold text-stone-900">All units</p>
          </div>
          <OccupancyBar counts={view.occupancy.counts} />
        </Card>
      </div>

      {drawers}
    </>
  )
}
