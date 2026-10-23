// Pure real-estate calculations. Everything here takes "today" as an argument
// so it's deterministic and testable.

import { addDays, addMonths, differenceInCalendarDays, differenceInMonths, format, startOfMonth, subMonths } from 'date-fns'
import type { Booking, FacilityAccess, FacilityKey, Lease, MaintenanceRequest, RentPayment, RentalMode, Unit, UnitType } from './types'

// ── Dates (YYYY-MM-DD, local time — never UTC-shifted) ───────────────────────

export const parseDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd')
export const todayISO = () => toISODate(new Date())

// ── Leases ───────────────────────────────────────────────────────────────────

export type LeaseState = 'upcoming' | 'active' | 'ended'

export const leaseState = (lease: Lease, on: string): LeaseState => {
  if (lease.terminatedOn && lease.terminatedOn <= on) return 'ended'
  if (lease.startDate > on) return 'upcoming'
  return 'active'
}

export const termMonths = (lease: Pick<Lease, 'startDate' | 'endDate'>): number | null => {
  if (!lease.endDate) return null
  const start = parseDate(lease.startDate)
  const end = parseDate(lease.endDate)
  const whole = differenceInMonths(end, start)
  // A part month at the end counts as a month of rent.
  return addMonths(start, whole) < end ? whole + 1 : Math.max(whole, 1)
}

// ── Rent status ──────────────────────────────────────────────────────────────
//
// Rent is charged per billing cycle (1, 3, 6, 12 or 24 months — Ghana
// landlords commonly take 1–2 years in advance). Each cycle is due on the day
// it starts. A lease with an end date is never charged beyond its term.

export type RentStatus = 'paid' | 'due-soon' | 'overdue' | 'upcoming' | 'ended'

export interface RentSummary {
  status: RentStatus
  totalPaid: number
  // Amount that should have been paid by now (cycles already started).
  expected: number
  // Unpaid amount for cycles already due.
  arrears: number
  // Date the payments so far cover rent up to.
  paidThrough: string
  // When the next unpaid cycle is/was due, and how much it is.
  nextDueDate: string | null
  nextDueAmount: number
  daysOverdue: number
  daysUntilDue: number | null
}

export const DUE_SOON_DAYS = 30

export const rentSummary = (lease: Lease, payments: RentPayment[], on: string): RentSummary => {
  const rent = Math.max(0, lease.monthlyRent)
  const cycle = Math.max(1, Math.round(lease.billingCycleMonths || 1))
  const start = parseDate(lease.startDate)
  const totalPaid = payments.filter((p) => p.leaseId === lease.id).reduce((s, p) => s + p.amount, 0)
  const paidMonths = rent > 0 ? totalPaid / rent : Infinity
  const fullMonths = Math.floor(paidMonths)
  const paidThrough = Number.isFinite(paidMonths)
    ? toISODate(addDays(addMonths(start, fullMonths), Math.round((paidMonths - fullMonths) * 30)))
    : (lease.endDate ?? lease.startDate)
  const term = termMonths(lease)
  const state = leaseState(lease, on)

  const base = { totalPaid, paidThrough, daysOverdue: 0, daysUntilDue: null as number | null }
  if (state === 'upcoming') {
    const due = Math.max(0, Math.min(cycle, term ?? cycle) * rent - totalPaid)
    return {
      ...base,
      status: 'upcoming',
      expected: 0,
      arrears: 0,
      nextDueDate: due > 0 ? lease.startDate : null,
      nextDueAmount: due,
      daysUntilDue: differenceInCalendarDays(start, parseDate(on)),
    }
  }

  // Evaluate an ended lease as of its move-out day.
  const evalDate = parseDate(state === 'ended' && lease.terminatedOn ? lease.terminatedOn : on)
  const monthsElapsed = differenceInMonths(evalDate, start)
  const cyclesStarted = Math.floor(monthsElapsed / cycle) + 1
  const expectedMonths = Math.min(cyclesStarted * cycle, term ?? Infinity)
  const expected = expectedMonths * rent
  const arrears = Math.max(0, Math.round((expected - totalPaid) * 100) / 100)

  if (arrears > 0) {
    // The earliest cycle that isn't fully paid.
    const unpaidCycle = Math.floor(fullMonths / cycle)
    const dueDate = addMonths(start, unpaidCycle * cycle)
    return {
      ...base,
      status: 'overdue',
      expected,
      arrears,
      nextDueDate: toISODate(dueDate),
      nextDueAmount: arrears,
      daysOverdue: Math.max(0, differenceInCalendarDays(evalDate, dueDate)),
    }
  }

  if (state === 'ended') return { ...base, status: 'ended', expected, arrears: 0, nextDueDate: null, nextDueAmount: 0 }

  // Next cycle — unless the term is fully covered.
  const nextCycleMonths = cyclesStarted * cycle
  if (term !== null && nextCycleMonths >= term) {
    return { ...base, status: 'paid', expected, arrears: 0, nextDueDate: null, nextDueAmount: 0 }
  }
  const nextDue = addMonths(start, nextCycleMonths)
  const nextAmount = Math.max(0, Math.min(nextCycleMonths + cycle, term ?? Infinity) * rent - totalPaid)
  const daysUntilDue = differenceInCalendarDays(nextDue, parseDate(on))
  return {
    ...base,
    status: nextAmount > 0 && daysUntilDue <= DUE_SOON_DAYS ? 'due-soon' : 'paid',
    expected,
    arrears: 0,
    nextDueDate: nextAmount > 0 ? toISODate(nextDue) : null,
    nextDueAmount: nextAmount,
    daysUntilDue: nextAmount > 0 ? daysUntilDue : null,
  }
}

