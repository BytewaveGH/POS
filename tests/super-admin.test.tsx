import React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const nav = vi.hoisted(() => ({ params: { locale: 'en' } as Record<string, string> }))
vi.mock('next/navigation', () => ({ useParams: () => nav.params, useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const lookup = vi.hoisted(() => ({ taken: new Set<string>(['acme']) }))
vi.mock('@/lib/tenant-services', () => ({ TenantServices: { Resolve: async (slug: string) => ({ exists: lookup.taken.has(slug) }) } }))
vi.mock('@/lib/tenant', async (orig) => ({ ...(await orig<typeof import('@/lib/tenant')>()), ROOT_DOMAIN: 'localhost:3000' }))

import {
  filterTenants,
  generatePassword,
  passwordStrength,
  registrationsByMonth,
  tenantUrl,
  tenantsToCsv,
  verticalBreakdown,
} from '@/app/[locale]/(super-admin)/super-admin/_logics/insights'
import type { TenantRecord } from '@/app/[locale]/(super-admin)/super-admin/_logics/types'
import AppsPage from '@/app/[locale]/(super-admin)/super-admin/apps/page'
import OverviewPage from '@/app/[locale]/(super-admin)/super-admin/page'
import AppDetailPage from '@/app/[locale]/(super-admin)/super-admin/apps/[id]/page'
import { RegisterAppWizard } from '@/app/[locale]/(super-admin)/super-admin/_components/app-forms'

const t = (id: number, over: Partial<TenantRecord> = {}): TenantRecord => ({
  id,
  name: `App ${id}`,
  slug: `app-${id}`,
  appType: 'retail',
  status: 'active',
  createdAt: '2026-09-10T10:00:00Z',
  ownerName: `Owner ${id}`,
  ownerEmail: `owner${id}@x.com`,
  ...over,
})

const TENANTS = [
  t(1, { name: 'Belkis', slug: 'belkis', createdAt: '2026-08-13T09:00:00Z' }),
  t(2, { name: 'Bugy', slug: 'bugy', createdAt: '2026-08-13T10:00:00Z', status: 'suspended' }),
  t(3, { name: 'Nabest', slug: 'nabest', createdAt: '2026-09-22T10:00:00Z', ownerEmail: 'kofi@nabest.com' }),
  t(4, { name: 'Asokwa Homes', slug: 'asokwa', appType: 'real-estate', createdAt: '2026-10-20T10:00:00Z' }),
]

describe('console insights', () => {
  it('buckets registrations by month, oldest first, zeros included', () => {
    const m = registrationsByMonth(TENANTS, new Date('2026-10-23T12:00:00'), 3)
    expect(m.map((x) => [x.key, x.value])).toEqual([
      ['2026-08', 2],
      ['2026-09', 1],
      ['2026-10', 1],
    ])
  })

  it('breaks down by vertical in a fixed order, with zeros and unknown types', () => {
    const b = verticalBreakdown([...TENANTS, t(9, { appType: 'gym' })])
    expect(b).toEqual([
      { value: 'retail', count: 3 },
      { value: 'eatery', count: 0 },
      { value: 'amusement', count: 0 },
      { value: 'real-estate', count: 1 },
      { value: 'gym', count: 1 },
    ])
  })

  it('searches name/subdomain/owner/email and filters by vertical and status', () => {
    expect(filterTenants(TENANTS, { query: 'kofi' }).map((x) => x.id)).toEqual([3])
    expect(filterTenants(TENANTS, { query: 'BUG' }).map((x) => x.id)).toEqual([2])
    expect(filterTenants(TENANTS, { vertical: 'real-estate' }).map((x) => x.id)).toEqual([4])
    expect(filterTenants(TENANTS, { status: 'suspended' }).map((x) => x.id)).toEqual([2])
    expect(filterTenants(TENANTS, { sort: 'name' }).map((x) => x.name)).toEqual(['Asokwa Homes', 'Belkis', 'Bugy', 'Nabest'])
    expect(filterTenants(TENANTS, { sort: 'oldest' })[0].id).toBe(1)
    expect(filterTenants(TENANTS, {})[0].id).toBe(4) // newest first by default
  })

  it('builds http links for local hosts and https otherwise', () => {
    expect(tenantUrl('belkis', 'localhost:3000')).toBe('http://belkis.localhost:3000/en')
    expect(tenantUrl('belkis', 'bytewave.app')).toBe('https://belkis.bytewave.app/en')
  })

  it('exports CSV safely (quotes, newlines, formula injection)', () => {
    const csv = tenantsToCsv([t(1, { name: 'Ama, "Best" Shop', ownerName: '=HYPERLINK("x")' })], 'bytewave.app')
    const [, row] = csv.split('\r\n')
    expect(row.startsWith('"Ama, ""Best"" Shop",app-1,https://app-1.bytewave.app/en,retail,active,')).toBe(true)
    expect(row).toContain(`"'=HYPERLINK(""x"")"`)
  })

  it('rates and generates owner passwords', () => {
    expect(passwordStrength('short').label).toBe('Too short')
    expect(passwordStrength('longpassword').score).toBeLessThan(passwordStrength('Longer-Pass-2026!').score)
    expect(passwordStrength('Longer-Pass-2026!').label).toBe('Strong')
    let seed = 7
    const pw = generatePassword(14, (n) => (seed = (seed * 9301 + 49297) % 233280) % n)
    expect(pw).toHaveLength(14)
    expect(pw).toMatch(/[A-Z]/)
    expect(pw).toMatch(/[a-z]/)
    expect(pw).toMatch(/[2-9]/)
    expect(pw).toMatch(/[!@#$%*?]/)
    expect(pw).not.toMatch(/[0O1lI]/)
  })
})

// ── Screens against a mocked platform API ────────────────────────────────────

let db: TenantRecord[] = []
const calls: { method: string; url: string; body?: any }[] = []

beforeEach(() => {
  db = TENANTS.map((x) => ({ ...x }))
  calls.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ method, url, body })
      const ok = (data: unknown, status = 200) => new Response(JSON.stringify({ data }), { status })
      if (url === '/api/platform/tenants' && method === 'GET') return ok(db)
      const st = /^\/api\/platform\/tenants\/(\d+)\/stats$/.exec(url)
      if (st) return ok({ employeeCount: 3, productCount: 40, salesVolume: Number(st[1]) * 1000 })
      const em = /^\/api\/platform\/tenants\/(\d+)\/employees(?:\/(\d+))?$/.exec(url)
      if (em && method === 'GET') return ok([{ id: 7, name: 'Esi Mensah', email: 'esi@x.com', role: 'cashier', status: 'active' }])
      if (em && method === 'PATCH') return ok({ id: 7, name: 'Esi Mensah', email: 'esi@x.com', role: 'cashier', ...body })
      if (url === '/api/platform/tenants' && method === 'POST') {
        const created = { id: 99, status: 'active', createdAt: new Date().toISOString(), ...body }
        db.push(created)
        return ok(created, 201)
      }
      const m = /^\/api\/platform\/tenants\/(\d+)$/.exec(url)
      if (m && method === 'PATCH') {
        db = db.map((x) => (x.id === Number(m[1]) ? { ...x, ...body } : x))
        return ok(db.find((x) => x.id === Number(m[1])))
      }
      if (m && method === 'DELETE') {
        db = db.filter((x) => x.id !== Number(m[1]))
        return ok(null)
      }
      return new Response('{}', { status: 404 })
    })
  )
})
afterEach(() => vi.unstubAllGlobals())

