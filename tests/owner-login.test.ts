// @vitest-environment node
import authConfig from '@/auth.config'
import { LOGIN_CODES, decodeBusinessChoice, encodeBusinessChoice, ownerLoginErrorMessage } from '@/lib/owner-login'

const BUSINESSES = [
  { slug: 'kofi-homes', name: 'Kofi Homes', appType: 'real-estate' },
  { slug: 'kofi-mart', name: 'Kofi’s Café & Mart', appType: 'retail' },
]

const login200 = (tenant: string, appType = 'real-estate') => ({
  status: true,
  data: {
    accessToken: 'a',
    refreshToken: 'r',
    accessTokenExpiry: 9e9,
    refreshTokenExpiry: 9e9,
    user: { id: 5, username: 'Kofi', accountType: 'admin', email: 'kofi@x.com', tenant, appType },
  },
})

const reply = (status: number, body: unknown) =>
  vi.fn(async (_url: unknown, _init?: RequestInit) => new Response(JSON.stringify(body), { status }))

const authorize = (creds: Record<string, string>) => {
  const provider: any = authConfig.providers.find((p: any) => (p.options?.id ?? p.id) === 'credentials')
  return provider.options.authorize(creds, { headers: new Headers({ host: 'localhost:3000' }) })
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.unstubAllGlobals())

describe('business choice code', () => {
  it('round-trips the 409 business list, including non-ASCII names', () => {
    const code = encodeBusinessChoice(BUSINESSES)
    expect(code.startsWith(LOGIN_CODES.chooseBusiness)).toBe(true)
    expect(code).toMatch(/^[\w.-]+$/) // URL-safe: it travels in a query string
    expect(decodeBusinessChoice(code)).toEqual(BUSINESSES)
  })

  it('ignores anything that isn’t a valid choice code', () => {
    expect(decodeBusinessChoice('credentials')).toBeNull()
    expect(decodeBusinessChoice(`${LOGIN_CODES.chooseBusiness}not-json`)).toBeNull()
    expect(decodeBusinessChoice(undefined)).toBeNull()
  })

  it('maps error codes to messages', () => {
    expect(ownerLoginErrorMessage(LOGIN_CODES.invalid)).toBe('Invalid email or password')
    expect(ownerLoginErrorMessage(LOGIN_CODES.suspended)).toMatch(/suspended/)
    expect(ownerLoginErrorMessage(LOGIN_CODES.unavailable)).toMatch(/try again/)
  })
})

describe('owner admin-login (authorize)', () => {
  it('409: surfaces the businesses to choose from; no tenant is sent on the first attempt', async () => {
    const fetchMock = reply(409, {
      status: false,
      error: 'this email owns several businesses, choose one to sign in',
      data: { businesses: BUSINESSES },
    })
    vi.stubGlobal('fetch', fetchMock)
    const err = await authorize({ email: 'Kofi@X.com', password: 'secret123' }).catch((e: any) => e)
    expect(decodeBusinessChoice(err.code)).toEqual(BUSINESSES)
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ email: 'Kofi@X.com', password: 'secret123' })
  })

  it('resends with the chosen tenant (body and header) and signs in on 200', async () => {
    const fetchMock = reply(200, login200('kofi-homes'))
    vi.stubGlobal('fetch', fetchMock)
    const user = await authorize({ email: 'kofi@x.com', password: 'secret123', tenant: 'kofi-homes' })
    const init = fetchMock.mock.calls[0][1]!
    expect(JSON.parse(String(init.body))).toEqual({ email: 'kofi@x.com', password: 'secret123', tenant: 'kofi-homes' })
    expect((init.headers as Record<string, string>)['X-Tenant-Domain']).toBe('kofi-homes')
    expect(user).toMatchObject({ tenant: 'kofi-homes', appType: 'real-estate', accessToken: 'a' })
  })

  it.each([
    [401, { status: false, error: 'invalid email or password' }, LOGIN_CODES.invalid],
    [403, { status: false, error: 'account suspended' }, LOGIN_CODES.suspended],
    [500, { status: false, error: 'boom' }, LOGIN_CODES.unavailable],
  ])('%i → %s', async (status, body, code) => {
    vi.stubGlobal('fetch', reply(status, body))
    const err = await authorize({ email: 'kofi@x.com', password: 'nope' }).catch((e: any) => e)
    expect(err.code).toBe(code)
  })

  it('a 409 without a business list is treated as unavailable, not a picker', async () => {
    vi.stubGlobal('fetch', reply(409, { status: false, error: 'conflict' }))
    const err = await authorize({ email: 'kofi@x.com', password: 'secret123' }).catch((e: any) => e)
    expect(err.code).toBe(LOGIN_CODES.unavailable)
  })
})