// ── Occupancy ────────────────────────────────────────────────────────────────

export type OccupancyStatus = 'occupied' | 'reserved' | 'vacant' | 'maintenance' | 'unlisted'

const LIVE_BOOKING = new Set(['confirmed', 'checked-in'])

export const activeLeaseFor = (unitId: number, leases: Lease[], on: string) =>
  leases.find((l) => l.unitId === unitId && leaseState(l, on) === 'active')

export const currentBookingFor = (unitId: number, bookings: Booking[], on: string) =>
  bookings.find((b) => b.unitId === unitId && LIVE_BOOKING.has(b.status) && b.checkIn <= on && on < b.checkOut)

export const unitOccupancy = (unit: Unit, leases: Lease[], bookings: Booking[], on: string): OccupancyStatus => {
  if (unit.availability === 'maintenance') return 'maintenance'
  if (unit.availability === 'unlisted') return 'unlisted'
  if (unit.rentalMode === 'short-stay') {
    if (currentBookingFor(unit.id, bookings, on)) return 'occupied'
    const soon = toISODate(addDays(parseDate(on), 7))
    const upcoming = bookings.some((b) => b.unitId === unit.id && b.status === 'confirmed' && b.checkIn > on && b.checkIn <= soon)
    return upcoming ? 'reserved' : 'vacant'
  }
  if (activeLeaseFor(unit.id, leases, on)) return 'occupied'
  if (leases.some((l) => l.unitId === unit.id && leaseState(l, on) === 'upcoming')) return 'reserved'
  return 'vacant'
}

export const occupancyBreakdown = (units: Unit[], leases: Lease[], bookings: Booking[], on: string) => {
  const counts: Record<OccupancyStatus, number> = { occupied: 0, reserved: 0, vacant: 0, maintenance: 0, unlisted: 0 }
  for (const u of units) counts[unitOccupancy(u, leases, bookings, on)]++
  const rentable = units.length - counts.unlisted
  return { counts, rentable, rate: rentable > 0 ? counts.occupied / rentable : 0 }
}

// ── Short stays ──────────────────────────────────────────────────────────────

export const bookingNights = (b: Pick<Booking, 'checkIn' | 'checkOut'>) =>
  Math.max(0, differenceInCalendarDays(parseDate(b.checkOut), parseDate(b.checkIn)))

export const bookingTotal = (b: Pick<Booking, 'checkIn' | 'checkOut' | 'nightlyRate' | 'cleaningFee'>) =>
  bookingNights(b) * b.nightlyRate + (b.cleaningFee || 0)

// Nights in [from, to) covered by bookings of the given units ÷ available nights.
export const shortStayOccupancy = (units: Unit[], bookings: Booking[], from: string, to: string) => {
  const ids = new Set(units.filter((u) => u.rentalMode === 'short-stay' && u.availability === 'available').map((u) => u.id))
  const days = Math.max(0, differenceInCalendarDays(parseDate(to), parseDate(from)))
  let booked = 0
  for (const b of bookings) {
    if (!ids.has(b.unitId) || b.status === 'cancelled' || b.status === 'inquiry') continue
    const s = b.checkIn > from ? b.checkIn : from
    const e = b.checkOut < to ? b.checkOut : to
    booked += Math.max(0, differenceInCalendarDays(parseDate(e), parseDate(s)))
  }
  const available = ids.size * days
  return { booked, available, rate: available > 0 ? booked / available : 0 }
}

// Overlapping live bookings for a unit (double-booking guard).
export const findBookingConflict = (draft: Pick<Booking, 'unitId' | 'checkIn' | 'checkOut'> & { id?: number }, bookings: Booking[]) =>
  bookings.find(
    (b) =>
      b.id !== draft.id &&
      b.unitId === draft.unitId &&
      b.status !== 'cancelled' &&
      b.status !== 'checked-out' &&
      b.checkIn < draft.checkOut &&
      draft.checkIn < b.checkOut
  )

// ── Money over time ──────────────────────────────────────────────────────────

// Collected per month for the last `count` months (rent payments by paid date,
// short-stay payments by check-in month), oldest first.
export const collectedByMonth = (payments: RentPayment[], bookings: Booking[], on: string, count = 6) => {
  const months = Array.from({ length: count }, (_, i) => startOfMonth(subMonths(parseDate(on), count - 1 - i)))
  const key = (d: Date) => format(d, 'yyyy-MM')
  const totals = new Map(months.map((m) => [key(m), 0]))
  for (const p of payments) {
    const k = p.paidOn.slice(0, 7)
    if (totals.has(k)) totals.set(k, totals.get(k)! + p.amount)
  }
  for (const b of bookings) {
    const k = b.checkIn.slice(0, 7)
    if (b.status !== 'cancelled' && totals.has(k)) totals.set(k, totals.get(k)! + (b.amountPaid || 0))
  }
  return months.map((m) => ({ month: key(m), label: format(m, 'MMM'), amount: totals.get(key(m)) ?? 0 }))
}

