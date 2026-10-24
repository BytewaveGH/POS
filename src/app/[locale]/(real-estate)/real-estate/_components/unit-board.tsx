'use client'

import React from 'react'
import { BedDouble, KeyRound, Plus, Sofa } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dayMonth, money, shortDate } from '../_logics/format'
import type { UnitView } from '../_logics/selectors'
import { Avatar, Badge, OCCUPANCY, RENT } from './ui'
import { FacilitySummaryPill } from './facilities'

// One tile per unit — the "floor plan" of a property at a glance.
const UnitTile = ({ view, onOpen, onMoveIn }: { view: UnitView; onOpen: () => void; onMoveIn?: () => void }) => {
  const { unit, unitType, status, tenant, rent, lease, currentBooking, nextBooking } = view
  const spec = OCCUPANCY[status]
  const isStay = unit.rentalMode === 'short-stay'
  const vacantLongTerm = !isStay && status === 'vacant'

  return (
    <div
      className={cn(
        'group relative text-left rounded-2xl border bg-white p-4 transition-all focus-within:ring-2 focus-within:ring-endeavour/40',
        'hover:shadow-[0_8px_24px_-14px_rgba(28,25,23,0.35)] hover:-translate-y-px',
        status === 'vacant' ? 'border-dashed border-amber-300 bg-amber-50/30' : 'border-stone-200'
      )}
    >
      {/* Whole tile opens the unit; the move-in button sits above it. */}
      <button type="button" onClick={onOpen} aria-label={`Open ${unit.name}`} className="absolute inset-0 rounded-2xl focus:outline-none" />
      {/* Status rail */}
      <span className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" style={{ background: spec.dot }} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold text-stone-900 truncate">{unit.name}</p>
          <p className={cn('text-[11px] truncate', unitType ? 'text-stone-500' : 'text-amber-700')}>
            {unitType?.name ?? 'No room type set'}
          </p>
        </div>
        <Badge spec={spec} />
      </div>

      <div className="mt-4 min-h-[44px]">
        {isStay ? (
          currentBooking ? (
            <div className="flex items-center gap-2">
              <Avatar name={currentBooking.guestName} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-900 truncate">{currentBooking.guestName}</p>
                <p className="text-[11px] text-stone-500">Leaves {dayMonth(currentBooking.checkOut)}</p>
              </div>
            </div>
          ) : nextBooking ? (
            <p className="text-xs text-stone-600">
              Next guest <span className="font-semibold text-stone-900">{nextBooking.guestName}</span> · {dayMonth(nextBooking.checkIn)}
            </p>
          ) : (
            <p className="text-xs text-stone-500">No upcoming bookings</p>
          )
        ) : tenant ? (
          <div className="flex items-center gap-2">
            <Avatar name={tenant.fullName} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{tenant.fullName}</p>
              <p className="text-[11px] text-stone-500 truncate">
                {rent?.status === 'upcoming' ? `Moves in ${shortDate(lease?.startDate)}` : `Paid through ${shortDate(rent?.paidThrough)}`}
              </p>
            </div>
          </div>
        ) : vacantLongTerm && onMoveIn ? (
          <button
            type="button"
            onClick={onMoveIn}
            className="relative z-10 inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-amber-300 text-xs font-bold text-amber-800 hover:bg-amber-50"
          >
            <KeyRound className="h-3.5 w-3.5" /> Move a tenant in
          </button>
        ) : (
          <p className="text-xs text-stone-500">{status === 'maintenance' ? 'Under repair' : 'Not listed'}</p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] text-stone-500 min-w-0">
          {unitType && (
            <>
              <span className="inline-flex items-center gap-1" title="Bedrooms">
                <BedDouble className="h-3.5 w-3.5" /> {unitType.bedrooms}
              </span>
              {unitType.livingRooms > 0 && (
                <span className="inline-flex items-center gap-1" title="Halls">
                  <Sofa className="h-3.5 w-3.5" /> {unitType.livingRooms}
                </span>
              )}
              <FacilitySummaryPill facilities={unitType.facilities} className="truncate" />
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {rent && rent.status !== 'paid' && rent.status !== 'upcoming' && <Badge spec={RENT[rent.status]} />}
          <span className="text-sm font-bold text-stone-900 tabular-nums">
            {isStay ? `${money(unit.nightlyRate)}` : money(lease?.monthlyRent ?? unit.monthlyRent)}
            <span className="text-[10px] font-medium text-stone-400">{isStay ? '/night' : '/mo'}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export const UnitBoard = ({
  views,
  onOpen,
  onMoveIn,
  onAdd,
}: {
  views: UnitView[]
  onOpen: (v: UnitView) => void
  // Left out for users who can't let units / add units.
  onMoveIn?: (v: UnitView) => void
  onAdd?: () => void
}) => (
  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
    {views.map((v) => (
      <UnitTile key={v.unit.id} view={v} onOpen={() => onOpen(v)} onMoveIn={onMoveIn && (() => onMoveIn(v))} />
    ))}
    {onAdd && (
      <button
        type="button"
        onClick={onAdd}
        className="rounded-2xl border border-dashed border-stone-300 min-h-[168px] flex flex-col items-center justify-center gap-2 text-sm font-semibold text-stone-500 hover:border-endeavour hover:text-endeavour transition-colors"
      >
        <Plus className="h-5 w-5" /> Add unit
      </button>
    )}
  </div>
)
