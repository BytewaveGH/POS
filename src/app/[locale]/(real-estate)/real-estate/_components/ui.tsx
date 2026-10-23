'use client'

/* eslint-disable @next/next/no-img-element -- property photos are arbitrary owner URLs */
import React, { useState } from 'react'
import { CheckCircle2, CircleDashed, Clock, Hammer, Home, KeyRound, MinusCircle, CalendarClock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BarChart, type BadgeSpec } from '@/components/kit/ui'
import type { OccupancyStatus, RentStatus } from '../_logics/calc'
import type { BookingStatus, MaintenancePriority, MaintenanceStatus } from '../_logics/types'
import { initials, money } from '../_logics/format'

// Generic pieces live in the shared kit; re-exported so module imports stay put.
export {
  PageHeader,
  Card,
  SectionTitle,
  Button,
  StatCard,
  Badge,
  Ring,
  Avatar,
  EmptyState,
  Skeleton,
  LoadingGrid,
  ErrorNote,
} from '@/components/kit/ui'

export const OCCUPANCY: Record<OccupancyStatus, BadgeSpec> = {
  occupied: { label: 'Occupied', icon: KeyRound, className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', dot: '#10B981' },
  reserved: { label: 'Reserved', icon: CalendarClock, className: 'bg-endeavour/10 text-endeavour ring-endeavour/15', dot: '#0865AC' },
  vacant: { label: 'Vacant', icon: CircleDashed, className: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: '#F59E0B' },
  maintenance: { label: 'Maintenance', icon: Hammer, className: 'bg-rose-50 text-rose-700 ring-rose-600/15', dot: '#E11D48' },
  unlisted: { label: 'Unlisted', icon: MinusCircle, className: 'bg-stone-100 text-stone-500 ring-stone-400/20', dot: '#D6D3D1' },
}

export const RENT: Record<RentStatus, BadgeSpec> = {
  paid: { label: 'Paid up', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', dot: '#10B981' },
  'due-soon': { label: 'Due soon', icon: Clock, className: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: '#F59E0B' },
  overdue: { label: 'Overdue', icon: AlertTriangle, className: 'bg-rose-50 text-rose-700 ring-rose-600/15', dot: '#E11D48' },
  upcoming: { label: 'Moving in', icon: CalendarClock, className: 'bg-endeavour/10 text-endeavour ring-endeavour/15', dot: '#0865AC' },
  ended: { label: 'Moved out', icon: MinusCircle, className: 'bg-stone-100 text-stone-500 ring-stone-400/20', dot: '#A8A29E' },
}

export const BOOKING: Record<BookingStatus, BadgeSpec> = {
  inquiry: { label: 'Inquiry', icon: CircleDashed, className: 'bg-stone-100 text-stone-600 ring-stone-400/20', dot: '#A8A29E' },
  confirmed: { label: 'Confirmed', icon: CalendarClock, className: 'bg-endeavour/10 text-endeavour ring-endeavour/15', dot: '#0865AC' },
  'checked-in': { label: 'Checked in', icon: KeyRound, className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', dot: '#10B981' },
  'checked-out': { label: 'Checked out', icon: CheckCircle2, className: 'bg-stone-100 text-stone-500 ring-stone-400/20', dot: '#78716C' },
  cancelled: { label: 'Cancelled', icon: MinusCircle, className: 'bg-rose-50 text-rose-600 ring-rose-600/10', dot: '#E11D48' },
}

export const PRIORITY: Record<MaintenancePriority, BadgeSpec> = {
  low: { label: 'Low', icon: MinusCircle, className: 'bg-stone-100 text-stone-600 ring-stone-400/20', dot: '#A8A29E' },
  medium: { label: 'Medium', icon: Clock, className: 'bg-endeavour/10 text-endeavour ring-endeavour/15', dot: '#0865AC' },
  high: { label: 'High', icon: AlertTriangle, className: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: '#F59E0B' },
  urgent: { label: 'Urgent', icon: AlertTriangle, className: 'bg-rose-50 text-rose-700 ring-rose-600/15', dot: '#E11D48' },
}

export const MAINTENANCE: Record<MaintenanceStatus, BadgeSpec> = {
  open: { label: 'Open', icon: CircleDashed, className: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: '#F59E0B' },
  'in-progress': { label: 'In progress', icon: Hammer, className: 'bg-endeavour/10 text-endeavour ring-endeavour/15', dot: '#0865AC' },
  resolved: { label: 'Resolved', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', dot: '#10B981' },
}

const ORDER: OccupancyStatus[] = ['occupied', 'reserved', 'vacant', 'maintenance']

export const OccupancyBar = ({
  counts,
  showLegend = true,
  className,
}: {
  counts: Record<OccupancyStatus, number>
  showLegend?: boolean
  className?: string
}) => {
  const total = ORDER.reduce((s, k) => s + counts[k], 0)
  return (
    <div className={className}>
      <div
        className="flex h-2.5 w-full gap-[2px] rounded-full overflow-hidden bg-stone-100"
        role="img"
        aria-label={ORDER.map((k) => `${counts[k]} ${OCCUPANCY[k].label.toLowerCase()}`).join(', ')}
      >
        {total > 0 &&
          ORDER.filter((k) => counts[k] > 0).map((k) => (
            <div
              key={k}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(counts[k] / total) * 100}%`, background: OCCUPANCY[k].dot }}
              title={`${OCCUPANCY[k].label}: ${counts[k]}`}
            />
          ))}
      </div>
      {showLegend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
          {ORDER.filter((k) => counts[k] > 0 || k === 'occupied' || k === 'vacant').map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-xs text-stone-600">
              <span className="h-2 w-2 rounded-full" style={{ background: OCCUPANCY[k].dot }} />
              {OCCUPANCY[k].label} <span className="font-semibold text-stone-900 tabular-nums">{counts[k]}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Circular gauge for a single headline ratio.

export const PropertyCover = ({ src, name, className }: { src?: string; name: string; className?: string }) => {
  const [failed, setFailed] = useState(false)
  if (src && !failed) return <img src={src} alt={name} onError={() => setFailed(true)} className={cn('object-cover', className)} />
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br from-endeavour via-[#0A5795] to-veniceBlue', className)} aria-hidden>
      <svg className="absolute inset-0 h-full w-full opacity-[0.13]" preserveAspectRatio="none">
        <defs>
          <pattern id="re-grid" width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M22 0H0V22" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#re-grid)" />
      </svg>
      <Home className="absolute -right-3 -bottom-4 h-28 w-28 text-white/10" strokeWidth={1.25} />
      <span className="absolute left-4 bottom-3 text-3xl font-extrabold text-white/90 tracking-tight">{initials(name)}</span>
    </div>
  )
}

// Rent + short-stay income per month.
export const CollectedChart = ({ data }: { data: { month: string; label: string; amount: number }[] }) => (
  <BarChart
    ariaLabel="Collected per month"
    data={data.map((d) => ({ key: d.month, label: d.label, value: d.amount }))}
    format={(n, opts) => money(n, opts)}
  />
)
