import {
  collectedByMonth,
  facilitySummary,
  findBookingConflict,
  generateUnits,
  layoutLabel,
  leasesExpiringWithin,
  occupancyBreakdown,
  rentSummary,
  shortStayOccupancy,
  termMonths,
  unitOccupancy,
} from '@/app/[locale]/(real-estate)/real-estate/_logics/calc'
import { createLocalSource } from '@/app/[locale]/(real-estate)/real-estate/_logics/data-source'
import { ALL_PRIVATE, ALL_SHARED } from '@/app/[locale]/(real-estate)/real-estate/_logics/constants'
import type { Booking, Lease, RentPayment, Unit } from '@/app/[locale]/(real-estate)/real-estate/_logics/types'

const TODAY = '2026-10-23'

const lease = (over: Partial<Lease> = {}): Lease => ({
  id: 1,
  unitId: 1,
  tenantId: 1,
  startDate: '2026-01-10',
  monthlyRent: 500,
  billingCycleMonths: 1,
  securityDeposit: 0,
  ...over,
})
const pay = (amount: number, paidOn = '2026-01-10', leaseId = 1): RentPayment => ({
  id: Math.random(),
  leaseId,
  amount,
  paidOn,
  method: 'momo',
})

const unit = (over: Partial<Unit> = {}): Unit => ({
  id: 1,
  propertyId: 1,
  name: 'Room 1',
  unitTypeId: 1,
  rentalMode: 'long-term',
  monthlyRent: 500,
  nightlyRate: 0,
  maxGuests: 0,
  availability: 'available',
  ...over,
})

const booking = (over: Partial<Booking> = {}): Booking => ({
  id: 1,
  unitId: 1,
  guestName: 'Esi',
  guests: 2,
  checkIn: '2026-10-21',
  checkOut: '2026-10-25',
  nightlyRate: 350,
  cleaningFee: 50,
  amountPaid: 1450,
  channel: 'airbnb',
  status: 'confirmed',
  ...over,
})

describe('compound house set-up', () => {
  it('2 single rooms + 7 chamber & halls of your own room types → Room 1 … Room 9', () => {
    const SINGLE = 11 // e.g. "Single room (shared facilities)"
    const CH_SC = 12 // e.g. "Chamber & hall (self-contained)"
    const units = generateUnits(
      [
        { unitTypeId: SINGLE, count: 2, rentalMode: 'long-term', monthlyRent: 250, nightlyRate: 0, maxGuests: 0 },
        { unitTypeId: CH_SC, count: 7, rentalMode: 'long-term', monthlyRent: 600, nightlyRate: 0, maxGuests: 0 },
      ],
      42
    )
    expect(units).toHaveLength(9)
    expect(units.map((u) => u.name)).toEqual(Array.from({ length: 9 }, (_, i) => `Room ${i + 1}`))
    expect(units.slice(0, 2).every((u) => u.unitTypeId === SINGLE && u.monthlyRent === 250)).toBe(true)
    expect(units.slice(2).every((u) => u.unitTypeId === CH_SC && u.monthlyRent === 600)).toBe(true)
    expect(units.every((u) => u.propertyId === 42 && u.availability === 'available')).toBe(true)
  })

  it('any mix and count works — nothing is fixed at 9', () => {
    const units = generateUnits(
      [
        { unitTypeId: 1, count: 3, rentalMode: 'long-term', monthlyRent: 300, nightlyRate: 0, maxGuests: 0 },
        { unitTypeId: 2, count: 12, rentalMode: 'long-term', monthlyRent: 650, nightlyRate: 0, maxGuests: 0 },
        { unitTypeId: 3, count: 2, rentalMode: 'short-stay', monthlyRent: 0, nightlyRate: 450, maxGuests: 4 },
      ],
      1,
      'Flat'
    )
    expect(units).toHaveLength(17)
    expect(units[16]).toMatchObject({
      name: 'Flat 17',
      unitTypeId: 3,
      rentalMode: 'short-stay',
      nightlyRate: 450,
      monthlyRent: 0,
      maxGuests: 4,
    })
  })
})

