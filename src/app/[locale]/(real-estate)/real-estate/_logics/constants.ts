import type {
  BookingChannel,
  BookingStatus,
  MaintenancePriority,
  MaintenanceStatus,
  PaymentMethod,
  PropertyType,
  DocumentCategory,
  ExpenseCategory,
  FacilityAccess,
  FacilityKey,
  LandSizeUnit,
  LandStage,
  LandTitleStatus,
  PhaseStatus,
  ProjectStatus,
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
  { value: 'land', label: 'Land', hint: 'Plots you own or are developing' },
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

// ── Land ─────────────────────────────────────────────────────────────────────

export const LAND_SIZE_UNITS: { value: LandSizeUnit; label: string; short: string }[] = [
  { value: 'plots', label: 'Plots', short: 'plot' },
  { value: 'acres', label: 'Acres', short: 'acre' },
  { value: 'hectares', label: 'Hectares', short: 'ha' },
  { value: 'sqm', label: 'Square metres', short: 'm²' },
  { value: 'sqft', label: 'Square feet', short: 'ft²' },
]

export const LAND_STAGES: { value: LandStage; label: string; hint: string }[] = [
  { value: 'bare', label: 'Bare land', hint: 'Bought, nothing built yet' },
  { value: 'fenced', label: 'Fenced', hint: 'Wall or fence around it' },
  { value: 'under-construction', label: 'Under construction', hint: 'Building in progress' },
  { value: 'completed', label: 'Completed', hint: 'Building finished' },
]

export const LAND_TITLE_STATUSES: { value: LandTitleStatus; label: string }[] = [
  { value: 'none', label: 'No documents yet' },
  { value: 'allocation-note', label: 'Allocation note' },
  { value: 'indenture', label: 'Indenture' },
  { value: 'site-plan', label: 'Indenture + site plan' },
  { value: 'registered', label: 'Registered at Lands Commission' },
  { value: 'title-certificate', label: 'Land title certificate' },
]

// ── Development ──────────────────────────────────────────────────────────────

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'on-hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
]

export const PHASE_STATUSES: { value: PhaseStatus; label: string }[] = [
  { value: 'not-started', label: 'Not started' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
]

// A typical Ghanaian build, in order. Offered as a starting point; every
// phase can be renamed, removed or added to.
export const STANDARD_PHASES = [
  'Land documentation',
  'Site clearing',
  'Fencing',
  'Foundation (to DPC)',
  'Blocks to lintel',
  'Lintel & columns',
  'Roofing',
  'Plastering & screeding',
  'Electrical',
  'Plumbing',
  'Doors & windows',
  'Tiling & flooring',
  'Painting & finishing',
  'External works',
]

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'materials', label: 'Materials' },
  { value: 'labour', label: 'Labour' },
  { value: 'equipment', label: 'Equipment hire' },
  { value: 'transport', label: 'Transport' },
  { value: 'permits', label: 'Permits & fees' },
  { value: 'professional', label: 'Professional fees' },
  { value: 'land', label: 'Land & documentation' },
  { value: 'other', label: 'Other' },
]

// Common materials and how they're bought — picked from a list to fill the
// description and unit.
export const MATERIAL_SUGGESTIONS: { name: string; unit: string }[] = [
  { name: 'Cement', unit: 'bags' },
  { name: 'Sand', unit: 'trips' },
  { name: 'Stones / chippings', unit: 'trips' },
  { name: 'Sandcrete blocks (6 inch)', unit: 'pieces' },
  { name: 'Sandcrete blocks (5 inch)', unit: 'pieces' },
  { name: 'Iron rods', unit: 'lengths' },
  { name: 'BRC mesh', unit: 'rolls' },
  { name: 'Binding wire', unit: 'rolls' },
  { name: 'Timber / boards', unit: 'pieces' },
  { name: 'Roofing sheets', unit: 'bundles' },
  { name: 'Water', unit: 'tanks' },
  { name: 'Labour (masons)', unit: 'days' },
]

// ── Documents ────────────────────────────────────────────────────────────────

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'indenture', label: 'Indenture' },
  { value: 'site-plan', label: 'Site plan' },
  { value: 'land-title', label: 'Land title certificate' },
  { value: 'building-permit', label: 'Building permit' },
  { value: 'tenancy-agreement', label: 'Tenancy agreement' },
  { value: 'receipt', label: 'Receipt / invoice' },
  { value: 'id-document', label: 'ID document' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Other' },
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
export const landStageLabel = lookup(LAND_STAGES)
export const landTitleLabel = lookup(LAND_TITLE_STATUSES)
export const projectStatusLabel = lookup(PROJECT_STATUSES)
export const expenseCategoryLabel = lookup(EXPENSE_CATEGORIES)
export const documentCategoryLabel = lookup(DOCUMENT_CATEGORIES)
export const landSizeLabel = (size: number, unit: LandSizeUnit) => {
  const u = LAND_SIZE_UNITS.find((x) => x.value === unit)
  if (!u) return `${size} ${unit}`
  if (unit === 'plots' || unit === 'acres') return `${size} ${size === 1 ? u.short : `${u.short}s`}`
  return `${size.toLocaleString()} ${u.short}`
}
