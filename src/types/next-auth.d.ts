import { type DefaultSession } from 'next-auth'

interface PostDataOptions extends AxiosRequestConfig {
  headers?: {
    [key: string]: string
  }
}

export interface ExtendedUser extends DefaultSession['user'] {
  userId: number
  displayName: string
  email: string
  avatar: string
  accessToken: string
  refreshToken: string
  accessTokenExpiry: number
  refreshTokenExpiry: number
  tenant: string
}
declare module 'next-auth' {
  interface Session {
    user: ExtendedUser
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken: string
    refreshToken: string
    accessTokenExpiry: number
    refreshTokenExpiry: number
    userId: number
    displayName: string
    email: string
    avatar: string
    tenant: string
  }
}
