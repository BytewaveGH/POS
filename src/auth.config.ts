import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import type { ExtendedUser } from './types/next-auth'
import { SignInFormSchema } from './types/schemas/schema'
import { IAuth } from './types/interfaces'

const whichTenant = (req: Request): string => {
  const host = req.headers.get('host')
  switch (host) {
    case 'localhost:3000':
    case '127.0.0.1:3000': {
      return 'admin'
    }
    default: {
      // const tenant = host?.split('.')[0]!
      // return tenant
      return 'admin'
    }
  }
}

async function loginRequest(body: { email: string; password: string }, tenant: string): Promise<(IAuth.Response['data'] & { tenant: string }) | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Domain': tenant || "admin" },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const text = await response.text()
      console.error('[auth] backend error', response.status, text)
      return null
    }
    const data: IAuth.Response = await response.json()
    return { ...data.data, tenant }
  } catch (err) {
    console.error('[auth] loginRequest failed:', err)
    return null
  }
}

const toAbsoluteExpiry = (v: number) =>
  v < 86400 ? Math.floor(Date.now() / 1000) + v : v

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
      ...tokenObject,
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

export default {
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const parsed = SignInFormSchema.safeParse(credentials)
        if (!parsed.success) return null
        const tenant = whichTenant(req as Request)
        const res = await loginRequest(parsed.data, tenant)
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
