// Real-estate domain. Field names match the API contract in
// BACKEND_REQUIREMENTS.md §6 (ids are numbers, dates are YYYY-MM-DD strings).

export type PropertyType = 'compound-house' | 'apartment-building' | 'short-stay' | 'single-family' | 'commercial' | 'mixed-use'

// long-term = monthly rent with a lease; short-stay = nightly bookings (Airbnb style)
export type RentalMode = 'long-term' | 'short-stay'

// Stored unit flag. Occupancy itself is derived from leases/bookings, never stored.
export type UnitAvailability = 'available' | 'maintenance' | 'unlisted'

export interface Property {
  id: number
  name: string
  type: PropertyType
  address: string
  city: string
  region?: string
  description?: string
  coverImageUrl?: string
  createdAt?: string
}

// Facilities a room type can have, and whether the occupant has them to
// themselves, shares them with other units, or doesn't have them at all.
export type FacilityKey = 'bathroom' | 'toilet' | 'kitchen' | 'electricity' | 'water'
export type FacilityAccess = 'private' | 'shared' | 'none'

// Owner-defined room type, shared across all their properties — e.g.
// "Single room (shared facilities)" or "Chamber & hall (self-contained)".
export interface UnitType {
  id: number
  name: string
  description?: string
  bedrooms: number
  // "halls" / sitting rooms — a chamber & hall has 1 bedroom + 1 hall
  livingRooms: number
  facilities: Record<FacilityKey, FacilityAccess>
  // Free-form extras: porch, wardrobe, ceiling fan, parking…
  amenities: string[]
  // Defaults for new units of this type; each unit keeps its own price.
  rentalMode: RentalMode
  defaultMonthlyRent: number
  defaultNightlyRate: number
  maxGuests: number
}

export interface Unit {
  id: number
  propertyId: number
  // Room type (UnitType.id). null only for units whose type was deleted/never set.
  unitTypeId: number | null
  name: string
  rentalMode: RentalMode
  // long-term — the unit's own listed rent (a lease carries the agreed rent)
  monthlyRent: number
  // short-stay
  nightlyRate: number
  maxGuests: number
  availability: UnitAvailability
  notes?: string
}

export interface Tenant {
  id: number
  fullName: string
  phone: string
  email?: string
  idType?: 'ghana-card' | 'passport' | 'voter-id' | 'drivers-license' | 'other'
  idNumber?: string
  occupation?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  notes?: string
}

export interface Lease {
  id: number
  unitId: number
  tenantId: number
  startDate: string
  // Agreed end of the term (Ghana: usually 1–2 years). Optional for open-ended.
  endDate?: string
  monthlyRent: number
  // How many months are paid at a time (advance), e.g. 12 or 24.
  billingCycleMonths: number
  securityDeposit: number
  // Set on move-out; the lease no longer counts as active after this date.
  terminatedOn?: string
  notes?: string
}

export type PaymentMethod = 'cash' | 'momo' | 'bank'

export interface RentPayment {
  id: number
  leaseId: number
  amount: number
  paidOn: string
  method: PaymentMethod
  reference?: string
  note?: string
}

export type BookingStatus = 'inquiry' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled'
export type BookingChannel = 'direct' | 'airbnb' | 'booking-com' | 'other'

export interface Booking {
  id: number
  unitId: number
  guestName: string
  guestPhone?: string
  guests: number
  checkIn: string
  // Departure day (exclusive night).
  checkOut: string
  nightlyRate: number
  cleaningFee: number
  amountPaid: number
  channel: BookingChannel
  status: BookingStatus
  notes?: string
}

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent'
export type MaintenanceStatus = 'open' | 'in-progress' | 'resolved'

export interface MaintenanceRequest {
  id: number
  propertyId: number
  unitId?: number | null
  title: string
  description?: string
  priority: MaintenancePriority
  status: MaintenanceStatus
  cost: number
  reportedOn: string
  resolvedOn?: string
}

export type ResourceMap = {
  unitTypes: UnitType
  properties: Property
  units: Unit
  tenants: Tenant
  leases: Lease
  payments: RentPayment
  bookings: Booking
  maintenance: MaintenanceRequest
}

export type ResourceName = keyof ResourceMap