describe('room types & facilities', () => {
  it('summarises facilities the way a landlord says them', () => {
    expect(facilitySummary(ALL_PRIVATE)).toMatchObject({ selfContained: true, label: 'Self-contained' })
    expect(facilitySummary(ALL_SHARED)).toMatchObject({ selfContained: false, label: 'Shared facilities' })
    expect(facilitySummary({ ...ALL_PRIVATE, kitchen: 'shared' }).label).toBe('Own bath & toilet · shared kitchen')
    expect(facilitySummary({ bathroom: 'none', toilet: 'shared', kitchen: 'none', electricity: 'private', water: 'none' }).label).toBe(
      'shared toilet'
    )
    expect(facilitySummary({ ...ALL_SHARED, electricity: 'private' })).toMatchObject({
      label: 'Shared facilities',
      privateKeys: ['electricity'],
    })
  })

  it('describes the layout', () => {
    expect(layoutLabel({ bedrooms: 1, livingRooms: 0 })).toBe('Single room')
    expect(layoutLabel({ bedrooms: 1, livingRooms: 1 })).toBe('1 bedroom + hall')
    expect(layoutLabel({ bedrooms: 2, livingRooms: 1 })).toBe('2 bedrooms + hall')
    expect(layoutLabel({ bedrooms: 0, livingRooms: 0 })).toBe('Open space')
  })
})

describe('rent status', () => {
  it('monthly tenant one month behind is overdue from the day that month started', () => {
    const s = rentSummary(lease(), [pay(4500)], TODAY) // 9 of 10 started months paid
    expect(s).toMatchObject({ status: 'overdue', arrears: 500, nextDueDate: '2026-10-10', daysOverdue: 13, paidThrough: '2026-10-10' })
  })

  it('a 1-year advance that covers the whole term is paid, with nothing further due', () => {
    const l = lease({ startDate: '2026-03-01', endDate: '2027-03-01', monthlyRent: 400, billingCycleMonths: 12 })
    expect(termMonths(l)).toBe(12)
    expect(rentSummary(l, [pay(4800, '2026-03-01')], TODAY)).toMatchObject({ status: 'paid', arrears: 0, nextDueDate: null })
  })

  it('an open-ended yearly lease is due soon within 30 days of renewal', () => {
    const l = lease({ startDate: '2025-11-15', monthlyRent: 400, billingCycleMonths: 12 })
    expect(rentSummary(l, [pay(4800, '2025-11-15')], TODAY)).toMatchObject({
      status: 'due-soon',
      nextDueDate: '2026-11-15',
      nextDueAmount: 4800,
      daysUntilDue: 23,
    })
  })

  it('a 2-year advance stays paid in its second year', () => {
    const l = lease({ startDate: '2025-06-01', endDate: '2027-06-01', monthlyRent: 300, billingCycleMonths: 24 })
    expect(rentSummary(l, [pay(7200, '2025-06-01')], TODAY).status).toBe('paid')
  })

  it('partial advance: only the unpaid part of the started cycle is arrears', () => {
    const l = lease({ startDate: '2026-09-01', monthlyRent: 500, billingCycleMonths: 6 })
    expect(rentSummary(l, [pay(2000, '2026-09-01')], TODAY)).toMatchObject({ status: 'overdue', arrears: 1000, nextDueDate: '2026-09-01' })
  })

  it('upcoming lease reports the first amount due at move-in', () => {
    const l = lease({ startDate: '2026-11-01', monthlyRent: 600, billingCycleMonths: 12 })
    expect(rentSummary(l, [], TODAY)).toMatchObject({ status: 'upcoming', nextDueDate: '2026-11-01', nextDueAmount: 7200, daysUntilDue: 9 })
  })

  it('a moved-out tenant who still owes stays overdue; one who settled is ended', () => {
    const l = lease({ terminatedOn: '2026-06-20' }) // owed Jan–Jun = 6 months
    expect(rentSummary(l, [pay(2500)], TODAY)).toMatchObject({ status: 'overdue', arrears: 500 })
    expect(rentSummary(l, [pay(3000)], TODAY).status).toBe('ended')
  })

  it('only counts payments for that lease', () => {
    expect(rentSummary(lease(), [pay(5000, '2026-01-10', 2)], TODAY).arrears).toBe(5000)
  })
})

