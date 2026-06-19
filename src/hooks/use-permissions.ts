'use client'

import { useSession } from 'next-auth/react'

export type PermissionKey =
  | 'canViewReports'
  | 'canManageProducts'
  | 'canManageStock'
  | 'canManageSales'
  | 'canManageInvoices'
  | 'canManageOperations'
  | 'canManageWarehouses'
  | 'canManageEmployees'

export interface Permissions extends Record<PermissionKey, boolean> {
  isEmployee: boolean
}

// Admins always get all permissions; employees get only what the JWT holds.
export function usePermissions(): Permissions {
  const { data: session } = useSession()
  const user = session?.user as any
  const isEmployee = user?.accountType === 'employee'

  if (!isEmployee) {
    return {
      isEmployee: false,
      canViewReports: true,
      canManageProducts: true,
      canManageStock: true,
      canManageSales: true,
      canManageInvoices: true,
      canManageOperations: true,
      canManageWarehouses: true,
      canManageEmployees: true,
    }
  }

  return {
    isEmployee: true,
    canViewReports: !!user?.canViewReports,
    canManageProducts: !!user?.canManageProducts,
    canManageStock: !!user?.canManageStock,
    canManageSales: !!user?.canManageSales,
    canManageInvoices: !!user?.canManageInvoices,
    canManageOperations: !!user?.canManageOperations,
    canManageWarehouses: !!user?.canManageWarehouses,
    canManageEmployees: !!user?.canManageEmployees,
  }
}
