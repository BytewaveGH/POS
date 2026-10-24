'use client'

import React, { useMemo, useState } from 'react'
import { KeyRound, Pencil, Phone, Search, UserPlus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortfolio } from '../_logics/hooks'
import { NoAccess } from '../_components/load-state'
import { todayISO, type RentStatus } from '../_logics/calc'
import { byUrgency, tenancyRows, type TenancyRow } from '../_logics/selectors'
import { money, plural, shortDate } from '../_logics/format'
import type { Tenant } from '../_logics/types'
import { Avatar, Badge, Button, Card, EmptyState, ErrorNote, LoadingGrid, PageHeader, RENT } from '../_components/ui'
import { MoveInForm, PaymentForm, TenantForm } from '../_components/forms/tenancy-forms'

type Filter = 'all' | RentStatus | 'no-unit'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due-soon', label: 'Due soon' },
  { value: 'paid', label: 'Paid up' },
  { value: 'upcoming', label: 'Moving in' },
  { value: 'ended', label: 'Former' },
]

type Entry = { tenant: Tenant; row?: TenancyRow }

export default function TenantsPage() {
  const p = usePortfolio()
  const canEdit = p.can.write('lettings')
  const today = todayISO()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<Tenant | null | undefined>(undefined)
  const [payLease, setPayLease] = useState<number | null | undefined>(undefined)
  const [moveIn, setMoveIn] = useState(false)

  const entries = useMemo<Entry[]>(() => {
    const rows = tenancyRows(p, today)
    // Each tenant's most relevant tenancy: current/upcoming first, else the latest.
    const pick = (tenantId: number) => {
      const mine = rows.filter((r) => r.lease.tenantId === tenantId)
      return (
        mine.filter((r) => r.state !== 'ended').sort(byUrgency)[0] ??
        mine.sort((a, b) => (a.lease.startDate < b.lease.startDate ? 1 : -1))[0]
      )
    }
    return p.tenants
      .map((tenant) => ({ tenant, row: pick(tenant.id) }))
      .sort((a, b) =>
        a.row && b.row ? byUrgency(a.row, b.row) : a.row ? -1 : b.row ? 1 : a.tenant.fullName.localeCompare(b.tenant.fullName)
      )
  }, [p, today])

  const counts = useMemo(() => {
    const c: Partial<Record<Filter, number>> = { all: entries.length }
    for (const e of entries) {
      const k: Filter = e.row ? e.row.rent.status : 'no-unit'
      c[k] = (c[k] ?? 0) + 1
    }
    return c
  }, [entries])

  const q = query.trim().toLowerCase()
  const list = entries.filter(
    (e) =>
      (filter === 'all' || (e.row ? e.row.rent.status === filter : filter === 'no-unit')) &&
      (!q || `${e.tenant.fullName} ${e.tenant.phone} ${e.row?.unit?.name ?? ''} ${e.row?.property?.name ?? ''}`.toLowerCase().includes(q))
  )

  return (
    <>
      <PageHeader
        eyebrow="Real estate"
        title="Tenants"
        description="Everyone renting from you, and where their rent stands."
        actions={
          canEdit && (
            <>
              <Button variant="secondary" icon={UserPlus} onClick={() => setEditing(null)}>
                Add tenant
              </Button>
              <Button icon={KeyRound} onClick={() => setMoveIn(true)}>
                Move tenant in
              </Button>
            </>
          )
        }
      />
      {p.error && <ErrorNote message={p.error} />}

      {!p.can.read('lettings') ? (
        <NoAccess />
      ) : p.isLoading ? (
        <LoadingGrid count={2} className="xl:grid-cols-2" />
      ) : p.tenants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No tenants yet"
          description="Moving a tenant into a unit adds them here, with their rent tracked automatically."
          action={
            canEdit && (
              <Button icon={KeyRound} onClick={() => setMoveIn(true)}>
                Move tenant in
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            <div className="relative lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, phone or room"
                aria-label="Search tenants"
                className="w-full h-10 rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-base sm:text-sm focus:outline-none focus:border-endeavour focus:ring-2 focus:ring-endeavour/15"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {FILTERS.filter((f) => f.value === 'all' || counts[f.value]).map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'h-10 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors inline-flex items-center gap-1.5',
                    filter === f.value
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                  )}
                >
                  {f.label}
                  <span className={cn('tabular-nums text-[10px]', filter === f.value ? 'text-white/70' : 'text-stone-400')}>
                    {counts[f.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Card className="divide-y divide-stone-100">
            {list.length === 0 && <p className="text-sm text-stone-500 py-10 text-center">No tenants match.</p>}
            {list.map(({ tenant, row }) => (
              <div key={tenant.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar name={tenant.fullName} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate">{tenant.fullName}</p>
                    <p className="text-xs text-stone-500 truncate">
                      {row ? `${row.unit?.name ?? 'Unit'} · ${row.property?.name ?? ''}` : 'Not in a unit'}
                      {tenant.occupation ? ` · ${tenant.occupation}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:w-[46%]">
                  {row ? (
                    <div className="text-left sm:text-right">
                      <Badge spec={RENT[row.rent.status]} />
                      <p
                        className={cn(
                          'text-[11px] mt-1 tabular-nums',
                          row.rent.status === 'overdue' ? 'text-rose-600 font-semibold' : 'text-stone-500'
                        )}
                      >
                        {row.rent.status === 'overdue'
                          ? `${money(row.rent.arrears)} owed · ${plural(row.rent.daysOverdue, 'day')} late`
                          : row.rent.status === 'ended'
                            ? `Left ${shortDate(row.lease.terminatedOn)}`
                            : row.rent.status === 'upcoming'
                              ? `Moves in ${shortDate(row.lease.startDate)}`
                              : `Paid through ${shortDate(row.rent.paidThrough)}`}
                      </p>
                    </div>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-1">
                    <a
                      href={`tel:${tenant.phone.replace(/\s+/g, '')}`}
                      aria-label={`Call ${tenant.fullName}`}
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-endeavour"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setEditing(tenant)}
                        aria-label={`Edit ${tenant.fullName}`}
                        className="h-9 w-9 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-endeavour"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {canEdit && row && row.rent.status !== 'ended' && (
                      <Button size="sm" variant="secondary" onClick={() => setPayLease(row.lease.id)}>
                        Record payment
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      <TenantForm open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} tenant={editing ?? null} />
      <PaymentForm open={payLease !== undefined} onOpenChange={(o) => !o && setPayLease(undefined)} leaseId={payLease ?? null} />
      <MoveInForm open={moveIn} onOpenChange={setMoveIn} />
    </>
  )
}
