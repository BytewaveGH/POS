import { type DefaultSession } from 'next-auth'

export interface EmployeePermissions {
  canViewReports: boolean
  canManageProducts: boolean
  canManageStock: boolean
  canManageSales: boolean
  canManageInvoices: boolean
  canManageOperations: boolean
  canManageWarehouses: boolean
  canManageEmployees: boolean
}

export interface ExtendedUser extends DefaultSession['user'], EmployeePermissions {
  userId: number
  username: string
  accountType: string
  avatar: string
  phone: string
  email: string
  tenant: string
  // Which vertical this tenant runs (retail | eatery | amusement | ...). Optional —
  // falls back to 'retail' for accounts with no tenant association.
  appType?: string
  accessToken: string
  refreshToken: string
  accessTokenExpiry: number
  refreshTokenExpiry: number
}

declare module 'next-auth' {
  interface User extends EmployeePermissions {
    id: string
    userId: number
    username: string
    accountType: string
    avatar: string
    phone: string
    email: string
    tenant: string
    appType?: string
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
  interface JWT extends EmployeePermissions {
    userId: number
    username: string
    accountType: string
    avatar: string
    phone: string
    email: string
    tenant: string
    appType?: string
    accessToken: string
    refreshToken: string
    accessTokenExpiry: number
    refreshTokenExpiry: number
  }
}
