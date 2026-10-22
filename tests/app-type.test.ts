// @vitest-environment node
import authConfig from '@/auth.config'
import { lookupTenantAppType, normalizeAppType } from '@/lib/app-type'
import { redirectPathForAppType } from '@/lib/tenant'

type Reply = { url: RegExp; body: unknown }
const fetchWith = (replies: Reply[]) =>
  vi.fn(async (input: any) => {
    const url = String(input)
    const reply = replies.find((r) => r.url.test(url))
    return new Response(JSON.stringify(reply?.body ?? {}), { status: reply ? 200 : 404 })
  })

const authorize = (providerId: string) => {
  const provider: any = authConfig.providers.find((p: any) => (p.options?.id ?? p.id) === providerId)
  return (creds: Record<string, string>) => provider.options.authorize(creds, { headers: new Headers({ host: 'localhost:3000' }) })
}

const adminLogin = (user: Record<string, unknown>) => ({
  url: /\/auth\/admin-login$/,
  body: {
    status: true,
    data: {
      accessToken: 'a',
      refreshToken: 'r',
      accessTokenExpiry: 9e9,
      refreshTokenExpiry: 9e9,
      user: { id: 1, username: 'Owner', accountType: 'admin', ...user },
    },
  },
})

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => vi.unstubAllGlobals())

describe('app routing follows the tenant’s appType', () => {
  it('admins: routed by user.appType from admin-login', async () => {
    vi.stubGlobal('fetch', fetchWith([adminLogin({ appType: 'eatery', tenant: 'belkis' })]))
    const user = await authorize('credentials')({ email: 'o@x.com', password: 'secret12' })
    expect(user).toMatchObject({ appType: 'eatery', tenant: 'belkis' })
    expect(redirectPathForAppType(user.appType, 'en')).toBe('/en/eatery')
  })

  it('admins: a missing appType falls back to retail with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', fetchWith([adminLogin({ tenant: 'belkis' })]))
    const user = await authorize('credentials')({ email: 'o@x.com', password: 'secret12' })
    expect(user.appType).toBe('retail')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('/auth/admin-login'))
  })

  it('employees: appType comes from the tenant lookup, not the login response', async () => {
    const fetchMock = fetchWith([
      {
        url: /\/employees\/login$/,
        // Even if a field like this appeared, it must not be used.
        body: {
          status: true,
          data: { token: 't', expireAt: 9e9, employee: { id: 42, name: 'Ama', appType: 'retail', canManageSales: true } },
        },
      },
      { url: /\/platform\/tenants\/lookup\?slug=/, body: { status: true, data: { exists: true, appType: 'amusement' } } },
    ])
    vi.stubGlobal('fetch', fetchMock)
    const user = await authorize('employee-credentials')({ email: 'ama@x.com', password: 'pw' })
    expect(user).toMatchObject({ accountType: 'employee', userId: 42, appType: 'amusement' })
    expect(fetchMock.mock.calls.some(([u]) => /\/platform\/tenants\/lookup\?slug=/.test(String(u)))).toBe(true)
    expect(redirectPathForAppType(user.appType, 'en')).toBe('/en/amusement')
  })

  it('employees: unknown tenant / failed lookup falls back to retail with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await lookupTenantAppType('ghost', fetchWith([{ url: /lookup/, body: { status: true, data: { exists: false } } }]))).toBe(
      'retail'
    )
    expect(await lookupTenantAppType('down', vi.fn(async () => Promise.reject(new Error('offline'))) as any)).toBe('retail')
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('normalizeAppType accepts only retail | eatery | amusement', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(normalizeAppType('amusement', 't')).toBe('amusement')
    expect(normalizeAppType('platform', 't')).toBe('retail')
    expect(normalizeAppType(undefined, 't')).toBe('retail')
  })
})
