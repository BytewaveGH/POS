import { auth } from '@/auth'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import type { NextRequest } from 'next/server'
import type { NextAuthRequest } from 'next-auth'

const intlMiddleware = createMiddleware(routing)

export default auth((req: NextAuthRequest) => {
    const isLoggedIn = !!req.auth
    const pathname = req.nextUrl.pathname

    // Locale root pages are the login page — no auth required
    const isAuthPage = /^\/(en|fr)\/?$/.test(pathname) || pathname === '/'

    if (!isLoggedIn && !isAuthPage) {
        const loginUrl = new URL('/en', req.url)
        return Response.redirect(loginUrl)
    }

    return intlMiddleware(req as unknown as NextRequest)
})

export const config = {
    matcher: ['/', '/(fr|en)/:path*'],
}
