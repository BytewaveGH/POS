'use client'

import React, { useMemo, useState } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import { ArrowRight, Hammer, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortfolio, useRealEstateActions } from '../_logics/hooks'
import { NoAccess } from '../_components/load-state'
import { parseDate, todayISO } from '../_logics/calc'
import { MAINTENANCE_STATUSES } from '../_logics/constants'
import { money, plural, shortDate } from '../_logics/format'
import type { MaintenanceRequest, MaintenanceStatus } from '../_logics/types'
import { Badge, Button, Card, EmptyState, ErrorNote, LoadingGrid, MAINTENANCE, PageHeader, PRIORITY } from '../_components/ui'
import { MaintenanceForm } from '../_components/forms/booking-maintenance-forms'

const NEXT: Partial<Record<MaintenanceStatus, { to: MaintenanceStatus; label: string }>> = {
  open: { to: 'in-progress', label: 'Start' },
  'in-progress': { to: 'resolved', label: 'Mark resolved' },
}
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 }

export default function MaintenancePage() {
  const p = usePortfolio()
  const canEdit = p.can.write('maintenance')
  const actions = useRealEstateActions()
  const today = todayISO()
  const [editing, setEditing] = useState<MaintenanceRequest | null | undefined>(undefined)
  const [propertyId, setPropertyId] = useState<number | 'all'>('all')

  const items = useMemo(
    () =>
      p.maintenance
        .filter((m) => propertyId === 'all' || m.propertyId === propertyId)
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.reportedOn < b.reportedOn ? -1 : 1)),
    [p.maintenance, propertyId]
  )
  const spentThisYear = p.maintenance.filter((m) => m.reportedOn.startsWith(today.slice(0, 4))).reduce((s, m) => s + (m.cost || 0), 0)

  const move = (m: MaintenanceRequest, to: MaintenanceStatus) =>
    void actions.update('maintenance', m.id, { status: to, resolvedOn: to === 'resolved' ? today : undefined }).catch(() => {})

  return (
    <>
      <PageHeader
        eyebrow="Real estate"
        title="Repairs & maintenance"
        description={`Track jobs across your properties · ${money(spentThisYear)} spent this year`}
        actions={
          canEdit &&
          p.properties.length > 0 && (
            <Button icon={Plus} onClick={() => setEditing(null)}>
              Log repair
            </Button>
          )
        }
      />
      {p.error && <ErrorNote message={p.error} />}

      {!p.can.read('maintenance') ? (
        <NoAccess />
      ) : p.isLoading ? (
        <LoadingGrid count={3} className="xl:grid-cols-3" />
      ) : p.properties.length === 0 ? (
        <EmptyState icon={Hammer} title="Add a property first" description="Repairs are logged against a property, or a unit in it." />
      ) : (
        <>
          {p.properties.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4">
              {[{ id: 'all' as const, name: 'All properties' }, ...p.properties].map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setPropertyId(x.id)}
                  className={cn(
                    'h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors',
                    propertyId === x.id
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                  )}
                >
                  {x.name}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            {MAINTENANCE_STATUSES.map((col) => {
              const list = items.filter((m) => m.status === col.value)
              const cost = list.reduce((s, m) => s + (m.cost || 0), 0)
              return (
                <section key={col.value} className="rounded-2xl bg-stone-100/70 p-3 flex flex-col gap-3 min-h-[200px]">
                  <header className="flex items-center justify-between px-1">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-stone-900">
                      <span className="h-2 w-2 rounded-full" style={{ background: MAINTENANCE[col.value].dot }} />
                      {col.label}
                      <span className="text-xs font-semibold text-stone-400 tabular-nums">{list.length}</span>
                    </span>
                    {cost > 0 && <span className="text-xs font-semibold text-stone-500 tabular-nums">{money(cost)}</span>}
                  </header>
                  {list.length === 0 && <p className="text-xs text-stone-400 px-1 py-6 text-center">Nothing here</p>}
                  {list.map((m) => {
                    const age = differenceInCalendarDays(parseDate(today), parseDate(m.reportedOn))
                    const next = NEXT[m.status]
                    return (
                      <Card key={m.id} className="p-3.5">
                        <button type="button" disabled={!canEdit} onClick={() => setEditing(m)} className="text-left w-full">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-stone-900 leading-snug">{m.title}</p>
                            <Badge spec={PRIORITY[m.priority]} />
                          </div>
                          <p className="text-xs text-stone-500 mt-1">
                            {p.propertyById.get(m.propertyId)?.name}
                            {m.unitId ? ` · ${p.unitById.get(m.unitId)?.name}` : ' · shared area'}
                          </p>
                          {m.description && <p className="text-xs text-stone-600 mt-2 line-clamp-2">{m.description}</p>}
                        </button>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
                          <span className="text-[11px] text-stone-400">
                            {m.status === 'resolved'
                              ? `Resolved ${shortDate(m.resolvedOn)}`
                              : age === 0
                                ? 'Reported today'
                                : `${plural(age, 'day')} old`}
                            {m.cost > 0 ? ` · ${money(m.cost)}` : ''}
                          </span>
                          {canEdit && next && (
                            <button
                              type="button"
                              onClick={() => move(m, next.to)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-endeavour hover:underline"
                            >
                              {next.label} <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </section>
              )
            })}
          </div>
        </>
      )}

      <MaintenanceForm
        open={editing !== undefined}
        onOpenChange={(o) => !o && setEditing(undefined)}
        item={editing ?? null}
        propertyId={propertyId === 'all' ? undefined : propertyId}
      />
    </>
  )
}
