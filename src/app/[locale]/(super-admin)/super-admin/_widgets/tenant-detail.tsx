'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Users, Package, TrendingUp, Info } from 'lucide-react'
import { TenantRecord } from '../_forms/register-app'
import { ROOT_DOMAIN } from '@/lib/tenant'

interface TenantStats {
  employeeCount: number
  productCount: number
  salesVolume: number
}

interface Employee {
  id: number
  name: string
  email: string
  role: string
  status: 'active' | 'suspended'
}

interface TenantDetailProps {
  tenant: TenantRecord
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-600',
}

export default function TenantDetail({ tenant }: TenantDetailProps) {
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [statsError, setStatsError] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(true)
  const [employeesError, setEmployeesError] = useState('')
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const refetchEmployees = useCallback(async () => {
    setEmployeesLoading(true)
    try {
      const res = await fetch(`/api/platform/tenants/${tenant.id}/employees`)
      const body = await res.json()
      if (!res.ok) throw new Error(body?.message ?? 'Failed to load staff')
      setEmployees(body.data ?? [])
      setEmployeesError('')
    } catch (err: any) {
      setEmployeesError(err?.message ?? 'Failed to load staff')
    } finally {
      setEmployeesLoading(false)
    }
  }, [tenant.id])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/platform/tenants/${tenant.id}/stats`)
        const body = await res.json()
        if (!res.ok) throw new Error(body?.message ?? 'Failed to load stats')
        if (!cancelled) setStats(body.data)
      } catch (err: any) {
        if (!cancelled) setStatsError(err?.message ?? 'Failed to load stats')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tenant.id])

  useEffect(() => {
    refetchEmployees()
  }, [refetchEmployees])

  const toggleEmployeeStatus = async (employee: Employee) => {
    setUpdatingId(employee.id)
    try {
      await fetch(`/api/platform/tenants/${tenant.id}/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: employee.status === 'active' ? 'suspended' : 'active' }),
      })
      await refetchEmployees()
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-center justify-between px-1">
        <p className="bytewave-paragraph text-xs text-gray-400">
          {tenant.slug}.{ROOT_DOMAIN || 'yourdomain.com'} · <span className="capitalize">{tenant.appType}</span> · Registered{' '}
          {new Date(tenant.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Owner — the real, working login for this tenant */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-1">
        <p className="bytewave-paragraph text-xs text-gray-500 font-medium">Owner login</p>
        <p className="bytewave-paragraph text-sm text-stone-700 font-medium">{tenant.ownerName}</p>
        <p className="bytewave-paragraph text-sm text-gray-500">{tenant.ownerEmail}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-1.5 px-1">
        <p className="bytewave-paragraph text-xs text-gray-500 font-medium">Activity overview</p>
        <span title="Until per-tenant database isolation is wired up, these counts reflect the whole shared database.">
          <Info className="h-3 w-3 text-gray-300" />
        </span>
      </div>
      {statsError ? (
        <p className="text-xs text-red-500 px-1">{statsError}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="bytewave-paragraph text-xs text-gray-500">Employees</p>
              <div className="p-1.5 rounded-lg bg-endeavour">
                <Users className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <p className="bytewave-heading text-xl text-stone-800">{stats?.employeeCount ?? '—'}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="bytewave-paragraph text-xs text-gray-500">Products</p>
              <div className="p-1.5 rounded-lg bg-purple-500">
                <Package className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <p className="bytewave-heading text-xl text-stone-800">{stats?.productCount ?? '—'}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="bytewave-paragraph text-xs text-gray-500">Sales volume</p>
              <div className="p-1.5 rounded-lg bg-green-500">
                <TrendingUp className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <p className="bytewave-heading text-xl text-stone-800">{stats ? `₵${Number(stats.salesVolume).toLocaleString()}` : '—'}</p>
          </div>
        </div>
      )}

      {/* Staff */}
      <div className="flex flex-col gap-2">
        <p className="bytewave-paragraph text-xs text-gray-500 font-medium px-1">Staff</p>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_7rem_6rem_5rem] gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
            <span />
          </div>
          {employeesLoading ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400 bytewave-paragraph">Loading...</div>
          ) : employeesError ? (
            <div className="px-4 py-6 text-center text-xs text-red-500 bytewave-paragraph">{employeesError}</div>
          ) : employees.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400 bytewave-paragraph">No staff accounts yet</div>
          ) : (
            employees.map((employee) => (
              <div
                key={employee.id}
                className="grid grid-cols-[1fr_1fr_7rem_6rem_5rem] gap-2 px-4 py-2.5 border-b border-gray-50 last:border-0 items-center"
              >
                <span className="bytewave-paragraph text-sm text-stone-700 truncate">{employee.name}</span>
                <span className="bytewave-paragraph text-sm text-gray-500 truncate">{employee.email}</span>
                <span className="bytewave-paragraph text-xs text-gray-500 capitalize">{employee.role}</span>
                <span
                  className={`w-fit inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                    STATUS_STYLES[employee.status] ?? 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {employee.status}
                </span>
                <button
                  disabled={updatingId === employee.id}
                  onClick={() => toggleEmployeeStatus(employee)}
                  className="text-xs text-amber-600 hover:underline font-medium disabled:opacity-50 text-left"
                >
                  {employee.status === 'active' ? 'Suspend' : 'Activate'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
