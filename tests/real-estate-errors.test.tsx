import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AxiosRequestConfig } from 'axios'

// These screens talk to the API (mocked below), not the browser store.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_REAL_ESTATE_DATA_SOURCE = 'api'
})
const session = vi.hoisted(() => ({ user: { tenant: 'belkis-residences' } as Record<string, unknown> }))
vi.mock('next-auth/react', () => ({ useSession: () => ({ status: 'authenticated', data: { user: session.user } }) }))
const api = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@/hooks/use-axios', () => ({ useAxios: () => api.request }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const logout = vi.hoisted(() => ({ forceLogout: vi.fn() }))
vi.mock('@/lib/force-logout', () => logout)
vi.mock('next/navigation', () => ({ useParams: () => ({ locale: 'en' }), useRouter: () => ({ push: vi.fn() }) }))

import { ModuleFrame } from '@/app/[locale]/(real-estate)/real-estate/_components/module-frame'
import TenantsPage from '@/app/[locale]/(real-estate)/real-estate/tenants/page'
import MaintenancePage from '@/app/[locale]/(real-estate)/real-estate/maintenance/page'
import { RoomTypeForm } from '@/app/[locale]/(real-estate)/real-estate/_components/forms/room-type-form'
import { shouldRetry } from '@/app/[locale]/(real-estate)/real-estate/_logics/errors'

const fail = (status: number, body: Record<string, unknown>) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data: body } })
const ok = (data: unknown) => Promise.resolve({ data: { status: true, data } })
const lists = () => api.request.mock.calls.map((call) => call[0] as AxiosRequestConfig).filter((c) => c.method === 'GET')
const listed = (path: string) => lists().filter((c) => c.url === `/real-estate/${path}/`).length

const renderPage = (ui: React.ReactElement) => {
  // The app's own client: React Query defaults (3 retries, refetch on focus…)
  // must not leak into these queries.
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <ModuleFrame>{ui}</ModuleFrame>
    </QueryClientProvider>
  )
}

const settle = () => new Promise((r) => setTimeout(r, 150))

beforeEach(() => {
  vi.clearAllMocks()
  session.user = { tenant: 'belkis-residences' }
  api.request.mockImplementation(() => ok([]))
})

describe('real estate: errors end in a visible state, never a loop', () => {
  it('unknown tenant → one request per collection, the error panel, and Retry asks once more', async () => {
    api.request.mockImplementation(() => Promise.reject(fail(403, { status: false, message: 'unknown tenant' })))
    renderPage(<TenantsPage />)

    expect(await screen.findByText(/This business isn’t available right now/)).toBeTruthy()
    await settle()
    expect(lists()).toHaveLength(12)
    expect(new Set(lists().map((c) => c.url)).size).toBe(12)
    expect(logout.forceLogout).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(lists()).toHaveLength(24))
    await settle()
    expect(lists()).toHaveLength(24)
    expect(screen.getByText(/This business isn’t available right now/)).toBeTruthy()
  })

  it('"session is not bound to a tenant" sends the user to sign in again', async () => {
    api.request.mockImplementation(() =>
      Promise.reject(fail(403, { status: false, message: 'session is not bound to a tenant, please sign in again' }))
    )
    renderPage(<TenantsPage />)
    expect(await screen.findByText('Please sign in again')).toBeTruthy()
    expect(logout.forceLogout).toHaveBeenCalledWith('rebind')
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
  })

  it('a 500 on one collection is retried at most twice, then the error panel', async () => {
    api.request.mockImplementation((c: AxiosRequestConfig) =>
      c.url === '/real-estate/tenants/' ? Promise.reject(fail(500, { status: false, error: 'database is down' })) : ok([])
    )
    renderPage(<TenantsPage />)

    expect(await screen.findByText('database is down', {}, { timeout: 6000 })).toBeTruthy()
    expect(listed('tenants')).toBe(3)
    expect(listed('properties')).toBe(1)
    await settle()
    expect(listed('tenants')).toBe(3)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  }, 10_000)

  it('4xx is never retried; network errors and 5xx are, twice', () => {
    expect(shouldRetry(0, fail(404, {}))).toBe(false)
    expect(shouldRetry(0, fail(409, {}))).toBe(false)
    expect(shouldRetry(0, fail(403, { message: 'Forbidden' }))).toBe(false)
    expect(shouldRetry(0, fail(503, {}))).toBe(true)
    expect(shouldRetry(1, new Error('Network Error'))).toBe(true)
    expect(shouldRetry(2, fail(500, {}))).toBe(false)
  })

  it('a section’s 403 "Forbidden" only blanks that section', async () => {
    api.request.mockImplementation((c: AxiosRequestConfig) =>
      c.url === '/real-estate/maintenance/' ? Promise.reject(fail(403, { status: false, message: 'Forbidden' })) : ok([])
    )
    renderPage(<MaintenancePage />)
    expect(await screen.findByText('You don’t have access to this section.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Log repair/ })).toBeNull()
    expect(listed('maintenance')).toBe(1)
  })
})

describe('real estate: permissions decide what is asked for and shown', () => {
  it('reports-only staff read tenants without write buttons', async () => {
    session.user = { tenant: 'belkis', accountType: 'employee', canViewReports: true }
    api.request.mockImplementation((c: AxiosRequestConfig) =>
      c.url === '/real-estate/tenants/' ? ok([{ id: 1, fullName: 'Ama Owusu', phone: '0241234567' }]) : ok([])
    )
    renderPage(<TenantsPage />)
    expect(await screen.findByText('Ama Owusu')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Add tenant/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Move tenant in/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit Ama Owusu' })).toBeNull()
  })

  it('sales staff never request repairs or building data', async () => {
    session.user = { tenant: 'belkis', accountType: 'employee', canManageSales: true }
    renderPage(<TenantsPage />)
    expect(await screen.findByRole('button', { name: /Add tenant/ })).toBeTruthy()
    await settle()
    const asked = new Set(lists().map((c) => c.url))
    expect(asked).toEqual(
      new Set(['unit-types', 'properties', 'units', 'tenants', 'leases', 'payments', 'bookings'].map((x) => `/real-estate/${x}/`))
    )
  })
})

describe('real estate: conflicts stay on the form', () => {
  it('409 keeps the drawer open with the server’s message and is not retried', async () => {
    const onOpenChange = vi.fn()
    api.request.mockImplementation((c: AxiosRequestConfig) =>
      c.method === 'POST' ? Promise.reject(fail(409, { status: false, error: 'a room type named "Single room" already exists' })) : ok([])
    )
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RoomTypeForm open onOpenChange={onOpenChange} />
      </QueryClientProvider>
    )
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Single room' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create room type' }))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('a room type named "Single room" already exists')).toBeTruthy()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    await settle()
    expect(api.request.mock.calls.filter(([c]) => c.method === 'POST')).toHaveLength(1)
  })
})
