// Joined, derived views over the portfolio. Pure — every screen uses these so
// the numbers agree everywhere.

import { activeLeaseFor, leaseState, occupancyBreakdown, rentSummary, unitOccupancy, type OccupancyStatus, type RentSummary } from './calc'
import type { Booking, Lease, MaintenanceRequest, Property, RentPayment, Tenant, Unit, UnitType } from './types'

export interface PortfolioData {
  unitTypes: UnitType[]
  properties: Property[]
  units: Unit[]
  tenants: Tenant[]
  leases: Lease[]
  payments: RentPayment[]
  bookings: Booking[]
  maintenance: MaintenanceRequest[]
}

export interface TenancyRow {
  lease: Lease
  tenant?: Tenant
  unit?: Unit
  unitType?: UnitType
  property?: Property
  rent: RentSummary
  state: ReturnType<typeof leaseState>
}

export const tenancyRows = (d: PortfolioData, on: string): TenancyRow[] => {
  const tenants = new Map(d.tenants.map((t) => [t.id, t]))
  const units = new Map(d.units.map((u) => [u.id, u]))
  const properties = new Map(d.properties.map((p) => [p.id, p]))
  const types = new Map(d.unitTypes.map((t) => [t.id, t]))
  return d.leases.map((lease) => {
    const unit = units.get(lease.unitId)
    return {
      lease,
      tenant: tenants.get(lease.tenantId),
      unit,
      unitType: unit && unit.unitTypeId !== null ? types.get(unit.unitTypeId) : undefined,
      property: unit ? properties.get(unit.propertyId) : undefined,
      rent: rentSummary(lease, d.payments, on),
      state: leaseState(lease, on),
    }
  })
}

// Most urgent first: overdue (largest first), due soon (soonest first), then the rest.
const RANK: Record<RentSummary['status'], number> = { overdue: 0, 'due-soon': 1, upcoming: 2, paid: 3, ended: 4 }
export const byUrgency = (a: TenancyRow, b: TenancyRow) =>
  RANK[a.rent.status] - RANK[b.rent.status] ||
  (a.rent.status === 'overdue' ? b.rent.arrears - a.rent.arrears : (a.rent.daysUntilDue ?? 9e9) - (b.rent.daysUntilDue ?? 9e9))

export interface UnitView {
  unit: Unit
  unitType?: UnitType
  status: OccupancyStatus
  lease?: Lease
  tenant?: Tenant
  rent?: RentSummary
  currentBooking?: Booking
  nextBooking?: Booking
}

export const unitViews = (d: PortfolioData, propertyId: number | null, on: string): UnitView[] => {
  const tenants = new Map(d.tenants.map((t) => [t.id, t]))
  const types = new Map(d.unitTypes.map((t) => [t.id, t]))
  return d.units
    .filter((u) => propertyId === null || u.propertyId === propertyId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((unit) => {
      const status = unitOccupancy(unit, d.leases, d.bookings, on)
      const lease = activeLeaseFor(unit.id, d.leases, on) ?? d.leases.find((l) => l.unitId === unit.id && leaseState(l, on) === 'upcoming')
      const live = d.bookings
        .filter((b) => b.unitId === unit.id && b.status !== 'cancelled' && b.status !== 'checked-out' && b.checkOut > on)
        .sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1))
      return {
        unit,
        unitType: unit.unitTypeId !== null ? types.get(unit.unitTypeId) : undefined,
        status,
        lease: unit.rentalMode === 'long-term' ? lease : undefined,
        tenant: lease && unit.rentalMode === 'long-term' ? tenants.get(lease.tenantId) : undefined,
        rent: lease && unit.rentalMode === 'long-term' ? rentSummary(lease, d.payments, on) : undefined,
        currentBooking: live.find((b) => b.checkIn <= on),
        nextBooking: live.find((b) => b.checkIn > on),
      }
    })
}

export interface PropertyStats {
  unitCount: number
  occupancy: ReturnType<typeof occupancyBreakdown>
  rentRoll: number
  potentialRent: number
  arrears: number
  openRepairs: number
}

export const propertyStats = (d: PortfolioData, propertyId: number, on: string): PropertyStats => {
  const units = d.units.filter((u) => u.propertyId === propertyId)
  const unitIds = new Set(units.map((u) => u.id))
  const leases = d.leases.filter((l) => unitIds.has(l.unitId))
  const active = leases.filter((l) => leaseState(l, on) === 'active')
  return {
    unitCount: units.length,
    occupancy: occupancyBreakdown(units, leases, d.bookings, on),
    rentRoll: active.reduce((s, l) => s + l.monthlyRent, 0),
    potentialRent: units
      .filter((u) => u.rentalMode === 'long-term' && u.availability !== 'unlisted')
      .reduce((s, u) => s + u.monthlyRent, 0),
    arrears: leases.reduce((s, l) => s + rentSummary(l, d.payments, on).arrears, 0),
    openRepairs: d.maintenance.filter((m) => m.propertyId === propertyId && m.status !== 'resolved').length,
  }
}
