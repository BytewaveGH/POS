import { auth } from '@/auth'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import type { NextRequest } from 'next/server'
import type { NextAuthRequest } from 'next-auth'
import { classifyHost } from '@/lib/tenant'

const intlMiddleware = createMiddleware(routing)

const SELECT_APP_RE = /^\/(en|fr)\/select-app\/?$/
const SUPER_ADMIN_LOGIN_RE = /^\/(en|fr)\/super-admin\/login\/?$/
const SUPER_ADMIN_AREA_RE = /^\/(en|fr)\/super-admin(\/.*)?$/

// Ordered list used to find the first route an employee can access.
// More specific paths must come before their parents (e.g. /products/inventory before /products).
const EMPLOYEE_ROUTE_PRIORITY = [
  { path: '/stores/pos', perm: 'canManageSales' },
  { path: '/stores/overview', perm: 'canViewReports' },
  { path: '/stores/analytics', perm: 'canViewReports' },
  { path: '/stores/orders', perm: 'canManageSales' },
  { path: '/stores/products/inventory', perm: 'canManageStock' },
  { path: '/stores/products/categories', perm: 'canManageWarehouses' },
  { path: '/stores/products', perm: 'canManageProducts' },
  { path: '/stores/customers', perm: 'canManageSales' },
  { path: '/stores/users', perm: 'canManageEmployees' },
  { path: '/stores/settings', perm: 'canManageOperations' },
  { path: '/stores/payment-settings', perm: 'canManageOperations' },
]

function firstAllowedPath(user: any, locale: string): string {
  for (const { path, perm } of EMPLOYEE_ROUTE_PRIORITY) {
    if (user[perm]) return `/${locale}${path}`
  }
  // No permissions at all — send back to staff login
  return `/${locale}/staff`
}

export default auth((req: NextAuthRequest) => {
  const pathname = req.nextUrl.pathname

  // On the root/marketing domain, the only reachable page is the app picker —
  // everything else (including the normal sign-in page) redirects there.
  // Disabled entirely (kind is never 'root') until NEXT_PUBLIC_ROOT_DOMAIN is set.
  const hostKind = classifyHost(req.headers.get('host')).kind
  if (hostKind === 'root') {
    if (SELECT_APP_RE.test(pathname)) {
      return intlMiddleware(req as unknown as NextRequest)
    }
    if (!SUPER_ADMIN_AREA_RE.test(pathname)) {
      const locale = pathname.split('/')[1] === 'fr' ? 'fr' : 'en'
      return Response.redirect(new URL(`/${locale}/select-app`, req.url))
    }
    // Super-admin area — fall through to the auth/permission logic below.
  }

  const isLoggedIn = !!req.auth
  const authUser = req.auth?.user as any

  // The super-admin area is off-limits to anyone but a logged-in super admin
  // (its own login page excepted). Checked before the generic redirect below so
  // an unauthenticated hit lands on /super-admin/login, not the app picker.
  if (SUPER_ADMIN_AREA_RE.test(pathname) && !SUPER_ADMIN_LOGIN_RE.test(pathname)) {
    if (!isLoggedIn || authUser?.accountType !== 'super-admin') {
      const locale = pathname.split('/')[1] === 'fr' ? 'fr' : 'en'
      return Response.redirect(new URL(`/${locale}/super-admin/login`, req.url))
    }
    return intlMiddleware(req as unknown as NextRequest)
  }

  // Locale root + staff login + super-admin login are public
  const isAuthPage =
    /^\/(en|fr)\/?$/.test(pathname) ||
    /^\/(en|fr)\/staff\/?$/.test(pathname) ||
    SUPER_ADMIN_LOGIN_RE.test(pathname) ||
    pathname === '/'

  if (!isLoggedIn && !isAuthPage) {
    return Response.redirect(new URL('/en', req.url))
  }

  // Permission guard for employees
  if (isLoggedIn && req.auth?.user?.accountType === 'employee') {
    const user = req.auth.user as any
    const locale = pathname.split('/')[1] || 'en'

    // Strip locale prefix to get the bare path (e.g. /stores/pos)
    const barePath = pathname.replace(/^\/(en|fr)/, '') || '/'

    // Find which permission this path requires
    const match = EMPLOYEE_ROUTE_PRIORITY.find(({ path }) => barePath === path || barePath.startsWith(path + '/'))

    if (match && !user[match.perm]) {
      return Response.redirect(new URL(firstAllowedPath(user, locale), req.url))
    }
  }

  return intlMiddleware(req as unknown as NextRequest)
})

export const config = {
  matcher: ['/', '/(fr|en)/:path*'],
}
