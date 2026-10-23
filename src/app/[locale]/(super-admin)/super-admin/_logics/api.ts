'use client'

// Super-admin data access. Everything goes through the Next.js /api/platform/*
// routes, which add the server-only platform key — never call the backend's
// /platform endpoints from the browser directly.

import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { TenantServices } from '@/lib/tenant-services'
import type { PlatformEmployee, TenantRecord, TenantStats, TenantStatus } from './types'

const call = async <T>(url: string, init?: RequestInit, fallback = 'Something went wrong'): Promise<T> => {
  const res = await fetch(url, init?.body ? { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } } : init)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.message ?? fallback)
  return body?.data as T
}

export const platformApi = {
  tenants: () => call<TenantRecord[]>('/api/platform/tenants', undefined, 'Couldn’t load apps').then((d) => d ?? []),
  create: (body: { name: string; slug: string; appType: string; ownerName: string; ownerEmail: string; password: string }) =>
    call<TenantRecord>('/api/platform/tenants', { method: 'POST', body: JSON.stringify(body) }, 'Couldn’t register the app'),
  update: (id: number, body: Partial<Pick<TenantRecord, 'name' | 'slug' | 'appType' | 'status'>>) =>
    call<TenantRecord>(`/api/platform/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, 'Couldn’t update the app'),
  remove: (id: number) => call<void>(`/api/platform/tenants/${id}`, { method: 'DELETE' }, 'Couldn’t delete the app'),
  stats: (id: number) => call<TenantStats>(`/api/platform/tenants/${id}/stats`, undefined, 'Couldn’t load stats'),
  employees: (id: number) =>
    call<PlatformEmployee[]>(`/api/platform/tenants/${id}/employees`, undefined, 'Couldn’t load staff').then((d) => d ?? []),
  setEmployeeStatus: (id: number, employeeId: number, status: TenantStatus) =>
    call<PlatformEmployee>(
      `/api/platform/tenants/${id}/employees/${employeeId}`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      'Couldn’t update staff member'
    ),
  // Public lookup — used to show subdomain availability while typing.
  slugTaken: async (slug: string) => (await TenantServices.Resolve(slug)).exists,
}

const KEY = ['platform'] as const

// One shared empty list: a fresh `[]` per render would re-trigger every
// effect/memo that depends on the list while it loads.
const NO_TENANTS: TenantRecord[] = []

export const useTenants = () => {
  const q = useQuery({ queryKey: [...KEY, 'tenants'], queryFn: platformApi.tenants, staleTime: 30_000 })
  return { ...q, data: q.data ?? NO_TENANTS }
}

export const useTenantStats = (id: number | null) =>
  useQuery({
    queryKey: [...KEY, 'stats', id],
    queryFn: () => platformApi.stats(id!),
    enabled: id !== null,
    staleTime: 60_000,
    retry: false,
  })

// Stats for many apps at once (small N — one request each).
export const useTenantsStats = (ids: number[]) =>
  useQueries({
    queries: ids.map((id) => ({ queryKey: [...KEY, 'stats', id], queryFn: () => platformApi.stats(id), staleTime: 60_000, retry: false })),
  })

export const useTenantEmployees = (id: number | null) =>
  useQuery({ queryKey: [...KEY, 'employees', id], queryFn: () => platformApi.employees(id!), enabled: id !== null, retry: false })

export const usePlatformActions = () => {
  const qc = useQueryClient()
  const tenantsKey = [...KEY, 'tenants']
  const refresh = () => qc.invalidateQueries({ queryKey: KEY })

  const run = async <T>(fn: () => Promise<T>, success?: string): Promise<T> => {
    try {
      const out = await fn()
      if (success) toast.success(success)
      await refresh()
      return out
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      throw err
    }
  }

  // Optimistic: the status pill flips immediately and rolls back on failure.
  const setStatus = async (tenant: TenantRecord, status: TenantStatus) => {
    const previous = qc.getQueryData<TenantRecord[]>(tenantsKey)
    qc.setQueryData<TenantRecord[]>(tenantsKey, (list) => list?.map((t) => (t.id === tenant.id ? { ...t, status } : t)))
    try {
      await run(
        () => platformApi.update(tenant.id, { status }),
        status === 'suspended' ? `${tenant.name} suspended` : `${tenant.name} reactivated`
      )
    } catch {
      qc.setQueryData(tenantsKey, previous)
    }
  }

  return {
    create: (body: Parameters<typeof platformApi.create>[0]) => run(() => platformApi.create(body)),
    update: (id: number, body: Parameters<typeof platformApi.update>[1]) => run(() => platformApi.update(id, body), 'Changes saved'),
    remove: (tenant: TenantRecord) => run(() => platformApi.remove(tenant.id), `${tenant.name} deleted`),
    setStatus,
    setManyStatus: async (tenants: TenantRecord[], status: TenantStatus) => {
      const results = await Promise.allSettled(tenants.map((t) => platformApi.update(t.id, { status })))
      const failed = results.filter((r) => r.status === 'rejected').length
      await refresh()
      if (failed) toast.error(`${failed} of ${tenants.length} couldn’t be updated`)
      else toast.success(`${tenants.length} app${tenants.length === 1 ? '' : 's'} ${status === 'suspended' ? 'suspended' : 'reactivated'}`)
    },
    setEmployeeStatus: (tenantId: number, employee: PlatformEmployee, status: TenantStatus) =>
      run(
        () => platformApi.setEmployeeStatus(tenantId, employee.id, status),
        status === 'suspended' ? `${employee.name} suspended` : `${employee.name} reactivated`
      ),
  }
}
