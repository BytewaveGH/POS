import type {
  BookingChannel,
  BookingStatus,
  MaintenancePriority,
  MaintenanceStatus,
  PaymentMethod,
  PropertyType,
  FacilityAccess,
  FacilityKey,
  RentalMode,
  UnitType,
} from './types'

export const PROPERTY_TYPES: { value: PropertyType; label: string; hint: string }[] = [
  { value: 'compound-house', label: 'Compound house', hint: 'Rooms around a shared yard' },
  { value: 'apartment-building', label: 'Apartment building', hint: 'Flats on one or more floors' },
  { value: 'short-stay', label: 'Short stay / Airbnb', hint: 'Nightly guest bookings' },
  { value: 'single-family', label: 'Single-family home', hint: 'One house, one household' },
  { value: 'commercial', label: 'Commercial', hint: 'Shops and offices' },
  { value: 'mixed-use', label: 'Mixed use', hint: 'Homes and shops together' },
]

// ── Room types ───────────────────────────────────────────────────────────────

export const FACILITIES: { key: FacilityKey; label: string; privateLabel: string; sharedLabel: string }[] = [
  { key: 'bathroom', label: 'Bathroom', privateLabel: 'Own bathroom', sharedLabel: 'Shared bathroom' },
  { key: 'toilet', label: 'Toilet', privateLabel: 'Own toilet', sharedLabel: 'Shared toilet' },
  { key: 'kitchen', label: 'Kitchen', privateLabel: 'Own kitchen', sharedLabel: 'Shared kitchen' },
  { key: 'electricity', label: 'Electricity meter', privateLabel: 'Own meter', sharedLabel: 'Shared meter' },
  { key: 'water', label: 'Water', privateLabel: 'Own water meter', sharedLabel: 'Shared water' },
]

export const FACILITY_ACCESS: { value: FacilityAccess; label: string }[] = [
  { value: 'private', label: 'Private' },
  { value: 'shared', label: 'Shared' },
  { value: 'none', label: 'None' },
]

export const ALL_PRIVATE: Record<FacilityKey, FacilityAccess> = {
  bathroom: 'private',
  toilet: 'private',
  kitchen: 'private',
  electricity: 'private',
  water: 'private',
}
export const ALL_SHARED: Record<FacilityKey, FacilityAccess> = {
  bathroom: 'shared',
  toilet: 'shared',
  kitchen: 'shared',
  electricity: 'shared',
  water: 'shared',
}

export const AMENITY_SUGGESTIONS = [
  'Porch',
  'Wardrobe',
  'Ceiling fan',
  'Tiled floor',
  'Air conditioning',
  'Parking',
  'Balcony',
  'Store room',
  'Wi-Fi',
  'Water tank',
]

// Common Ghanaian room types — offered as a starting point, never forced.
export const UNIT_TYPE_PRESETS: Omit<UnitType, 'id'>[] = [
  {
    name: 'Single room (shared facilities)',
    bedrooms: 1,
    livingRooms: 0,
    facilities: ALL_SHARED,
    amenities: [],
    rentalMode: 'long-term',
    defaultMonthlyRent: 250,
    defaultNightlyRate: 0,
    maxGuests: 0,
  },
  {
    name: 'Single room (self-contained)',
    bedrooms: 1,
    livingRooms: 0,
    facilities: { ...ALL_PRIVATE, kitchen: 'shared', electricity: 'shared', water: 'shared' },
    amenities: [],
    rentalMode: 'long-term',
    defaultMonthlyRent: 350,
    defaultNightlyRate: 0,
    maxGuests: 0,
  },
  {
    name: 'Chamber & hall (shared facilities)',
    bedrooms: 1,
    livingRooms: 1,
    facilities: ALL_SHARED,
    amenities: [],
    rentalMode: 'long-term',
    defaultMonthlyRent: 400,
    defaultNightlyRate: 0,
    maxGuests: 0,
  },
  {
    name: 'Chamber & hall (self-contained)',
    bedrooms: 1,
    livingRooms: 1,
    facilities: ALL_PRIVATE,
    amenities: [],
    rentalMode: 'long-term',
    defaultMonthlyRent: 600,
    defaultNightlyRate: 0,
    maxGuests: 0,
  },
  {
    name: '2-bedroom (self-contained)',
    bedrooms: 2,
    livingRooms: 1,
    facilities: ALL_PRIVATE,
    amenities: [],
    rentalMode: 'long-term',
    defaultMonthlyRent: 1000,
    defaultNightlyRate: 0,
    maxGuests: 0,
  },
  {
    name: 'Short-stay apartment',
    bedrooms: 2,
    livingRooms: 1,
    facilities: ALL_PRIVATE,
    amenities: ['Air conditioning', 'Wi-Fi'],
    rentalMode: 'short-stay',
    defaultMonthlyRent: 0,
    defaultNightlyRate: 450,
    maxGuests: 4,
  },
  {
    name: 'Shop',
    bedrooms: 0,
    livingRooms: 0,
    facilities: { bathroom: 'none', toilet: 'shared', kitchen: 'none', electricity: 'private', water: 'none' },
    amenities: [],
    rentalMode: 'long-term',
    defaultMonthlyRent: 800,
    defaultNightlyRate: 0,
    maxGuests: 0,
  },
]

// The fixed unit types used before room types were configurable; only for
// converting old browser-stored units (see data-source.ts).
export const LEGACY_UNIT_TYPE_LABELS: Record<string, string> = {
  'single-room': 'Single room',
  'chamber-and-hall': 'Chamber & hall',
  'two-bedroom': '2-bedroom',
  'three-bedroom': '3-bedroom',
  apartment: 'Apartment',
  studio: 'Studio',
  'entire-home': 'Entire home',
  shop: 'Shop',
  office: 'Office',
}

export const RENTAL_MODES: { value: RentalMode; label: string }[] = [
  { value: 'long-term', label: 'Long-term rent' },
  { value: 'short-stay', label: 'Short stay (nightly)' },
]

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'momo', label: 'Mobile money' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank transfer' },
]

export const BOOKING_CHANNELS: { value: BookingChannel; label: string }[] = [
  { value: 'direct', label: 'Direct' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'booking-com', label: 'Booking.com' },
  { value: 'other', label: 'Other' },
]

export const BOOKING_STATUSES: { value: BookingStatus; label: string }[] = [
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked-in', label: 'Checked in' },
  { value: 'checked-out', label: 'Checked out' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const MAINTENANCE_PRIORITIES: { value: MaintenancePriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export const MAINTENANCE_STATUSES: { value: MaintenanceStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
]

export const BILLING_CYCLES = [
  { value: 1, label: 'Monthly' },
  { value: 3, label: 'Every 3 months' },
  { value: 6, label: 'Every 6 months' },
  { value: 12, label: '1 year advance' },
  { value: 24, label: '2 years advance' },
]

const lookup =
  <T extends string | number>(list: { value: T; label: string }[]) =>
  (value: T | undefined | null) =>
    list.find((x) => x.value === value)?.label ?? String(value ?? '—')

export const propertyTypeLabel = lookup(PROPERTY_TYPES)
export const channelLabel = lookup(BOOKING_CHANNELS)
export const bookingStatusLabel = lookup(BOOKING_STATUSES)
export const paymentMethodLabel = lookup(PAYMENT_METHODS)
export const billingCycleLabel = (months: number) => BILLING_CYCLES.find((c) => c.value === months)?.label ?? `Every ${months} months`
