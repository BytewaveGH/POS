import React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Use the browser (local) data source for these tests.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_REAL_ESTATE_DATA_SOURCE = 'local'
})
vi.mock('next-auth/react', () => ({ useSession: () => ({ status: 'authenticated', data: { user: { tenant: 'acme' } } }) }))
vi.mock('@/hooks/use-axios', () => ({ useAxios: () => vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const nav = vi.hoisted(() => ({ params: { locale: 'en', propertyId: '1' } as Record<string, string>, push: vi.fn() }))
vi.mock('next/navigation', () => ({ useParams: () => nav.params, useRouter: () => ({ push: nav.push }) }))

import { PropertyForm } from '@/app/[locale]/(real-estate)/real-estate/_components/forms/property-form'
import { MoveInForm } from '@/app/[locale]/(real-estate)/real-estate/_components/forms/tenancy-forms'
import { BookingForm } from '@/app/[locale]/(real-estate)/real-estate/_components/forms/booking-maintenance-forms'
import Dashboard from '@/app/[locale]/(real-estate)/real-estate/page'
import PropertyDetail from '@/app/[locale]/(real-estate)/real-estate/properties/[propertyId]/page'
import RoomTypesPage from '@/app/[locale]/(real-estate)/real-estate/room-types/page'
import { RoomTypeForm } from '@/app/[locale]/(real-estate)/real-estate/_components/forms/room-type-form'
import { ALL_PRIVATE, ALL_SHARED } from '@/app/[locale]/(real-estate)/real-estate/_logics/constants'
import { createLocalSource, createMemoryFileStore, setLocalFileStore } from '@/app/[locale]/(real-estate)/real-estate/_logics/data-source'
import DocumentsPage from '@/app/[locale]/(real-estate)/real-estate/documents/page'
import { generateUnits, todayISO } from '@/app/[locale]/(real-estate)/real-estate/_logics/calc'
import type { Unit } from '@/app/[locale]/(real-estate)/real-estate/_logics/types'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any
})

const withQuery = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const db = () => createLocalSource('acme')

const roomType = (name: string, over: Record<string, unknown> = {}) => ({
  name,
  bedrooms: 1,
  livingRooms: 0,
  facilities: ALL_SHARED,
  amenities: [] as string[],
  rentalMode: 'long-term' as const,
  defaultMonthlyRent: 250,
  defaultNightlyRate: 0,
  maxGuests: 0,
  ...over,
})

// The compound house: 2 single rooms (₵250) + 7 self-contained chamber & halls (₵600).
const seedCompound = async () => {
  const s = db()
  const single = await s.create('unitTypes', roomType('Single room (shared facilities)'))
  const chamber = await s.create(
    'unitTypes',
    roomType('Chamber & hall (self-contained)', { livingRooms: 1, facilities: ALL_PRIVATE, defaultMonthlyRent: 600 })
  )
  const property = await s.create('properties', { name: 'Asokwa Compound', type: 'compound-house', address: 'Lane 4', city: 'Kumasi' })
  const units = generateUnits(
    [
      { unitTypeId: single.id, count: 2, rentalMode: 'long-term', monthlyRent: 250, nightlyRate: 0, maxGuests: 0 },
      { unitTypeId: chamber.id, count: 7, rentalMode: 'long-term', monthlyRent: 600, nightlyRate: 0, maxGuests: 0 },
    ],
    property.id
  )
  const created: Unit[] = []
  for (const u of units) created.push(await s.create('units', u))
  return { property, units: created, single, chamber }
}

beforeEach(() => {
  setLocalFileStore(createMemoryFileStore())
  localStorage.clear()
  vi.clearAllMocks()
})

describe('real-estate screens (local data)', () => {
  it('creates a compound house with its 9 rooms in one step, starting from no room types', async () => {
    withQuery(<PropertyForm open onOpenChange={() => {}} />)

    fireEvent.change(screen.getByLabelText('Property name'), { target: { value: 'Asokwa Compound' } })
    fireEvent.change(screen.getByLabelText('Address / landmark'), { target: { value: 'Lane 4' } })
    fireEvent.change(screen.getByLabelText('City / town'), { target: { value: 'Kumasi' } })

    // No room types yet → tick two of the common ones right inside the form.
    expect(screen.getByText('First, describe your kinds of rooms')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Single room \(shared facilities\)/ }))
    fireEvent.click(screen.getByRole('button', { name: /Chamber & hall \(self-contained\)/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Add 2 room types' }))
    await waitFor(async () => expect(await db().list('unitTypes')).toHaveLength(2))
    const [single, chamber] = await db().list('unitTypes')

    // Group 1: 2 × single room at ₵250 (picked up automatically).
    await waitFor(() => expect((screen.getAllByLabelText('Room type')[0] as HTMLSelectElement).value).toBe(String(single.id)))
    fireEvent.change(screen.getAllByLabelText('How many')[0], { target: { value: '2' } })
    fireEvent.change(screen.getAllByLabelText('Rent per month')[0], { target: { value: '250' } })
    // Group 2: 7 × chamber & hall (self-contained) — its default rent fills in.
    fireEvent.click(screen.getByRole('button', { name: /Add another group of rooms/ }))
    fireEvent.change(screen.getAllByLabelText('Room type')[1], { target: { value: String(chamber.id) } })
    expect((screen.getAllByLabelText('Rent per month')[1] as HTMLInputElement).value).toBe('600')
    expect(screen.getAllByText('Self-contained').length).toBeGreaterThan(0)
    fireEvent.change(screen.getAllByLabelText('How many')[1], { target: { value: '7' } })

    expect(screen.getByText('9 units')).toBeTruthy() // summary line
    expect(screen.getByText('₵4,700')).toBeTruthy() // 2×250 + 7×600 at full occupancy

    fireEvent.click(screen.getByRole('button', { name: /Create property · 9 units/ }))
    await waitFor(async () => expect(await db().list('units')).toHaveLength(9))

    const [property] = await db().list('properties')
    expect(property).toMatchObject({ name: 'Asokwa Compound', type: 'compound-house', city: 'Kumasi' })
    const units = await db().list('units')
    expect(units.filter((u) => u.unitTypeId === single.id && u.monthlyRent === 250)).toHaveLength(2)
    expect(units.filter((u) => u.unitTypeId === chamber.id && u.monthlyRent === 600)).toHaveLength(7)
  })

  it('blocks creating rooms without a room type', async () => {
    withQuery(<PropertyForm open onOpenChange={() => {}} />)
    fireEvent.change(screen.getByLabelText('Property name'), { target: { value: 'X' } })
    fireEvent.change(screen.getByLabelText('Address / landmark'), { target: { value: 'Y' } })
    fireEvent.change(screen.getByLabelText('City / town'), { target: { value: 'Z' } })
    fireEvent.click(screen.getByRole('button', { name: /Create property/ }))
    expect(await screen.findByText('Choose a room type')).toBeTruthy()
    expect(await db().list('properties')).toEqual([])
  })

  it('defines a custom room type with mixed private/shared facilities', async () => {
    withQuery(<RoomTypeForm open onOpenChange={() => {}} />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Chamber & hall (shared kitchen)' } })
    fireEvent.change(screen.getByLabelText('Halls / sitting rooms'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Self-contained' }))
    // …but the kitchen is shared and the electricity meter is shared.
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Kitchen' })).getByRole('radio', { name: 'Shared' }))
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Electricity meter' })).getByRole('radio', { name: 'Shared' }))
    expect(screen.getByText('→ Own bath & toilet · shared kitchen')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Porch' }))
    fireEvent.change(screen.getByLabelText('Rent per month'), { target: { value: '550' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create room type' }))

    await waitFor(async () => expect(await db().list('unitTypes')).toHaveLength(1))
    const [t] = await db().list('unitTypes')
    expect(t).toMatchObject({
      name: 'Chamber & hall (shared kitchen)',
      bedrooms: 1,
      livingRooms: 1,
      facilities: { bathroom: 'private', toilet: 'private', kitchen: 'shared', electricity: 'shared', water: 'private' },
      amenities: ['Porch'],
      defaultMonthlyRent: 550,
    })
  })

  it('changing a type’s rent can update its rooms’ listed rent, never an agreed lease', async () => {
    const { units, chamber } = await seedCompound()
    const s = db()
    const lease = await s.create('leases', {
      unitId: units[2].id,
      tenantId: 1,
      startDate: '2026-01-01',
      monthlyRent: 600,
      billingCycleMonths: 12,
      securityDeposit: 0,
    })
    withQuery(<RoomTypeForm open onOpenChange={() => {}} roomType={chamber} />)

    await waitFor(() => expect((screen.getByLabelText('Rent per month') as HTMLInputElement).value).toBe('600'))
    fireEvent.change(screen.getByLabelText('Rent per month'), { target: { value: '650' } })
    fireEvent.click(await screen.findByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Save room type' }))

    await waitFor(async () => expect((await db().list('units')).filter((u) => u.monthlyRent === 650)).toHaveLength(7))
    expect((await db().list('units')).filter((u) => u.monthlyRent === 250)).toHaveLength(2) // other type untouched
    expect((await db().list('leases')).find((l) => l.id === lease.id)?.monthlyRent).toBe(600)
  })

  it('room types page: a type in use cannot be deleted', async () => {
    await seedCompound()
    await db().create('unitTypes', roomType('Shop', { facilities: { ...ALL_SHARED, bathroom: 'none', kitchen: 'none' } }))
    withQuery(<RoomTypesPage />)
    expect(await screen.findByText('Chamber & hall (self-contained)')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Delete Chamber & hall (self-contained)' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Delete Shop' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByText('7 rooms · 0 let')).toBeTruthy()
  })

  it('moves a new tenant in with a 1-year advance', async () => {
    const { units } = await seedCompound()
    const room3 = units[2] // a chamber & hall
    withQuery(<MoveInForm open onOpenChange={() => {}} unitId={room3.id} />)

    await waitFor(() => expect((screen.getByLabelText('Rent per month') as HTMLInputElement).value).toBe('600'))
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Kwame Mensah' } })
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '024 123 4567' } })
    // Suggested advance = 12 × 600.
    expect((screen.getByLabelText('Amount received') as HTMLInputElement).value).toBe('7200')

    fireEvent.click(screen.getByRole('button', { name: 'Move in' }))
    await waitFor(async () => expect(await db().list('payments')).toHaveLength(1))

    const [tenant] = await db().list('tenants')
    const [lease] = await db().list('leases')
    const [payment] = await db().list('payments')
    expect(tenant).toMatchObject({ fullName: 'Kwame Mensah', phone: '024 123 4567', idType: 'ghana-card' })
    expect(lease).toMatchObject({ unitId: room3.id, tenantId: tenant.id, monthlyRent: 600, billingCycleMonths: 12, startDate: todayISO() })
    expect(lease.endDate).toBeTruthy()
    expect(payment).toMatchObject({ leaseId: lease.id, amount: 7200, method: 'momo' })
  })

  it('dashboard shows occupancy, rent roll and who owes', async () => {
    const { units } = await seedCompound()
    const s = db()
    const tenant = await s.create('tenants', { fullName: 'Ama Owusu', phone: '020 000 0000' })
    // Moved in 3 months ago on monthly rent, paid only 1 month → owes 2–3 months.
    const start = new Date()
    start.setMonth(start.getMonth() - 3)
    const iso = start.toISOString().slice(0, 10)
    const lease = await s.create('leases', {
      unitId: units[0].id,
      tenantId: tenant.id,
      startDate: iso,
      monthlyRent: 250,
      billingCycleMonths: 1,
      securityDeposit: 0,
    })
    await s.create('payments', { leaseId: lease.id, amount: 250, paidOn: iso, method: 'cash' })

    withQuery(<Dashboard />)
    expect(await screen.findByText(/of 9 units let/)).toBeTruthy()
    expect(screen.getByText('Monthly rent roll')).toBeTruthy()
    expect(screen.getAllByText('₵250').length).toBeGreaterThan(0) // rent roll
    const attention = screen.getByText('Needs attention').closest('.rounded-2xl') as HTMLElement
    expect(within(attention).getByText('Ama Owusu')).toBeTruthy()
    expect(within(attention).getByText('Overdue')).toBeTruthy()
  })

  it('property page lays out every room, vacant ones inviting a move-in', async () => {
    const { property } = await seedCompound()
    nav.params = { locale: 'en', propertyId: String(property.id) }
    withQuery(<PropertyDetail />)
    expect(await screen.findByRole('heading', { name: 'Asokwa Compound' })).toBeTruthy()
    for (let i = 1; i <= 9; i++) expect(screen.getByText(`Room ${i}`)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Move a tenant in/ })).toHaveLength(9)
  })

  it('booking form blocks double-booking a short-stay unit', async () => {
    const s = db()
    const property = await s.create('properties', { name: 'East Legon Airbnb', type: 'short-stay', address: 'x', city: 'Accra' })
    const [unitDraft] = generateUnits(
      [{ unitTypeId: null, count: 1, rentalMode: 'short-stay', monthlyRent: 0, nightlyRate: 450, maxGuests: 4 }],
      property.id
    )
    const unit = await s.create('units', unitDraft)
    await s.create('bookings', {
      unitId: unit.id,
      guestName: 'Esi',
      guests: 2,
      checkIn: '2026-12-20',
      checkOut: '2026-12-24',
      nightlyRate: 450,
      cleaningFee: 0,
      amountPaid: 0,
      channel: 'airbnb',
      status: 'confirmed',
    })

    withQuery(<BookingForm open onOpenChange={() => {}} preset={{ unitId: unit.id, checkIn: '2026-12-22' }} />)
    await waitFor(() => expect((screen.getByLabelText('Per night') as HTMLInputElement).value).toBe('450'))
    fireEvent.change(screen.getByLabelText('Guest name'), { target: { value: 'Yaw' } })

    expect(await screen.findByText(/Overlaps Esi’s stay/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Create booking' }) as HTMLButtonElement).disabled).toBe(true)

    // Back-to-back is fine.
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Check-in'), { target: { value: '2026-12-24' } })
      fireEvent.change(screen.getByLabelText('Check-out'), { target: { value: '2026-12-27' } })
    })
    expect(screen.queryByText(/Overlaps/)).toBeNull()
    expect(screen.getByText(/3 nights/)).toBeTruthy()
    expect(screen.getByText('₵1,350')).toBeTruthy()
  })
})

describe('land, building projects and documents (local data)', () => {
  const seedLand = async () => {
    const s = db()
    return s.create('properties', {
      name: 'Abuakwa plot',
      type: 'land',
      address: 'Behind the school',
      city: 'Kumasi',
      purchasePrice: 45000,
      land: { size: 1, sizeUnit: 'plots', stage: 'fenced', titleStatus: 'indenture' },
    })
  }

  it('records a fenced plot with its price — no rooms needed', async () => {
    withQuery(<PropertyForm open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^Land/ }))
    expect(screen.queryByText('First, describe your kinds of rooms')).toBeNull()

    fireEvent.change(screen.getByLabelText('Property name'), { target: { value: 'Abuakwa plot' } })
    fireEvent.change(screen.getByLabelText('Address / landmark'), { target: { value: 'Behind the school' } })
    fireEvent.change(screen.getByLabelText('City / town'), { target: { value: 'Kumasi' } })
    fireEvent.change(screen.getByLabelText('Size'), { target: { value: '2' } })
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Land stage' })).getByRole('radio', { name: /Fenced/ }))
    fireEvent.change(screen.getByLabelText('Price paid'), { target: { value: '45000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add land' }))

    await waitFor(async () => expect(await db().list('properties')).toHaveLength(1))
    const [plot] = await db().list('properties')
    expect(plot).toMatchObject({ type: 'land', purchasePrice: 45000, land: { size: 2, sizeUnit: 'plots', stage: 'fenced' } })
    expect(await db().list('units')).toEqual([])
  })

  it('starts a build on fenced land with the first phases already done, then records cement', async () => {
    const plot = await seedLand()
    nav.params = { locale: 'en', propertyId: String(plot.id) }
    withQuery(<PropertyDetail />)

    fireEvent.click(await screen.findByRole('button', { name: 'Start a project' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '3-bedroom house' } })
    fireEvent.click(screen.getByRole('button', { name: /External works/ })) // not needed
    fireEvent.click(screen.getByRole('button', { name: 'Create project · 13 phases' }))

    await waitFor(async () => expect(await db().list('phases')).toHaveLength(13))
    const phases = await db().list('phases')
    expect(phases.filter((x) => x.status === 'done').map((x) => x.name)).toEqual(['Land documentation', 'Site clearing', 'Fencing'])

    fireEvent.click(await screen.findByRole('button', { name: 'Record expense' }))
    fireEvent.click(within(screen.getByLabelText('Common materials')).getByRole('button', { name: 'Cement' }))
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '200' } })
    fireEvent.change(screen.getByLabelText('Price per unit'), { target: { value: '95' } })
    expect(screen.getAllByText('₵19,000').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Record expense' }))

    await waitFor(async () => expect(await db().list('expenses')).toHaveLength(1))
    const [e] = await db().list('expenses')
    const foundation = phases.find((x) => x.name === 'Foundation (to DPC)')!
    expect(e).toMatchObject({
      propertyId: plot.id,
      description: 'Cement',
      unit: 'bags',
      quantity: 200,
      unitCost: 95,
      amount: 19000,
      phaseId: foundation.id,
    })
    // Land price + cement
    await waitFor(() => expect(screen.getAllByText('₵64,000').length).toBeGreaterThan(0))
  })

  it('uploads an indenture and offers WhatsApp sharing', async () => {
    const plot = await seedLand()
    withQuery(<DocumentsPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Upload documents' }))
    const file = new File(['%PDF'], 'indenture.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Choose files'), { target: { files: [file] } })
    fireEvent.change(screen.getByLabelText('Type of document'), { target: { value: 'indenture' } })
    fireEvent.change(screen.getByLabelText('Property'), { target: { value: String(plot.id) } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

    await waitFor(async () => expect(await db().list('documents')).toHaveLength(1))
    expect((await db().list('documents'))[0]).toMatchObject({ category: 'indenture', propertyId: plot.id, fileName: 'indenture.pdf' })
    expect(await screen.findByRole('button', { name: 'Share on WhatsApp' })).toBeTruthy()
  })
})
