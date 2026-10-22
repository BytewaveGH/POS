import { AxiosError, type InternalAxiosRequestConfig } from 'axios'

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
