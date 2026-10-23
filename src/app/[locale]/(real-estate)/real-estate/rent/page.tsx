'use client'

import React, { useMemo, useState } from 'react'
import { addMonths, format, subMonths } from 'date-fns'
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Receipt, Trash2, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortfolio, useRealEstateActions } from '../_logics/hooks'
import { parseDate, todayISO } from '../_logics/calc'
import { byUrgency, tenancyRows } from '../_logics/selectors'
import { billingCycleLabel, paymentMethodLabel } from '../_logics/constants'
import { money, plural, shortDate } from '../_logics/format'
import type { RentPayment } from '../_logics/types'
import { Badge, Button, Card, EmptyState, ErrorNote, LoadingGrid, PageHeader, RENT, SectionTitle, StatCard } from '../_components/ui'
import { ConfirmDialog } from '../_components/form'
import { PaymentForm } from '../_components/forms/tenancy-forms'

export default function RentPage() {
  const p = usePortfolio()
  const actions = useRealEstateActions()
  const today = todayISO()
  const [payLease, setPayLease] = useState<number | null | undefined>(undefined)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [deleting, setDeleting] = useState<RentPayment | null>(null)

  const rows = useMemo(
    () =>
      tenancyRows(p, today)
        .filter((r) => r.state !== 'ended' || r.rent.arrears > 0)
        .sort(byUrgency),
    [p, today]
  )
  const leaseById = useMemo(() => new Map(p.leases.map((l) => [l.id, l])), [p.leases])
  const ledger = p.payments.filter((x) => x.paidOn.startsWith(month)).sort((a, b) => (a.paidOn < b.paidOn ? 1 : -1))
  const ledgerTotal = ledger.reduce((s, x) => s + x.amount, 0)
  const arrears = rows.reduce((s, r) => s + r.rent.arrears, 0)
  const dueSoon = rows.filter((r) => r.rent.status === 'due-soon')
  const dueSoonTotal = dueSoon.reduce((s, r) => s + r.rent.nextDueAmount, 0)
  const thisMonth = p.payments.filter((x) => x.paidOn.startsWith(today.slice(0, 7))).reduce((s, x) => s + x.amount, 0)

  const monthDate = parseDate(`${month}-01`)
  const canGoForward = month < today.slice(0, 7)

  return (
    <>
      <PageHeader
        eyebrow="Real estate"
        title="Rent & payments"
        description="Who has paid, who is due, and every payment received."
        actions={
          <Button icon={Wallet} onClick={() => setPayLease(null)}>
            Record payment
          </Button>
        }
      />
      {p.error && <ErrorNote message={p.error} />}

      {p.isLoading ? (
        <LoadingGrid count={3} className="xl:grid-cols-3" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Outstanding"
              value={money(arrears)}
              icon={AlertTriangle}
              tone={arrears > 0 ? 'rose' : 'stone'}
              hint={`${plural(rows.filter((r) => r.rent.status === 'overdue').length, 'tenant')} behind`}
            />
            <StatCard
              label="Due in the next 30 days"
              value={money(dueSoonTotal)}
              icon={Clock}
              tone="amber"
              hint={plural(dueSoon.length, 'renewal')}
            />
            <StatCard
              label={`Received in ${format(parseDate(today), 'MMMM')}`}
              value={money(thisMonth)}
              icon={Wallet}
              tone="green"
              hint="Long-term rent"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-5 mt-6">
            {/* Rent roll */}
            <div className="xl:col-span-3">
              <SectionTitle title="Rent roll" hint="Most urgent first" />
              {rows.length === 0 ? (
                <EmptyState icon={Receipt} title="No tenancies yet" description="Move a tenant into a unit to start tracking rent." />
              ) : (
                <Card className="divide-y divide-stone-100">
                  {rows.map((r) => (
                    <div key={r.lease.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-stone-900 truncate">{r.tenant?.fullName ?? 'Tenant'}</p>
                        <p className="text-xs text-stone-500 truncate">
                          {r.unit?.name} · {r.property?.name} · {money(r.lease.monthlyRent)}/mo ·{' '}
                          {billingCycleLabel(r.lease.billingCycleMonths).toLowerCase()}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-left sm:text-right">
                          <Badge spec={RENT[r.rent.status]} />
                          <p
                            className={cn(
                              'text-[11px] mt-1 tabular-nums',
                              r.rent.status === 'overdue' ? 'text-rose-600 font-semibold' : 'text-stone-500'
                            )}
                          >
                            {r.rent.status === 'overdue'
                              ? `${money(r.rent.arrears)} since ${shortDate(r.rent.nextDueDate)}`
                              : r.rent.nextDueDate
                                ? `${money(r.rent.nextDueAmount)} due ${shortDate(r.rent.nextDueDate)}`
                                : `Covered to ${shortDate(r.rent.paidThrough)}`}
                          </p>
                        </div>
                        {r.rent.status !== 'ended' && (
                          <Button
                            size="sm"
                            variant={r.rent.status === 'overdue' ? 'primary' : 'secondary'}
                            onClick={() => setPayLease(r.lease.id)}
                          >
                            Record
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </Card>
              )}
            </div>

            {/* Ledger */}
            <div className="xl:col-span-2">
              <SectionTitle
                title="Payments received"
                hint={`${plural(ledger.length, 'payment')} · ${money(ledgerTotal)}`}
                action={
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Previous month"
                      onClick={() => setMonth(format(subMonths(monthDate, 1), 'yyyy-MM'))}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold text-stone-700 w-20 text-center">{format(monthDate, 'MMM yyyy')}</span>
                    <button
                      type="button"
                      aria-label="Next month"
                      disabled={!canGoForward}
                      onClick={() => setMonth(format(addMonths(monthDate, 1), 'yyyy-MM'))}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                }
              />
              <Card className="divide-y divide-stone-100">
                {ledger.length === 0 && <p className="text-sm text-stone-500 py-10 text-center">No payments this month.</p>}
                {ledger.map((x) => {
                  const lease = leaseById.get(x.leaseId)
                  return (
                    <div key={x.id} className="group flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-stone-900 truncate">
                          {lease ? p.tenantById.get(lease.tenantId)?.fullName : 'Tenant'}
                        </p>
                        <p className="text-xs text-stone-500 truncate">
                          {shortDate(x.paidOn)} · {paymentMethodLabel(x.method)}
                          {lease ? ` · ${p.unitById.get(lease.unitId)?.name}` : ''}
                          {x.reference ? ` · ${x.reference}` : ''}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-emerald-700 tabular-nums">+{money(x.amount)}</p>
                      <button
                        type="button"
                        onClick={() => setDeleting(x)}
                        aria-label="Delete payment"
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-stone-300 hover:text-rose-600 hover:bg-rose-50 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </Card>
            </div>
          </div>
        </>
      )}

      <PaymentForm open={payLease !== undefined} onOpenChange={(o) => !o && setPayLease(undefined)} leaseId={payLease ?? null} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this payment?"
        description={
          deleting ? `${money(deleting.amount)} received ${shortDate(deleting.paidOn)}. The tenant’s balance will be recalculated.` : ''
        }
        onConfirm={() => deleting && void actions.remove('payments', deleting.id).catch(() => {})}
      />
    </>
  )
}
