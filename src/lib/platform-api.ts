// Server-only. Talks to the real backend's /api/api/platform/tenants* endpoints using the
// service-to-service PLATFORM_KEY secret — never import this from a client component,
// and never forward that key to the browser.
import { auth } from '@/auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL
const PLATFORM_KEY = process.env.PLATFORM_KEY

export async function requireSuperAdminSession() {
  const session = await auth()
  return session?.user?.accountType === 'super-admin' ? session : null
}

export async function platformFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Platform-Key': PLATFORM_KEY || '',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  })
}
