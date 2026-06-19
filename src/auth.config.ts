import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import type { ExtendedUser } from './types/next-auth'
import { SignInFormSchema } from './types/schemas/schema'
import { IAuth } from './types/interfaces'
import * as z from 'zod'

const EmployeeSignInSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
})

// ── Permission defaults ───────────────────────────────────────────────────────
const ADMIN_PERMS = {
  canViewReports: true,
  canManageProducts: true,
  canManageStock: true,
  canManageSales: true,
  canManageInvoices: true,
  canManageOperations: true,
  canManageWarehouses: true,
  canManageEmployees: true,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const whichTenant = (req: Request): string => {
  const host = req.headers.get('host')
  switch (host) {
    case 'localhost:3000':
    case '127.0.0.1:3000':
      return 'admin'
    default:
      return 'admin'
  }
}

async function adminLoginRequest(
  body: { email: string; password: string },
  tenant: string
): Promise<(IAuth.Response['data'] & { tenant: string }) | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Domain': tenant || 'admin' },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const text = await response.text()
      console.error('[auth] admin login error', response.status, text)
      return null
    }
    const data: IAuth.Response = await response.json()
    return { ...data.data, tenant }
  } catch (err) {
    console.error('[auth] adminLoginRequest failed:', err)
    return null
  }
}

async function employeeLoginRequest(body: { email: string; password: string }, tenant: string): Promise<any | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/employees/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Domain': tenant || 'admin' },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const text = await response.text()
      console.error('[auth] employee login error', response.status, text)
      return null
    }
    const raw = await response.json()
    console.log('[auth] employee login response:', JSON.stringify(raw))
    // Support both { data: { user, accessToken, ... } } and flat { user, accessToken, ... }
    const payload = raw.data ?? raw
    return { ...payload, tenant }
  } catch (err) {
    console.error('[auth] employeeLoginRequest failed:', err)
    return null
  }
}

const toAbsoluteExpiry = (v: number | undefined | null): number => {
  if (!v || isNaN(Number(v))) return Math.floor(Date.now() / 1000) + 3600
  const n = Number(v)
  return n < 86400 ? Math.floor(Date.now() / 1000) + n : n
}

async function refreshAccessToken(tokenObject: any) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Refresh-Token': tokenObject.refreshToken as string,
        'X-Tenant-Domain': (tokenObject?.tenant as string) || 'admin',
      },
    })
    if (!response.ok) return { ...tokenObject, error: 'RefreshAccessTokenError' }
    const data: IAuth.Response = await response.json()
    return {
      ...tokenObject, // preserves permission fields for employees
      userId: data.data.user.id,
      username: data.data.user.username,
      accountType: data.data.user.accountType,
      avatar: data.data.user.avatar,
      phone: data.data.user.phone,
      email: data.data.user.email,
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken,
      accessTokenExpiry: toAbsoluteExpiry(data.data.accessTokenExpiry),
      refreshTokenExpiry: toAbsoluteExpiry(data.data.refreshTokenExpiry),
      error: undefined,
    }
  } catch {
    return { ...tokenObject, error: 'RefreshAccessTokenError' }
  }
}

// ── Auth config ───────────────────────────────────────────────────────────────

