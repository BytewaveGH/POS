import { type DefaultSession } from 'next-auth'

export interface ExtendedUser extends DefaultSession['user'] {
  userId: number
  username: string
  accountType: string
  avatar: string
  phone: string
  email: string
  tenant: string
  accessToken: string
  refreshToken: string
  accessTokenExpiry: number
  refreshTokenExpiry: number
}

declare module 'next-auth' {
  interface User {
    id: string
    userId: number
    username: string
    accountType: string
    avatar: string
    phone: string
    email: string
    tenant: string
    accessToken: string
    refreshToken: string
    accessTokenExpiry: number
    refreshTokenExpiry: number
  }
  interface Session {
    user: ExtendedUser
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: number
    username: string
    accountType: string
    avatar: string
    phone: string
    email: string
    tenant: string
    accessToken: string
    refreshToken: string
    accessTokenExpiry: number
    refreshTokenExpiry: number
  }
}
