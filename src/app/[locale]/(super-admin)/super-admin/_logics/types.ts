// Records returned by the platform API (proxied through /api/platform/*).

export interface TenantRecord {
  id: number
  name: string
  slug: string
  appType: string
  status: 'active' | 'suspended'
  createdAt: string
  ownerName: string
  ownerEmail: string
}

export interface TenantStats {
  employeeCount: number
  productCount: number
  salesVolume: number
  lastActivityAt?: string
}

export interface PlatformEmployee {
  id: number
  name: string
  email: string
  role: string
  status: 'active' | 'suspended'
}

export type TenantStatus = TenantRecord['status']
