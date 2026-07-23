'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { SheetTemplate } from '@/components/templates/sheet'
import RegisterApp, { TenantRecord } from '../_forms/register-app'
import TenantDetail from '../_widgets/tenant-detail'
import { ROOT_DOMAIN } from '@/lib/tenant'

const STATUS_STYLES: Record<TenantRecord['status'], string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-600',
}

export default function SuperAdminApps() {
  const [tenants, setTenants] = useState<TenantRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<TenantRecord | null>(null)
  const [viewing, setViewing] = useState<TenantRecord | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/tenants')
      const body = await res.json()
      if (!res.ok) throw new Error(body?.message ?? 'Failed to load apps')
      setTenants(body.data ?? [])
      setError('')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load apps')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const handleDelete = async (tenant: TenantRecord) => {
    if (!window.confirm(`Delete "${tenant.name}"? This cannot be undone.`)) return
    await fetch(`/api/tenants/${tenant.id}`, { method: 'DELETE' })
    refetch()
  }

  const toggleStatus = async (tenant: TenantRecord) => {
    await fetch(`/api/tenants/${tenant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: tenant.status === 'active' ? 'suspended' : 'active' }),
    })
    refetch()
  }

  return (
    <div className="w-full">
      <SheetTemplate
        open={modalOpen}
        handleOpen={() => setModalOpen(true)}
        handleClose={() => {
          setModalOpen(false)
          setSelected(null)
        }}
        title={selected ? 'Edit App' : 'Register App'}
        contentBodyClassName="flex flex-col"
        contentClassName="md:min-w-[32rem]"
        content={
          <RegisterApp
            key={selected?.id ?? 'new'}
            mode={selected ? 'update' : 'create'}
            initialData={selected ?? undefined}
            onSuccess={() => {
              setModalOpen(false)
              setSelected(null)
              refetch()
            }}
          />
        }
      />

      <SheetTemplate
        open={!!viewing}
        handleOpen={() => {}}
        handleClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        contentBodyClassName="flex flex-col"
        contentClassName="md:min-w-[42rem]"
        content={viewing ? <TenantDetail tenant={viewing} /> : null}
      />

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="bytewave-heading">Registered Apps</h1>
          <p className="bytewave-paragraph text-gray-500">Every tenant reachable through the app picker</p>
        </div>
        <button
          onClick={() => {
            setSelected(null)
            setModalOpen(true)
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-endeavour text-white rounded-lg text-xs font-semibold hover:bg-veniceBlue transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Register App
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_8rem_7rem_9rem_13rem] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
          <span>Name</span>
          <span>Subdomain</span>
          <span>Type</span>
          <span>Status</span>
          <span>Registered</span>
          <span />
        </div>

        {isLoading ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400 bytewave-paragraph">Loading...</div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-xs text-red-500 bytewave-paragraph">{error}</div>
        ) : tenants.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400 bytewave-paragraph">No apps registered yet</div>
        ) : (
          tenants.map((tenant) => (
            <div
              key={tenant.id}
              className="grid grid-cols-[1fr_1fr_8rem_7rem_9rem_13rem] gap-2 px-4 py-3 border-b border-gray-50 last:border-0 items-center"
            >
              <span className="bytewave-paragraph text-sm text-stone-700 font-medium truncate">{tenant.name}</span>
              <span className="bytewave-paragraph text-sm text-gray-500 truncate">
                {tenant.slug}.{ROOT_DOMAIN || 'yourdomain.com'}
              </span>
              <span className="bytewave-paragraph text-xs text-gray-500 capitalize">{tenant.appType}</span>
              <span
                className={`w-fit inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[tenant.status]}`}
              >
                {tenant.status}
              </span>
              <span className="bytewave-paragraph text-xs text-gray-400">{new Date(tenant.createdAt).toLocaleDateString()}</span>
              <div className="flex items-center gap-2 justify-end">
                <button className="text-xs text-stone-600 hover:underline font-medium" onClick={() => setViewing(tenant)}>
                  View
                </button>
                <span className="text-gray-300">|</span>
                <button
                  className="text-xs text-endeavour hover:underline font-medium"
                  onClick={() => {
                    setSelected(tenant)
                    setModalOpen(true)
                  }}
                >
                  Edit
                </button>
                <span className="text-gray-300">|</span>
                <button className="text-xs text-amber-600 hover:underline font-medium" onClick={() => toggleStatus(tenant)}>
                  {tenant.status === 'active' ? 'Suspend' : 'Activate'}
                </button>
                <span className="text-gray-300">|</span>
                <button className="text-xs text-red-500 hover:underline" onClick={() => handleDelete(tenant)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