const withQuery = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('Apps page', () => {
  it('lists every app and narrows with search and the status filter', async () => {
    withQuery(<AppsPage />)
    expect(await screen.findByText('Nabest')).toBeTruthy()
    expect(screen.getAllByRole('row')).toHaveLength(1 + 4)

    fireEvent.change(screen.getByLabelText('Search apps'), { target: { value: 'kofi' } })
    expect(screen.getAllByRole('row')).toHaveLength(1 + 1)
    fireEvent.change(screen.getByLabelText('Search apps'), { target: { value: '' } })

    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Status' })).getByRole('radio', { name: 'Suspended' }))
    expect(screen.getAllByRole('row')).toHaveLength(1 + 1)
    expect(screen.getByText('Bugy')).toBeTruthy()
  })

  it('bulk suspend only touches the active apps in the selection', async () => {
    withQuery(<AppsPage />)
    await screen.findByText('Nabest')
    fireEvent.click(screen.getByLabelText('Select all'))
    expect(screen.getByText('4 selected')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(3))
    expect(
      calls
        .filter((c) => c.method === 'PATCH')
        .map((c) => c.url)
        .sort()
    ).toEqual(['/api/platform/tenants/1', '/api/platform/tenants/3', '/api/platform/tenants/4'])
    expect(calls.every((c) => c.method !== 'PATCH' || c.body.status === 'suspended')).toBe(true)
  })

  it('delete requires typing the subdomain', async () => {
    withQuery(<AppsPage />)
    await screen.findByText('Belkis')
    // Open the row menu for Belkis and choose Delete.
    // (Keyboard: Radix menus open on Enter — jsdom lacks real pointer events.)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions for Belkis' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: /Delete/ }))
    const confirm = await screen.findByRole('button', { name: 'Delete permanently' })
    expect((confirm as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/to confirm/), { target: { value: 'belki' } })
    expect((confirm as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/to confirm/), { target: { value: 'belkis' } })
    expect((confirm as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(confirm)
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.url === '/api/platform/tenants/1')).toBe(true))
  })
})

