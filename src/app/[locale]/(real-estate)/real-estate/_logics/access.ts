// Who may read and write each part of the real-estate module. Mirrors the
// backend's checks so we never make a request that is bound to get a 403.
//
//   Area          Read                                     Write
//   catalog       everyone signed in                       canManageProducts   (room types, properties, units)
//   lettings      canManageSales or canViewReports         canManageSales      (tenants, leases, payments, bookings)
//   maintenance   canManageOperations or canViewReports    canManageOperations
//   development   canManageProducts or canViewReports      canManageProducts   (projects, phases, expenses, documents)
//   dashboard     canViewReports                           —
//
// Admins have everything.

import type { Permissions } from '@/hooks/use-permissions'
import type { ResourceName } from './types'

export type Area = 'catalog' | 'lettings' | 'maintenance' | 'development'

export const RESOURCE_AREA: Record<ResourceName, Area> = {
  unitTypes: 'catalog',
  properties: 'catalog',
  units: 'catalog',
  tenants: 'lettings',
  leases: 'lettings',
  payments: 'lettings',
  bookings: 'lettings',
  maintenance: 'maintenance',
  projects: 'development',
  phases: 'development',
  expenses: 'development',
  documents: 'development',
}

export interface AreaAccess {
  read: boolean
  write: boolean
}

export type RealEstateAccess = Record<Area, AreaAccess> & { dashboard: boolean }

type Perms = Pick<Permissions, 'canViewReports' | 'canManageProducts' | 'canManageSales' | 'canManageOperations'>

export const realEstateAccess = (p: Perms): RealEstateAccess => ({
  catalog: { read: true, write: p.canManageProducts },
  lettings: { read: p.canManageSales || p.canViewReports, write: p.canManageSales },
  maintenance: { read: p.canManageOperations || p.canViewReports, write: p.canManageOperations },
  development: { read: p.canManageProducts || p.canViewReports, write: p.canManageProducts },
  dashboard: p.canViewReports,
})

export const FULL_ACCESS: RealEstateAccess = realEstateAccess({
  canViewReports: true,
  canManageProducts: true,
  canManageSales: true,
  canManageOperations: true,
})
