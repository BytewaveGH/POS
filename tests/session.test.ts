import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(async () => undefined),
}))
vi.mock('next-auth/react', () => auth)

const respondWith = (status: number, body: Record<string, unknown>) => async (config: InternalAxiosRequestConfig) => {
  const response = { status, statusText: '', headers: {}, config, data: body }
  throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, null, response as any)
}

// Fresh module state per test (forceLogout only fires once per page load).
const loadClient = async () => {
  vi.resetModules()
  return (await import('@/lib/axios-client')).apiClient
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  vi.clearAllMocks()
  auth.getSession.mockResolvedValue({ user: { accessToken: 'old', tenant: 'belkis', accountType: 'employee' } })
})

describe('8. tenant-bound sessions', () => {
  it('401 "not bound to a tenant" logs out and explains why', async () => {
    const apiClient = await loadClient()
    apiClient.defaults.adapter = respondWith(401, { status: false, message: 'session is not bound to a tenant, please sign in again' })

    await expect(apiClient.get('/pos/products/barcode/1')).rejects.toBeInstanceOf(AxiosError)
    await flush()
    expect(auth.signOut).toHaveBeenCalledWith({ callbackUrl: '/en/staff?reason=rebind' })

    const { logoutReasonFromSearch } = await import('@/lib/force-logout')
    expect(logoutReasonFromSearch('?reason=rebind')).toMatch(/sign in again/i)
  })

  it('403 "tenant mismatch" also forces a fresh sign-in', async () => {
    auth.getSession.mockResolvedValue({ user: { accessToken: 'tok', tenant: 'belkis', accountType: 'admin' } })
    const apiClient = await loadClient()
    apiClient.defaults.adapter = respondWith(403, { status: false, message: 'tenant mismatch' })

    await expect(apiClient.get('/products/1/aliases')).rejects.toBeInstanceOf(AxiosError)
    await flush()
    expect(auth.signOut).toHaveBeenCalledWith({ callbackUrl: '/en?reason=rebind' })
  })

  it('a 401 that cannot be refreshed (suspended employee) logs out', async () => {
    const apiClient = await loadClient()
    apiClient.defaults.adapter = respondWith(401, { status: false, message: 'Unauthorized' })

    await expect(apiClient.get('/pos/products/barcode/1')).rejects.toBeInstanceOf(AxiosError)
    await flush()
    expect(auth.signOut).toHaveBeenCalledWith({ callbackUrl: '/en/staff?reason=expired' })
  })

  it('other errors (e.g. 403 permission) do not log out', async () => {
    const apiClient = await loadClient()
    apiClient.defaults.adapter = respondWith(403, { status: false, error: 'forbidden' })
    await expect(apiClient.get('/products/1/aliases')).rejects.toBeInstanceOf(AxiosError)
    await flush()
    expect(auth.signOut).not.toHaveBeenCalled()
  })
})

describe('real-estate error contract (interceptor)', () => {
  it('403 "tenant mismatch" on a real-estate call shows an error, without signing out', async () => {
    const apiClient = await loadClient()
    apiClient.defaults.adapter = respondWith(403, { status: false, message: 'tenant mismatch' })
    await expect(apiClient.get('/real-estate/units/')).rejects.toBeInstanceOf(AxiosError)
    await flush()
    expect(auth.signOut).not.toHaveBeenCalled()
  })

  it('403 "session is not bound to a tenant" signs out to sign in again', async () => {
    const apiClient = await loadClient()
    apiClient.defaults.adapter = respondWith(403, { status: false, message: 'session is not bound to a tenant, please sign in again' })
    await expect(apiClient.get('/real-estate/units/')).rejects.toBeInstanceOf(AxiosError)
    await flush()
    expect(auth.signOut).toHaveBeenCalledWith({ callbackUrl: '/en/staff?reason=rebind' })
  })

  it('403 "Forbidden" never refreshes, retries or signs out', async () => {
    auth.getSession.mockResolvedValue({ user: { accessToken: 'tok', refreshToken: 'r', tenant: 'belkis', accountType: 'admin' } })
    const post = vi.spyOn(axios, 'post')
    const apiClient = await loadClient()
    const adapter = vi.fn(respondWith(403, { status: false, message: 'Forbidden' }))
    apiClient.defaults.adapter = adapter
    await expect(apiClient.get('/real-estate/maintenance/')).rejects.toBeInstanceOf(AxiosError)
    await flush()
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(post).not.toHaveBeenCalled()
    expect(auth.signOut).not.toHaveBeenCalled()
    post.mockRestore()
  })

  it('expired access token: one refresh, then the request succeeds with the new token', async () => {
    auth.getSession.mockResolvedValue({ user: { accessToken: 'old', refreshToken: 'r', tenant: 'belkis', accountType: 'admin' } })
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { data: { accessToken: 'new' } } })
    const apiClient = await loadClient()
    const seen: string[] = []
    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const token = String(config.headers.Authorization)
      seen.push(token)
      if (token === 'Bearer new') return { status: 200, statusText: '', headers: {}, config, data: { status: true, data: [] } }
      return respondWith(401, { status: false, message: 'Unauthorized' })(config)
    }
    const res = await apiClient.get('/real-estate/units/')
    expect(res.status).toBe(200)
    expect(post).toHaveBeenCalledTimes(1)
    expect(seen).toEqual(['Bearer old', 'Bearer new'])
    expect(auth.signOut).not.toHaveBeenCalled()
    post.mockRestore()
  })

  it('still 401 after a refresh: sign out, no second refresh', async () => {
    auth.getSession.mockResolvedValue({ user: { accessToken: 'old', refreshToken: 'r', tenant: 'belkis', accountType: 'admin' } })
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { data: { accessToken: 'new' } } })
    const apiClient = await loadClient()
    apiClient.defaults.adapter = respondWith(401, { status: false, message: 'Unauthorized' })
    await expect(apiClient.get('/real-estate/units/')).rejects.toBeInstanceOf(AxiosError)
    await flush()
    expect(post).toHaveBeenCalledTimes(1)
    expect(auth.signOut).toHaveBeenCalledWith({ callbackUrl: '/en?reason=expired' })
    post.mockRestore()
  })

  it('expired refresh token: sign out after the one failed refresh', async () => {
    auth.getSession.mockResolvedValue({ user: { accessToken: 'old', refreshToken: 'r', tenant: 'belkis', accountType: 'admin' } })
    const post = vi.spyOn(axios, 'post').mockRejectedValue(new Error('401'))
    const apiClient = await loadClient()
    apiClient.defaults.adapter = respondWith(401, { status: false, message: 'Unauthorized' })
    await expect(apiClient.get('/real-estate/units/')).rejects.toBeInstanceOf(AxiosError)
    await flush()
    expect(post).toHaveBeenCalledTimes(1)
    expect(auth.signOut).toHaveBeenCalledWith({ callbackUrl: '/en?reason=expired' })
    post.mockRestore()
  })
})