describe('Register app wizard', () => {
  it('walks business → type → owner → review, checks the subdomain, and shows shareable credentials', async () => {
    withQuery(<RegisterAppWizard open onOpenChange={() => {}} />)
    const next = () => screen.getByRole('button', { name: /Continue/ })

    // Taken subdomain blocks progress.
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Acme' } })
    expect(await screen.findByText(/Already taken/)).toBeTruthy()
    expect((next() as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Asokwa Homes Ltd' } })
    expect(await screen.findByText(/is available/)).toBeTruthy()
    expect((screen.getByLabelText('Subdomain') as HTMLInputElement).value).toBe('asokwa-homes-ltd')
    fireEvent.click(next())

    // Type
    fireEvent.click(screen.getByRole('radio', { name: /Real Estate/ }))
    fireEvent.click(next())

    // Owner
    fireEvent.change(screen.getByLabelText('Owner name'), { target: { value: 'Ahmed' } })
    fireEvent.change(screen.getByLabelText('Owner email'), { target: { value: 'not-an-email' } })
    expect(screen.getByText('Enter a valid email')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Owner email'), { target: { value: 'ahmed@asokwa.com' } })
    fireEvent.click(screen.getByRole('button', { name: /Generate/ }))
    const password = (screen.getByLabelText('Password') as HTMLInputElement).value
    expect(password).toHaveLength(14)
    fireEvent.click(next())

    // Review → register
    expect(screen.getByText('asokwa-homes-ltd.localhost:3000')).toBeTruthy()
    expect(screen.getByText('Real Estate')).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Register app' }))
    })
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true))
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({
      name: 'Asokwa Homes Ltd',
      slug: 'asokwa-homes-ltd',
      appType: 'real-estate',
      ownerName: 'Ahmed',
      ownerEmail: 'ahmed@asokwa.com',
      password,
    })

    expect(await screen.findByText('Asokwa Homes Ltd is live')).toBeTruthy()
    expect(screen.getByText('http://asokwa-homes-ltd.localhost:3000/en')).toBeTruthy()
    expect(screen.getByText(password)).toBeTruthy()
  })
})

describe('Overview & app detail', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any
  })

  it('overview shows KPIs, verticals, top businesses and lets you reactivate from Needs attention', async () => {
    nav.params = { locale: 'en' }
    withQuery(<OverviewPage />)
    expect(await screen.findByText('Platform overview')).toBeTruthy()
    expect(screen.getByText('Registered apps')).toBeTruthy()
    expect(screen.getAllByText('Real Estate').length).toBeGreaterThan(0)
    // Leaderboard ranks by reported sales volume (id × 1000 in this mock): Asokwa Homes first.
    const top = (await screen.findByText('Top businesses')).closest('.rounded-2xl') as HTMLElement
    await waitFor(() => expect(within(top).getAllByRole('link')[0].textContent).toContain('Asokwa Homes'))
    const attention = screen.getByText('Needs attention').closest('.rounded-2xl') as HTMLElement
    expect(within(attention).getByText('Bugy')).toBeTruthy()
    fireEvent.click(within(attention).getByRole('button', { name: 'Reactivate' }))
    await waitFor(() =>
      expect(calls.some((c) => c.method === 'PATCH' && c.url === '/api/platform/tenants/2' && c.body.status === 'active')).toBe(true)
    )
  })

  it('app detail shows stats and lets you suspend a staff member', async () => {
    nav.params = { locale: 'en', id: '3' }
    withQuery(<AppDetailPage />)
    expect(await screen.findByRole('heading', { name: 'Nabest' })).toBeTruthy()
    expect(await screen.findByText('₵3,000')).toBeTruthy()
    // Radix tabs activate on mousedown.
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Staff/ }))
    const row = (await screen.findByText('Esi Mensah')).closest('.px-4') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: 'Suspend' }))
    await waitFor(() =>
      expect(
        calls.some((c) => c.method === 'PATCH' && c.url === '/api/platform/tenants/3/employees/7' && c.body.status === 'suspended')
      ).toBe(true)
    )
  })
})
