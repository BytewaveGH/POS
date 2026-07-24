'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Building2, CheckCircle2, Ban, Plus } from 'lucide-react'
import { TenantRecord } from './_forms/register-app'

export default function SuperAdminOverview() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'

  const [tenants, setTenants] = useState<TenantRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/platform/tenants')
        const body = await res.json()
        if (!res.ok) throw new Error(body?.message ?? 'Failed to load apps')
        if (!cancelled) {
          setTenants(body.data ?? [])
          setError('')
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load apps')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Real, from the tenant registry itself
  const totalApps = tenants.length
  const activeCount = tenants.filter((t) => t.status === 'active').length
  const suspendedCount = tenants.filter((t) => t.status === 'suspended').length

  const byAppType = useMemo(() => {
    const counts: Record<string, number> = {}
    tenants.forEach((t) => {
      counts[t.appType] = (counts[t.appType] ?? 0) + 1
    })
    return counts
  }, [tenants])

  const recentTenants = useMemo(
    () => [...tenants].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [tenants]
  )

  if (isLoading) {
    return <div className="px-4 py-8 text-center text-xs text-gray-400 bytewave-paragraph">Loading...</div>
  }
  if (error) {
    return <div className="px-4 py-8 text-center text-xs text-red-500 bytewave-paragraph">{error}</div>
  }

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="bytewave-heading">Platform Overview</h1>
          <p className="bytewave-paragraph text-gray-500">Stats across every business on Bytewave</p>
        </div>
        <Link
          href={`/${locale}/super-admin/apps`}
          className="flex items-center gap-1.5 px-3 py-2 bg-endeavour text-white rounded-lg text-xs font-semibold hover:bg-veniceBlue transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Register App
        </Link>
      </div>

      {/* Real stats — from the tenant registry itself */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="bytewave-paragraph text-xs text-gray-500">Registered apps</p>
            <div className="p-1.5 rounded-lg bg-endeavour">
              <Building2 className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <p className="bytewave-heading text-xl text-stone-800">{totalApps}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="bytewave-paragraph text-xs text-gray-500">Active</p>
            <div className="p-1.5 rounded-lg bg-green-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <p className="bytewave-heading text-xl text-stone-800">{activeCount}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="bytewave-paragraph text-xs text-gray-500">Suspended</p>
            <div className={`p-1.5 rounded-lg ${suspendedCount > 0 ? 'bg-red-500' : 'bg-gray-300'}`}>
              <Ban className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <p className="bytewave-heading text-xl text-stone-800">{suspendedCount}</p>
        </div>
      </div>

      {/* By vertical — real breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
        <p className="bytewave-paragraph text-xs text-gray-500 font-medium">By vertical</p>
        {totalApps === 0 ? (
          <p className="bytewave-paragraph text-xs text-gray-400">No apps registered yet</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(byAppType).map(([type, count]) => (
              <span key={type} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100">
                <span className="bytewave-paragraph text-xs text-gray-500 capitalize">{type}</span>
                <span className="bytewave-paragraph text-xs font-semibold text-stone-700">{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recently registered */}
      <div className="flex flex-col gap-2">
        <p className="bytewave-paragraph text-xs text-gray-500 font-medium px-1">Recently registered</p>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {recentTenants.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400 bytewave-paragraph">No apps registered yet</div>
          ) : (
            recentTenants.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="bytewave-paragraph text-sm text-stone-700 font-medium">{t.name}</p>
                  <p className="bytewave-paragraph text-xs text-gray-400 capitalize">{t.appType}</p>
                </div>
                <p className="bytewave-paragraph text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