export const leasesExpiringWithin = (leases: Lease[], on: string, days: number) => {
  const until = toISODate(addDays(parseDate(on), days))
  return leases
    .filter((l) => leaseState(l, on) === 'active' && l.endDate && l.endDate >= on && l.endDate <= until)
    .sort((a, b) => (a.endDate! < b.endDate! ? -1 : 1))
}

export const openMaintenance = (items: MaintenanceRequest[]) => items.filter((m) => m.status !== 'resolved')

// ── Room types ───────────────────────────────────────────────────────────────

const CORE_FACILITIES: FacilityKey[] = ['bathroom', 'toilet', 'kitchen']

export interface FacilitySummary {
  // Own bathroom, toilet and kitchen.
  selfContained: boolean
  // Short label: "Self-contained", "Shared facilities", "Own bath & toilet · shared kitchen"…
  label: string
  privateKeys: FacilityKey[]
  sharedKeys: FacilityKey[]
}

export const facilitySummary = (facilities: Record<FacilityKey, FacilityAccess> | undefined): FacilitySummary => {
  const f = facilities ?? ({} as Record<FacilityKey, FacilityAccess>)
  const keys = Object.keys(f) as FacilityKey[]
  const privateKeys = keys.filter((k) => f[k] === 'private')
  const sharedKeys = keys.filter((k) => f[k] === 'shared')
  const core = CORE_FACILITIES.map((k) => f[k] ?? 'none')
  const selfContained = core.every((a) => a === 'private')
  let label: string
  if (selfContained) label = 'Self-contained'
  else if (core.every((a) => a === 'shared')) label = 'Shared facilities'
  else if (core.every((a) => a === 'none')) label = 'No facilities'
  else {
    const name = { bathroom: 'bath', toilet: 'toilet', kitchen: 'kitchen' } as Record<string, string>
    const own = CORE_FACILITIES.filter((k) => f[k] === 'private').map((k) => name[k])
    const shared = CORE_FACILITIES.filter((k) => f[k] === 'shared').map((k) => name[k])
    label = [own.length ? `Own ${own.join(' & ')}` : '', shared.length ? `shared ${shared.join(' & ')}` : ''].filter(Boolean).join(' · ')
  }
  return { selfContained, label, privateKeys, sharedKeys }
}

// "1 bedroom + hall", "2 bedrooms + hall", "Single room"…
export const layoutLabel = (t: Pick<UnitType, 'bedrooms' | 'livingRooms'>) => {
  if (t.bedrooms === 0 && t.livingRooms === 0) return 'Open space'
  const beds = t.bedrooms === 1 ? '1 bedroom' : `${t.bedrooms} bedrooms`
  if (t.livingRooms === 0) return t.bedrooms === 1 ? 'Single room' : beds
  return `${beds} + ${t.livingRooms === 1 ? 'hall' : `${t.livingRooms} halls`}`
}

export const unitsUsingType = (unitTypeId: number, units: Unit[]) => units.filter((u) => u.unitTypeId === unitTypeId)

// ── Quick-add units ──────────────────────────────────────────────────────────

export interface UnitGroupDraft {
  unitTypeId: number | null
  count: number
  rentalMode: RentalMode
  monthlyRent: number
  nightlyRate: number
  maxGuests: number
}

// Pre-fills a group from a room type's defaults.
export const groupFromType = (t: UnitType, count = 1): UnitGroupDraft => ({
  unitTypeId: t.id,
  count,
  rentalMode: t.rentalMode,
  monthlyRent: t.defaultMonthlyRent,
  nightlyRate: t.defaultNightlyRate,
  maxGuests: t.maxGuests,
})

// e.g. [2 × Single room, 7 × Chamber & hall (self-contained)] → Room 1 … Room 9.
export const generateUnits = (groups: UnitGroupDraft[], propertyId: number, prefix = 'Room', startAt = 1): Omit<Unit, 'id'>[] => {
  const out: Omit<Unit, 'id'>[] = []
  let n = startAt
  for (const g of groups) {
    for (let i = 0; i < Math.max(0, Math.floor(g.count)); i++) {
      out.push({
        propertyId,
        unitTypeId: g.unitTypeId,
        name: `${prefix} ${n++}`,
        rentalMode: g.rentalMode,
        monthlyRent: g.rentalMode === 'long-term' ? g.monthlyRent : 0,
        nightlyRate: g.rentalMode === 'short-stay' ? g.nightlyRate : 0,
        maxGuests: g.rentalMode === 'short-stay' ? Math.max(1, g.maxGuests) : 0,
        availability: 'available',
      })
    }
  }
  return out
}