describe('occupancy', () => {
  it('long-term units follow their leases; maintenance overrides', () => {
    expect(unitOccupancy(unit(), [lease()], [], TODAY)).toBe('occupied')
    expect(unitOccupancy(unit(), [lease({ startDate: '2026-12-01' })], [], TODAY)).toBe('reserved')
    expect(unitOccupancy(unit(), [lease({ terminatedOn: '2026-10-01' })], [], TODAY)).toBe('vacant')
    expect(unitOccupancy(unit({ availability: 'maintenance' }), [lease()], [], TODAY)).toBe('maintenance')
  })

  it('short-stay units follow live bookings; the checkout day is free', () => {
    const u = unit({ rentalMode: 'short-stay' })
    expect(unitOccupancy(u, [], [booking()], TODAY)).toBe('occupied')
    expect(unitOccupancy(u, [], [booking({ checkOut: TODAY })], TODAY)).toBe('vacant')
    expect(unitOccupancy(u, [], [booking({ status: 'cancelled' })], TODAY)).toBe('vacant')
    expect(unitOccupancy(u, [], [booking({ checkIn: '2026-10-27', checkOut: '2026-10-29' })], TODAY)).toBe('reserved')
  })

  it('occupancy rate ignores unlisted units', () => {
    const units = [unit({ id: 1 }), unit({ id: 2 }), unit({ id: 3, availability: 'unlisted' })]
    const r = occupancyBreakdown(units, [lease({ unitId: 1 })], [], TODAY)
    expect(r.counts).toMatchObject({ occupied: 1, vacant: 1, unlisted: 1 })
    expect(r.rate).toBe(0.5)
  })

  it('short-stay occupancy counts only nights inside the window', () => {
    const u = unit({ rentalMode: 'short-stay' })
    // Window Oct 1–31 (30 nights); booking Oct 29 → Nov 3 contributes 2 nights.
    expect(shortStayOccupancy([u], [booking({ checkIn: '2026-10-29', checkOut: '2026-11-03' })], '2026-10-01', '2026-10-31')).toEqual({
      booked: 2,
      available: 30,
      rate: 2 / 30,
    })
  })

  it('double-booking guard: overlaps conflict, back-to-back stays do not', () => {
    const existing = [booking()]
    expect(findBookingConflict({ unitId: 1, checkIn: '2026-10-24', checkOut: '2026-10-26' }, existing)).toBeTruthy()
    expect(findBookingConflict({ unitId: 1, checkIn: '2026-10-25', checkOut: '2026-10-27' }, existing)).toBeUndefined()
    expect(findBookingConflict({ unitId: 2, checkIn: '2026-10-22', checkOut: '2026-10-24' }, existing)).toBeUndefined()
  })
})

describe('money over time', () => {
  it('groups rent and short-stay income by month, oldest first', () => {
    const months = collectedByMonth([pay(500, '2026-10-02'), pay(500, '2026-09-30'), pay(999, '2026-01-01')], [booking()], TODAY, 3)
    expect(months).toEqual([
      { month: '2026-08', label: 'Aug', amount: 0 },
      { month: '2026-09', label: 'Sep', amount: 500 },
      { month: '2026-10', label: 'Oct', amount: 500 + 1450 },
    ])
  })

  it('lists leases whose term ends within the window', () => {
    const soon = lease({ id: 2, endDate: '2026-11-30' })
    const later = lease({ id: 3, endDate: '2027-05-01' })
    expect(leasesExpiringWithin([later, soon], TODAY, 60).map((l) => l.id)).toEqual([2])
  })
})

