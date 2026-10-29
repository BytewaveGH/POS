'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Ban, CheckCircle2, Download, ExternalLink, LayoutGrid, List, Plus, Search, Store, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROOT_DOMAIN } from '@/lib/tenant'
import { Button, Card, EmptyState, ErrorNote, PageHeader, Skeleton } from '@/components/kit/ui'
import { Segmented } from '@/components/kit/form'
import { usePlatformActions, useTenants } from '../_logics/api'
import { filterTenants, tenantHost, tenantUrl, tenantsToCsv, type TenantSort } from '../_logics/insights'
import { VERTICALS, verticalMeta } from '../_logics/verticals'
import type { TenantRecord, TenantStatus } from '../_logics/types'
import { AppAvatar, CopyButton, StatusPill, VerticalBadge, fullDate, timeAgo } from '../_components/bits'
import { AppActionsMenu } from '../_components/app-actions'
import { ConfirmDeleteApp } from '../_components/confirm-delete'
import { EditAppDrawer } from '../_components/app-forms'
import { useConsole } from '../_components/console-context'
import { useBillingBook } from '../_logics/billing'
import { BillingPill } from '@/components/billing/bits'

const VIEW_KEY = 'sellix-console-apps-view'

const downloadCsv = (tenants: TenantRecord[], name: string) => {
  const blob = new Blob(['﻿' + tenantsToCsv(tenants, ROOT_DOMAIN)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export default function SuperAdminApps() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const base = `/${locale}/super-admin`
  const { openRegister } = useConsole()
  const actions = usePlatformActions()
  const { data: tenants = [], isLoading, error } = useTenants()
  const { view: billing } = useBillingBook()
  const billingById = useMemo(() => new Map(billing?.rows.map((r) => [r.tenant.id, r])), [billing])
  const billingOf = (id: number) => billingById.get(id) ?? null

  const [query, setQuery] = useState('')
  const [vertical, setVertical] = useState<string>('all')
  const [status, setStatus] = useState<TenantStatus | 'all'>('all')
  const [sort, setSort] = useState<TenantSort>('newest')
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<TenantRecord | null>(null)
  const [deleting, setDeleting] = useState<TenantRecord | null>(null)

  // ?status=suspended (sidebar link) and the remembered view.
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('status')
    if (s === 'active' || s === 'suspended') setStatus(s)
    try {
      const v = localStorage.getItem(VIEW_KEY)
      if (v === 'cards' || v === 'table') setView(v)
    } catch {}
  }, [])
  const chooseView = (v: 'table' | 'cards') => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {}
  }

  const list = useMemo(() => filterTenants(tenants, { query, vertical, status, sort }), [tenants, query, vertical, status, sort])
  const verticalCounts = useMemo(() => {
    const m = new Map<string, number>()
    tenants.forEach((t) => m.set(t.appType, (m.get(t.appType) ?? 0) + 1))
    return m
  }, [tenants])
  const filtered = query.trim() !== '' || vertical !== 'all' || status !== 'all'

  // Selection only ever contains visible rows.
  useEffect(() => {
    setSelected((cur) => {
      const kept = Array.from(cur).filter((id) => list.some((t) => t.id === id))
      return kept.length === cur.size ? cur : new Set(kept)
    })
  }, [list])
  const selectedTenants = list.filter((t) => selected.has(t.id))
  const allSelected = list.length > 0 && selectedTenants.length === list.length
  const toggle = (id: number) =>
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const rowProps = (t: TenantRecord) => ({
    tenant: t,
    href: `${base}/apps/${t.id}`,
    onEdit: () => setEditing(t),
    onToggleStatus: () => void actions.setStatus(t, t.status === 'active' ? 'suspended' : 'active'),
    onDelete: () => setDeleting(t),
  })

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Apps"
        description="Every business on Bytewave — its address, owner and status."
        actions={
          <>
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => downloadCsv(list, `bytewave-apps-${new Date().toISOString().slice(0, 10)}.csv`)}
              disabled={list.length === 0}
            >
              Export CSV
            </Button>
            <Button icon={Plus} onClick={openRegister}>
              Register app
            </Button>
          </>
        }
      />
      {error && <ErrorNote message={error.message} />}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, subdomain, owner, email"
              aria-label="Search apps"
              className="w-full h-10 rounded-xl border border-stone-200 bg-white pl-9 pr-9 text-base sm:text-sm focus:outline-none focus:border-endeavour focus:ring-2 focus:ring-endeavour/15"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="md:w-72">
            <Segmented
              ariaLabel="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: `All ${tenants.length}` },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
              ]}
            />
          </div>
          <div className="flex items-center gap-2 md:ml-auto">
            <label htmlFor="apps-sort" className="sr-only">
              Sort
            </label>
            <select
              id="apps-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as TenantSort)}
              className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 focus:outline-none focus:border-endeavour"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
            </select>
            <div className="inline-flex rounded-xl border border-stone-200 bg-white p-0.5" role="group" aria-label="View">
              {[
                { v: 'table' as const, icon: List, label: 'Table view' },
                { v: 'cards' as const, icon: LayoutGrid, label: 'Card view' },
              ].map(({ v, icon: Icon, label }) => (
                <button
                  key={v}
                  type="button"
                  aria-label={label}
                  aria-pressed={view === v}
                  onClick={() => chooseView(v)}
                  className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center',
                    view === v ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[{ value: 'all', label: 'All verticals' }, ...VERTICALS.map((v) => ({ value: v.value, label: v.short }))].map((v) => {
            const on = vertical === v.value
            const count = v.value === 'all' ? tenants.length : (verticalCounts.get(v.value) ?? 0)
            return (
              <button
                key={v.value}
                type="button"
                aria-pressed={on}
                onClick={() => setVertical(v.value)}
                className={cn(
                  'h-9 px-3 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors inline-flex items-center gap-1.5',
                  on ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                )}
              >
                {v.value !== 'all' && <span className="h-2 w-2 rounded-full" style={{ background: verticalMeta(v.value).color }} />}
                {v.label}
                <span className={cn('tabular-nums text-[10px]', on ? 'text-white/70' : 'text-stone-400')}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bulk bar */}
      {selectedTenants.length > 0 && (
        <div className="sticky top-16 lg:top-4 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-stone-900 text-white px-4 py-2.5 shadow-lg">
          <span className="text-sm font-semibold mr-2">{selectedTenants.length} selected</span>
          <Button
            size="sm"
            variant="secondary"
            icon={Ban}
            onClick={() =>
              void actions.setManyStatus(
                selectedTenants.filter((t) => t.status === 'active'),
                'suspended'
              )
            }
            disabled={!selectedTenants.some((t) => t.status === 'active')}
          >
            Suspend
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={CheckCircle2}
            onClick={() =>
              void actions.setManyStatus(
                selectedTenants.filter((t) => t.status === 'suspended'),
                'active'
              )
            }
            disabled={!selectedTenants.some((t) => t.status === 'suspended')}
          >
            Reactivate
          </Button>
          <Button size="sm" variant="secondary" icon={Download} onClick={() => downloadCsv(selectedTenants, 'bytewave-apps-selected.csv')}>
            Export
          </Button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs font-semibold text-white/70 hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No apps yet"
          description="Register a business to give it a subdomain and an owner login."
          action={
            <Button icon={Plus} onClick={openRegister}>
              Register app
            </Button>
          }
        />
      ) : list.length === 0 ? (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-stone-900">No apps match</p>
          <p className="text-xs text-stone-500 mt-1">Try a different search or filter.</p>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setVertical('all')
                setStatus('all')
              }}
              className="mt-3 text-xs font-semibold text-endeavour hover:underline"
            >
              Clear filters
            </button>
          )}
        </Card>
      ) : view === 'table' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60 text-[11px] font-bold uppercase tracking-wide text-stone-400">
                  <th className="w-12 pl-5 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      className="h-4 w-4 accent-endeavour"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(list.map((t) => t.id)))}
                    />
                  </th>
                  <th className="py-3 pr-4">App</th>
                  <th className="py-3 pr-4">Address</th>
                  <th className="py-3 pr-4">Vertical</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Plan</th>
                  <th className="py-3 pr-4">Registered</th>
                  <th className="py-3 pr-4 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {list.map((t) => (
                  <tr
                    key={t.id}
                    className={cn('group hover:bg-stone-50/70 transition-colors', selected.has(t.id) && 'bg-endeavour/[0.03]')}
                  >
                    <td className="pl-5 py-3.5">
                      <input
                        type="checkbox"
                        aria-label={`Select ${t.name}`}
                        className="h-4 w-4 accent-endeavour"
                        checked={selected.has(t.id)}
                        onChange={() => toggle(t.id)}
                      />
                    </td>
                    <td className="py-3.5 pr-4">
                      <Link href={`${base}/apps/${t.id}`} className="flex items-center gap-3 min-w-0">
                        <AppAvatar name={t.name} appType={t.appType} status={t.status} />
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-stone-900 truncate group-hover:text-endeavour">{t.name}</span>
                          <span className="block text-xs text-stone-500 truncate">
                            {t.ownerName} · {t.ownerEmail}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-sm text-stone-600 font-mono truncate max-w-[220px]">{tenantHost(t.slug, ROOT_DOMAIN)}</span>
                        <CopyButton value={tenantUrl(t.slug, ROOT_DOMAIN)} label="Copy sign-in link" />
                        <a
                          href={tenantUrl(t.slug, ROOT_DOMAIN)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${t.name}`}
                          className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-stone-400 hover:text-endeavour hover:bg-stone-100"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <VerticalBadge appType={t.appType} />
                    </td>
                    <td className="py-3.5 pr-4">
                      <StatusPill status={t.status} />
                    </td>
                    <td className="py-3.5 pr-4">
                      {billingOf(t.id) ? (
                        <Link href={`${base}/apps/${t.id}?tab=billing`} className="flex flex-col items-start gap-1">
                          <span className="text-sm font-semibold text-stone-800">{billingOf(t.id)!.access.plan?.name ?? '—'}</span>
                          <BillingPill state={billingOf(t.id)!.access.state} />
                        </Link>
                      ) : (
                        <span className="text-sm text-stone-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="block text-sm text-stone-700">{timeAgo(t.createdAt)}</span>
                      <span className="block text-[11px] text-stone-400">{fullDate(t.createdAt)}</span>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <AppActionsMenu {...rowProps(t)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-stone-100 text-xs text-stone-500">
            Showing {list.length} of {tenants.length}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => (
            <Card
              key={t.id}
              className={cn(
                'p-5 flex flex-col gap-4 transition-shadow hover:shadow-[0_8px_24px_-14px_rgba(28,25,23,0.35)]',
                selected.has(t.id) && 'ring-2 ring-endeavour/30'
              )}
            >
              <div className="flex items-start gap-3">
                <AppAvatar name={t.name} appType={t.appType} status={t.status} size="lg" />
                <div className="min-w-0 flex-1">
                  <Link href={`${base}/apps/${t.id}`} className="block text-base font-bold text-stone-900 truncate hover:text-endeavour">
                    {t.name}
                  </Link>
                  <p className="text-xs text-stone-500 font-mono truncate">{tenantHost(t.slug, ROOT_DOMAIN)}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <VerticalBadge appType={t.appType} />
                    <StatusPill status={t.status} />
                    {billingOf(t.id) && <BillingPill state={billingOf(t.id)!.access.state} />}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    aria-label={`Select ${t.name}`}
                    className="h-4 w-4 accent-endeavour"
                    checked={selected.has(t.id)}
                    onChange={() => toggle(t.id)}
                  />
                  <AppActionsMenu {...rowProps(t)} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-100">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-700 truncate">{t.ownerName}</p>
                  <p className="text-[11px] text-stone-500 truncate">{t.ownerEmail}</p>
                </div>
                <p className="text-[11px] text-stone-400 whitespace-nowrap">{timeAgo(t.createdAt)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <EditAppDrawer tenant={editing} onOpenChange={(o) => !o && setEditing(null)} />
      <ConfirmDeleteApp tenant={deleting} onOpenChange={(o) => !o && setDeleting(null)} onConfirm={(t) => actions.remove(t)} />
    </>
  )
}
