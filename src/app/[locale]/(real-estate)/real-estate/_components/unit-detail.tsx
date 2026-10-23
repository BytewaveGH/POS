'use client'

import React from 'react'
import { CalendarPlus, KeyRound, LogOut, Pencil, Phone, Trash2, Wallet } from 'lucide-react'
import { billingCycleLabel, channelLabel, paymentMethodLabel } from '../_logics/constants'
import { bookingTotal, layoutLabel, leaseState, rentSummary, todayISO } from '../_logics/calc'
import { dayMonth, money, shortDate } from '../_logics/format'
import { usePortfolio } from '../_logics/hooks'
import type { Lease } from '../_logics/types'
import type { UnitView } from '../_logics/selectors'
import { Avatar, Badge, BOOKING, Button, OCCUPANCY, RENT } from './ui'
import { Drawer } from './form'
import { FacilityList } from './facilities'

const Fact = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-xl bg-stone-50 px-3 py-2.5">
    <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{label}</p>
    <p className="text-sm font-semibold text-stone-900 mt-0.5 tabular-nums">{value}</p>
  </div>
)

export const UnitDetail = ({
  view,
  onOpenChange,
  onEdit,
  onDelete,
  onMoveIn,
  onMoveOut,
  onPay,
  onBook,
}: {
  view: UnitView | null
  onOpenChange: (o: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onMoveIn: () => void
  onMoveOut: (lease: Lease) => void
  onPay: (leaseId: number) => void
  onBook: () => void
}) => {
  const p = usePortfolio()
  const today = todayISO()
  if (!view) return null
  const { unit, unitType, status, lease, tenant, rent } = view
  const isStay = unit.rentalMode === 'short-stay'
  const history = p.leases.filter((l) => l.unitId === unit.id && l.id !== lease?.id).sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
  const payments = lease ? p.payments.filter((x) => x.leaseId === lease.id).sort((a, b) => (a.paidOn < b.paidOn ? 1 : -1)) : []
  const stays = p.bookings
    .filter((b) => b.unitId === unit.id)
    .sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1))
    .slice(0, 8)

  return (
    <Drawer
      open={!!view}
      onOpenChange={onOpenChange}
      title={unit.name}
      description={`${unitType?.name ?? 'No room type set'} · ${p.propertyById.get(unit.propertyId)?.name ?? ''}`}
      footer={
        <>
          <Button variant="ghost" icon={Trash2} onClick={onDelete} className="mr-auto text-rose-600 hover:bg-rose-50">
            Delete
          </Button>
          <Button variant="secondary" icon={Pencil} onClick={onEdit}>
            Edit unit
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Badge spec={OCCUPANCY[status]} />
          {isStay ? (
            <Button size="sm" icon={CalendarPlus} onClick={onBook}>
              New booking
            </Button>
          ) : !lease && status !== 'maintenance' ? (
            <Button size="sm" icon={KeyRound} onClick={onMoveIn}>
              Move a tenant in
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Fact
            label={isStay ? 'Per night' : 'Rent / month'}
            value={money(isStay ? unit.nightlyRate : (lease?.monthlyRent ?? unit.monthlyRent))}
          />
          <Fact label="Layout" value={unitType ? layoutLabel(unitType) : '—'} />
          <Fact label="Max guests" value={isStay ? unit.maxGuests : '—'} />
        </div>

        {unitType ? (
          <section className="flex flex-col gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">Facilities</p>
            <FacilityList facilities={unitType.facilities} />
            {unitType.amenities.length > 0 && <p className="text-xs text-stone-500">{unitType.amenities.join(' · ')}</p>}
          </section>
        ) : (
          <p className="text-sm text-amber-700">This unit has no room type yet — edit it to choose one.</p>
        )}

        {/* Current tenant */}
        {!isStay && lease && tenant && rent && (
          <section className="rounded-2xl border border-stone-200 p-4">
            <div className="flex items-center gap-3">
              <Avatar name={tenant.fullName} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-stone-900 truncate">{tenant.fullName}</p>
                <p className="text-xs text-stone-500">
                  Since {shortDate(lease.startDate)}
                  {lease.endDate ? ` · until ${shortDate(lease.endDate)}` : ''}
                </p>
              </div>
              <a
                href={`tel:${tenant.phone.replace(/\s+/g, '')}`}
                aria-label={`Call ${tenant.fullName}`}
                className="h-10 w-10 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:text-endeavour hover:border-endeavour/40"
              >
                <Phone className="h-4 w-4" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Fact label="Pays" value={billingCycleLabel(lease.billingCycleMonths)} />
              <Fact label="Paid through" value={shortDate(rent.paidThrough)} />
              <Fact label="Total paid" value={money(rent.totalPaid)} />
              <Fact
                label={rent.arrears > 0 ? 'Owed now' : 'Next due'}
                value={
                  rent.arrears > 0 ? (
                    <span className="text-rose-600">{money(rent.arrears)}</span>
                  ) : rent.nextDueDate ? (
                    `${money(rent.nextDueAmount)} · ${dayMonth(rent.nextDueDate)}`
                  ) : (
                    '—'
                  )
                }
              />
            </div>
            <div className="flex items-center justify-between mt-4">
              <Badge spec={RENT[rent.status]} />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon={LogOut} onClick={() => onMoveOut(lease)}>
                  Move out
                </Button>
                <Button size="sm" icon={Wallet} onClick={() => onPay(lease.id)}>
                  Record payment
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Payments for the current lease */}
        {payments.length > 0 && (
          <section>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400 mb-2">Payments</p>
            <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200">
              {payments.map((x) => (
                <div key={x.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <p className="font-semibold text-stone-900 tabular-nums">{money(x.amount)}</p>
                    <p className="text-xs text-stone-500">
                      {shortDate(x.paidOn)} · {paymentMethodLabel(x.method)}
                      {x.reference ? ` · ${x.reference}` : ''}
                    </p>
                  </div>
                  {x.note && <p className="text-xs text-stone-400 max-w-[45%] truncate">{x.note}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Short-stay history */}
        {isStay && (
          <section>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400 mb-2">Bookings</p>
            {stays.length === 0 ? (
              <p className="text-sm text-stone-500">No bookings yet.</p>
            ) : (
              <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200">
                {stays.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">{b.guestName}</p>
                      <p className="text-xs text-stone-500">
                        {dayMonth(b.checkIn)} → {dayMonth(b.checkOut)} · {channelLabel(b.channel)} · {money(bookingTotal(b))}
                      </p>
                    </div>
                    <Badge spec={BOOKING[b.status]} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Previous tenants */}
        {history.length > 0 && (
          <section>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400 mb-2">Tenancy history</p>
            <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200">
              {history.map((l) => {
                const s = rentSummary(l, p.payments, today)
                return (
                  <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">{p.tenantById.get(l.tenantId)?.fullName ?? 'Tenant'}</p>
                      <p className="text-xs text-stone-500">
                        {shortDate(l.startDate)} –{' '}
                        {l.terminatedOn ? shortDate(l.terminatedOn) : leaseState(l, today) === 'upcoming' ? 'upcoming' : 'now'}
                      </p>
                    </div>
                    <Badge spec={RENT[s.status]} />
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {unit.notes && (
          <section>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400 mb-2">Notes</p>
            <p className="text-sm text-stone-600 whitespace-pre-line">{unit.notes}</p>
          </section>
        )}
      </div>
    </Drawer>
  )
}