describe('local data source', () => {
  const memory = () => {
    const store = new Map<string, string>()
    return { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), store }
  }

  it('creates with incrementing ids, updates, and scopes data per tenant', async () => {
    const storage = memory()
    const a = createLocalSource('acme', storage)
    const p1 = await a.create('properties', { name: 'Compound', type: 'compound-house', address: 'Lane 1', city: 'Kumasi' })
    const p2 = await a.create('properties', { name: 'Airbnb', type: 'short-stay', address: 'Lane 2', city: 'Accra' })
    expect([p1.id, p2.id]).toEqual([1, 2])
    await a.update('properties', 1, { name: 'Compound House' })
    expect((await a.list('properties'))[0].name).toBe('Compound House')
    expect(await createLocalSource('other', storage).list('properties')).toEqual([])
  })

  it('deleting a property removes its units, leases, payments, bookings and maintenance', async () => {
    const s = createLocalSource('acme', memory())
    const p = await s.create('properties', { name: 'Compound', type: 'compound-house', address: 'x', city: 'y' })
    const other = await s.create('properties', { name: 'Other', type: 'single-family', address: 'x', city: 'y' })
    const [u] = await Promise.all(
      generateUnits([{ unitTypeId: 1, count: 1, rentalMode: 'long-term', monthlyRent: 200, nightlyRate: 0, maxGuests: 0 }], p.id).map((x) =>
        s.create('units', x)
      )
    )
    const keep = await s.create('units', { ...u, propertyId: other.id })
    const l = await s.create('leases', {
      unitId: u.id,
      tenantId: 1,
      startDate: '2026-01-01',
      monthlyRent: 200,
      billingCycleMonths: 1,
      securityDeposit: 0,
    })
    await s.create('payments', { leaseId: l.id, amount: 200, paidOn: '2026-01-01', method: 'cash' })
    await s.create('bookings', { ...booking(), unitId: u.id })
    await s.create('maintenance', { propertyId: p.id, title: 'Leak', priority: 'high', status: 'open', cost: 0, reportedOn: TODAY })

    await s.remove('properties', p.id)
    expect((await s.list('units')).map((x) => x.id)).toEqual([keep.id])
    expect(await s.list('leases')).toEqual([])
    expect(await s.list('payments')).toEqual([])
    expect(await s.list('bookings')).toEqual([])
    expect(await s.list('maintenance')).toEqual([])
  })
})

describe('local data source — room types', () => {
  const memory = () => {
    const store = new Map<string, string>()
    return { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), store }
  }

  it('refuses to delete a room type that units still use (like the API’s 409)', async () => {
    const s = createLocalSource('acme', memory())
    const t = await s.create('unitTypes', {
      name: 'Chamber & hall (self-contained)',
      bedrooms: 1,
      livingRooms: 1,
      facilities: ALL_PRIVATE,
      amenities: [],
      rentalMode: 'long-term',
      defaultMonthlyRent: 600,
      defaultNightlyRate: 0,
      maxGuests: 0,
    })
    const u = await s.create('units', { ...unit(), unitTypeId: t.id })
    await expect(s.remove('unitTypes', t.id)).rejects.toMatchObject({ response: { status: 409 } })
    await s.remove('units', u.id)
    await s.remove('unitTypes', t.id)
    expect(await s.list('unitTypes')).toEqual([])
  })

  it('converts units saved with the old fixed types into room types, once', async () => {
    const storage = memory()
    const legacy = (id: number, type: string, selfContained: boolean, monthlyRent: number) => ({
      id,
      propertyId: 1,
      name: `Room ${id}`,
      type,
      rentalMode: 'long-term',
      selfContained,
      bedrooms: 1,
      bathrooms: selfContained ? 1 : 0,
      monthlyRent,
      nightlyRate: 0,
      maxGuests: 0,
      availability: 'available',
    })
    storage.setItem(
      'sellix-real-estate:acme:units',
      JSON.stringify([legacy(1, 'single-room', false, 250), legacy(2, 'single-room', false, 250), legacy(3, 'chamber-and-hall', true, 600)])
    )

    const s = createLocalSource('acme', storage)
    const types = await s.list('unitTypes')
    expect(types.map((t) => t.name)).toEqual(['Single room (shared facilities)', 'Chamber & hall (self-contained)'])
    expect(types[0]).toMatchObject({ bedrooms: 1, livingRooms: 0, facilities: ALL_SHARED, defaultMonthlyRent: 250 })
    expect(types[1]).toMatchObject({ livingRooms: 1, facilities: ALL_PRIVATE, defaultMonthlyRent: 600 })

    const units = await s.list('units')
    expect(units.map((u) => u.unitTypeId)).toEqual([types[0].id, types[0].id, types[1].id])
    expect(units[0]).not.toHaveProperty('type')
    expect(units[0]).not.toHaveProperty('selfContained')

    // Running again changes nothing.
    createLocalSource('acme', storage)
    expect(await s.list('unitTypes')).toHaveLength(2)
  })
})