export default {
  providers: [
    // Admin / store owner login
    Credentials({
      id: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const parsed = SignInFormSchema.safeParse(credentials)
        if (!parsed.success) return null
        const tenant = whichTenant(req as Request)
        const res = await adminLoginRequest(parsed.data, tenant)
        if (!res) return null
        return {
          id: String(res.user.id),
          userId: res.user.id,
          username: res.user.username,
          accountType: res.user.accountType,
          avatar: res.user.avatar,
          phone: res.user.phone,
          email: res.user.email,
          tenant: res.tenant,
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          accessTokenExpiry: res.accessTokenExpiry,
          refreshTokenExpiry: res.refreshTokenExpiry,
          ...ADMIN_PERMS,
        }
      },
    }),

    // Employee / staff login
    Credentials({
      id: 'employee-credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        try {
          const parsed = EmployeeSignInSchema.safeParse(credentials)
          if (!parsed.success) {
            console.error('[auth] employee schema parse failed:', parsed.error.flatten())
            return null
          }
          const tenant = whichTenant(req as Request)
          const res = await employeeLoginRequest(
            { email: parsed.data.email, password: parsed.data.password },
            tenant
          )
          if (!res) return null

          // Support { user: {...}, accessToken } and flat { id, email, accessToken }
          const emp = res.user ?? res
          if (!emp?.id) {
            console.error('[auth] employee login: no user id in response', JSON.stringify(res))
            return null
          }

          // Permissions may sit on emp directly or under emp.permissions
          const perms = emp.permissions ?? emp
          return {
            id:                  String(emp.id),
            userId:              emp.id,
            username:            emp.username         ?? emp.name         ?? '',
            accountType:         'employee' as const,
            avatar:              emp.avatar           ?? emp.profilePicture ?? '',
            phone:               emp.phone            ?? '',
            email:               emp.email            ?? parsed.data.email,
            tenant:              res.tenant           ?? tenant,
            accessToken:         res.accessToken      ?? res.token        ?? '',
            refreshToken:        res.refreshToken     ?? '',
            accessTokenExpiry:   toAbsoluteExpiry(res.accessTokenExpiry  ?? res.expiresIn),
            refreshTokenExpiry:  toAbsoluteExpiry(res.refreshTokenExpiry ?? res.refreshExpiresIn),
            canViewReports:      !!(perms.canViewReports      ?? false),
            canManageProducts:   !!(perms.canManageProducts   ?? false),
            canManageStock:      !!(perms.canManageStock       ?? false),
            canManageSales:      !!(perms.canManageSales       ?? false),
            canManageInvoices:   !!(perms.canManageInvoices    ?? false),
            canManageOperations: !!(perms.canManageOperations  ?? false),
            canManageWarehouses: !!(perms.canManageWarehouses  ?? false),
            canManageEmployees:  !!(perms.canManageEmployees   ?? false),
          }
        } catch (err) {
          console.error('[auth] employee authorize threw:', err)
          return null
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, session, trigger }) {
      if (trigger === 'update') return { ...token, ...session.user }
      if (user) {
        const u = user as ExtendedUser
        token.userId = u.userId
        token.username = u.username
        token.accountType = u.accountType
        token.avatar = u.avatar
        token.phone = u.phone
        token.email = u.email
        token.tenant = u.tenant
        token.accessToken = u.accessToken
        token.refreshToken = u.refreshToken
        token.accessTokenExpiry = toAbsoluteExpiry(u.accessTokenExpiry)
        token.refreshTokenExpiry = toAbsoluteExpiry(u.refreshTokenExpiry)
        token.exp = toAbsoluteExpiry(u.refreshTokenExpiry)
        // Permissions (admins always get all; employees get what the API returned)
        token.canViewReports = u.canViewReports
        token.canManageProducts = u.canManageProducts
        token.canManageStock = u.canManageStock
        token.canManageSales = u.canManageSales
        token.canManageInvoices = u.canManageInvoices
        token.canManageOperations = u.canManageOperations
        token.canManageWarehouses = u.canManageWarehouses
        token.canManageEmployees = u.canManageEmployees
        return token
      }

      const shouldRefreshTime = (token.accessTokenExpiry as number) - 5 * 60 - Math.floor(Date.now() / 1000)
      if (shouldRefreshTime > 0) return token

      return refreshAccessToken(token)
    },

    async session({ token, session }) {
      session.user.userId = token.userId as number
      session.user.username = token.username as string
      session.user.accountType = token.accountType as string
      session.user.avatar = token.avatar as string
      session.user.phone = token.phone as string
      session.user.email = token.email as string
      session.user.tenant = token.tenant as string
      session.user.accessToken = token.accessToken as string
      session.user.refreshToken = token.refreshToken as string
      session.user.accessTokenExpiry = token.accessTokenExpiry as number
      session.user.refreshTokenExpiry = token.refreshTokenExpiry as number
      session.user.canViewReports = token.canViewReports as boolean
      session.user.canManageProducts = token.canManageProducts as boolean
      session.user.canManageStock = token.canManageStock as boolean
      session.user.canManageSales = token.canManageSales as boolean
      session.user.canManageInvoices = token.canManageInvoices as boolean
      session.user.canManageOperations = token.canManageOperations as boolean
      session.user.canManageWarehouses = token.canManageWarehouses as boolean
      session.user.canManageEmployees = token.canManageEmployees as boolean
      return session
    },
  },

  session: { strategy: 'jwt' },
  pages: {
    signIn: '/en',
    signOut: '/en',
    error: '/en',
  },
  secret: process.env.BETTER_AUTH_SECRET,
} satisfies NextAuthConfig
