'use client'

import React, { useMemo, useState } from 'react'
import { Check, HardHat, Paperclip, Pencil, Plus, Receipt, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BarChart } from '@/components/kit/ui'
import { EXPENSE_CATEGORIES, expenseCategoryLabel, projectStatusLabel } from '../_logics/constants'
import { expenseAmount, projectSummary, propertyInvestment, spendByCategory, spendByMonth } from '../_logics/development'
import { money, percent, plural, shortDate } from '../_logics/format'
import { usePortfolio, useRealEstateActions } from '../_logics/hooks'
import type { Expense, Project, ProjectPhase, Property } from '../_logics/types'
import { Button, Card, EmptyState, SectionTitle } from './ui'
import { ConfirmDialog, Select } from './form'
import { ExpenseForm, PhaseForm, ProjectForm } from './forms/development-forms'

const PROJECT_TONE: Record<Project['status'], string> = {
  planning: 'bg-stone-100 text-stone-600',
  'in-progress': 'bg-endeavour/10 text-endeavour',
  'on-hold': 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
}

// Land / development / repairs, labelled — never colour alone.
const SEGMENTS = [
  { key: 'purchase' as const, label: 'Land / purchase', color: '#0D9488' },
  { key: 'development' as const, label: 'Building & other spending', color: '#0865AC' },
  { key: 'repairs' as const, label: 'Repairs', color: '#D97706' },
]

export const InvestmentSummary = ({ property }: { property: Property }) => {
  const p = usePortfolio()
  const inv = propertyInvestment(property, p.expenses, p.maintenance)
  const categories = spendByCategory(p.expenses.filter((e) => e.propertyId === property.id))
  const maxCat = Math.max(1, ...categories.map((c) => c.amount))
  return (
    <Card className="p-5">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="lg:w-[46%]">
          <p className="text-xs font-semibold text-stone-500">Total invested</p>
          <p className="text-[32px] font-extrabold tracking-tight text-stone-900 tabular-nums leading-tight mt-1">{money(inv.total)}</p>
          <div
            className="flex h-2.5 w-full gap-[2px] rounded-full overflow-hidden bg-stone-100 mt-4"
            role="img"
            aria-label={SEGMENTS.map((s) => `${s.label}: ${money(inv[s.key])}`).join(', ')}
          >
            {inv.total > 0 &&
              SEGMENTS.filter((s) => inv[s.key] > 0).map((s) => (
                <div key={s.key} style={{ width: `${(inv[s.key] / inv.total) * 100}%`, background: s.color }} />
              ))}
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {SEGMENTS.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="text-stone-600 flex-1">{s.label}</span>
                <span className="font-bold text-stone-900 tabular-nums">{money(inv[s.key])}</span>
              </li>
            ))}
          </ul>
          {!property.purchasePrice && (
            <p className="text-xs text-amber-700 mt-3">Add the purchase price (Edit) so the land counts towards the total.</p>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-stone-500 mb-3">Spending by category</p>
          {categories.length === 0 ? (
            <p className="text-sm text-stone-500">No expenses recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {categories.map((c) => (
                <li key={c.category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-stone-700">{c.label}</span>
                    <span className="font-bold text-stone-900 tabular-nums">{money(c.amount)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full rounded-full bg-endeavour" style={{ width: `${(c.amount / maxCat) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  )
}

const PhaseMarker = ({ phase, index }: { phase: ProjectPhase; index: number }) =>
  phase.status === 'done' ? (
    <span className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0" aria-label="Done">
      <Check className="h-4 w-4" />
    </span>
  ) : phase.status === 'in-progress' ? (
    <span
      className="relative h-8 w-8 rounded-full bg-endeavour text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
      aria-label="In progress"
    >
      <span className="absolute inset-0 rounded-full bg-endeavour/40 animate-ping" aria-hidden />
      <span className="relative">{index + 1}</span>
    </span>
  ) : (
    <span
      className="h-8 w-8 rounded-full border-2 border-stone-200 bg-white text-stone-400 text-xs font-bold flex items-center justify-center flex-shrink-0"
      aria-label="Not started"
    >
      {index + 1}
    </span>
  )

export const DevelopmentSection = ({ property }: { property: Property }) => {
  const p = usePortfolio()
  const actions = useRealEstateActions()
  const projects = useMemo(() => p.projects.filter((x) => x.propertyId === property.id), [p.projects, property.id])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const project = projects.find((x) => x.id === selectedId) ?? projects[projects.length - 1] ?? null

  const [projectForm, setProjectForm] = useState<{ project: Project | null } | null>(null)
  const [phaseForm, setPhaseForm] = useState<{ phase: ProjectPhase | null } | null>(null)
  const [expenseForm, setExpenseForm] = useState<{ expense: Expense | null; preset?: { projectId?: number; phaseId?: number } } | null>(
    null
  )
  const [confirm, setConfirm] = useState<{ kind: 'project' | 'phase' | 'expense'; id: number; label: string } | null>(null)
  const [phaseFilter, setPhaseFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [busyPhase, setBusyPhase] = useState<number | null>(null)

  const summary = project ? projectSummary(project, p.phases, p.expenses) : null
  const propertyExpenses = p.expenses.filter((e) => e.propertyId === property.id)
  const ledger = propertyExpenses
    .filter((e) => (project ? e.projectId === project.id || !e.projectId : true))
    .filter((e) => !phaseFilter || (phaseFilter === 'none' ? !e.phaseId : String(e.phaseId) === phaseFilter))
    .filter((e) => !categoryFilter || e.category === categoryFilter)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  const monthly = spendByMonth(propertyExpenses, new Date(), 12)
  const phaseName = (id?: number | null) => (id ? p.phases.find((x) => x.id === id)?.name : undefined)

  const setPhaseStatus = async (phase: ProjectPhase, status: ProjectPhase['status']) => {
    setBusyPhase(phase.id)
    try {
      const today = new Date().toISOString().slice(0, 10)
      await actions.update('phases', phase.id, {
        status,
        startDate: status !== 'not-started' ? (phase.startDate ?? today) : phase.startDate,
        endDate: status === 'done' ? (phase.endDate ?? today) : undefined,
      })
    } catch {
      // toast shown
    } finally {
      setBusyPhase(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <InvestmentSummary property={property} />

      {projects.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="Track a building project"
          description="Follow each phase — foundation, blocks, roofing… — and every bag of cement, trip of sand and day of labour, so you always know what the land has cost."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button icon={Plus} onClick={() => setProjectForm({ project: null })}>
                Start a project
              </Button>
              <Button variant="secondary" icon={Receipt} onClick={() => setExpenseForm({ expense: null })}>
                Record an expense
              </Button>
            </div>
          }
        />
      ) : (
        project &&
        summary && (
          <>
            {projects.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Projects">
                {projects.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    role="tab"
                    aria-selected={x.id === project.id}
                    onClick={() => setSelectedId(x.id)}
                    className={cn(
                      'h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap border',
                      x.id === project.id ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200'
                    )}
                  >
                    {x.name}
                  </button>
                ))}
              </div>
            )}

            {/* Project header */}
            <Card className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-extrabold tracking-tight text-stone-900">{project.name}</h3>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', PROJECT_TONE[project.status])}>
                      {projectStatusLabel(project.status)}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    {project.startDate ? `Started ${shortDate(project.startDate)}` : 'No start date'}
                    {project.targetEndDate ? ` · target ${shortDate(project.targetEndDate)}` : ''}
                    {summary.currentPhase ? ` · now: ${summary.currentPhase.name}` : summary.phaseCount ? ' · all phases done' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    icon={Receipt}
                    onClick={() => setExpenseForm({ expense: null, preset: { projectId: project.id, phaseId: summary.currentPhase?.id } })}
                  >
                    Record expense
                  </Button>
                  <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setProjectForm({ project })}>
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" icon={Plus} onClick={() => setProjectForm({ project: null })}>
                    New project
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                {[
                  { label: 'Spent', value: money(summary.spent) },
                  { label: 'Budget', value: summary.budget ? money(summary.budget) : '—' },
                  {
                    label: summary.overBudget ? 'Over budget' : 'Remaining',
                    value: summary.budget ? money(Math.abs(summary.remaining)) : '—',
                    warn: summary.overBudget,
                  },
                  { label: 'Phases done', value: `${summary.doneCount} of ${summary.phaseCount}` },
                ].map((k) => (
                  <div key={k.label} className="rounded-xl bg-stone-50 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{k.label}</p>
                    <p className={cn('text-base font-extrabold tabular-nums mt-0.5', k.warn ? 'text-rose-600' : 'text-stone-900')}>
                      {k.value}
                    </p>
                  </div>
                ))}
              </div>
              {summary.budget > 0 && (
                <div className="mt-4">
                  <div
                    className="h-2 rounded-full bg-stone-100 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round((summary.spent / summary.budget) * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Budget used"
                  >
                    <div
                      className={cn('h-full rounded-full', summary.overBudget ? 'bg-rose-500' : 'bg-endeavour')}
                      style={{ width: `${Math.min(100, (summary.spent / summary.budget) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-stone-500 mt-1.5">{percent(summary.spent / summary.budget)} of budget used</p>
                </div>
              )}
            </Card>

            {/* Phases */}
            <Card className="p-5">
              <SectionTitle
                title="Phases"
                hint={`${percent(summary.progress)} complete`}
                action={
                  <Button size="sm" variant="ghost" icon={Plus} onClick={() => setPhaseForm({ phase: null })}>
                    Add phase
                  </Button>
                }
              />
              {summary.phases.length === 0 ? (
                <p className="text-sm text-stone-500 py-4">No phases yet.</p>
              ) : (
                <ol className="relative">
                  {summary.phases.map(({ phase, spent, budget, usage, expenseCount }, i) => (
                    <li key={phase.id} className="relative flex gap-4 pb-5 last:pb-0">
                      {i < summary.phases.length - 1 && (
                        <span
                          className={cn(
                            'absolute left-4 top-8 bottom-0 w-px -translate-x-1/2',
                            phase.status === 'done' ? 'bg-emerald-300' : 'bg-stone-200'
                          )}
                          aria-hidden
                        />
                      )}
                      <PhaseMarker phase={phase} index={i} />
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={cn('text-sm font-bold', phase.status === 'not-started' ? 'text-stone-500' : 'text-stone-900')}>
                              {phase.name}
                            </p>
                            <p className="text-xs text-stone-500">
                              {phase.status === 'done'
                                ? `Done${phase.endDate ? ` ${shortDate(phase.endDate)}` : ''}`
                                : phase.status === 'in-progress'
                                  ? `In progress${phase.startDate ? ` since ${shortDate(phase.startDate)}` : ''}`
                                  : 'Not started'}
                              {expenseCount > 0 ? ` · ${plural(expenseCount, 'expense')}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-extrabold text-stone-900 tabular-nums mr-1">{money(spent)}</span>
                            {phase.status !== 'done' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                loading={busyPhase === phase.id}
                                onClick={() => void setPhaseStatus(phase, phase.status === 'not-started' ? 'in-progress' : 'done')}
                              >
                                {phase.status === 'not-started' ? 'Start' : 'Mark done'}
                              </Button>
                            )}
                            <button
                              type="button"
                              aria-label={`Add expense to ${phase.name}`}
                              title="Add expense"
                              onClick={() => setExpenseForm({ expense: null, preset: { projectId: project.id, phaseId: phase.id } })}
                              className="h-9 w-9 rounded-lg inline-flex items-center justify-center text-stone-400 hover:text-endeavour hover:bg-stone-100"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Edit ${phase.name}`}
                              onClick={() => setPhaseForm({ phase })}
                              className="h-9 w-9 rounded-lg inline-flex items-center justify-center text-stone-400 hover:text-endeavour hover:bg-stone-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {budget > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-stone-100 overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', usage > 1 ? 'bg-rose-500' : 'bg-endeavour')}
                                style={{ width: `${Math.min(100, usage * 100)}%` }}
                              />
                            </div>
                            <span className={cn('text-[11px] tabular-nums', usage > 1 ? 'text-rose-600 font-semibold' : 'text-stone-500')}>
                              of {money(budget)}
                            </span>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {summary.unphasedSpent > 0 && (
                <p className="text-xs text-stone-500 mt-4">Plus {money(summary.unphasedSpent)} recorded on the project without a phase.</p>
              )}
            </Card>
          </>
        )
      )}

      {/* Ledger */}
      {propertyExpenses.length > 0 && (
        <Card className="p-5">
          <SectionTitle
            title="Expenses"
            hint={`${plural(ledger.length, 'entry', 'entries')} · ${money(ledger.reduce((s, e) => s + expenseAmount(e), 0))}`}
            action={
              <Button
                size="sm"
                variant="ghost"
                icon={Plus}
                onClick={() => setExpenseForm({ expense: null, preset: project ? { projectId: project.id } : undefined })}
              >
                Add
              </Button>
            }
          />
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            {project && summary && summary.phases.length > 0 && (
              <div className="sm:w-56">
                <Select
                  aria-label="Filter by phase"
                  value={phaseFilter}
                  onChange={(e) => setPhaseFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All phases' },
                    ...summary.phases.map(({ phase }) => ({ value: String(phase.id), label: phase.name })),
                    { value: 'none', label: 'No phase' },
                  ]}
                />
              </div>
            )}
            <div className="sm:w-56">
              <Select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[{ value: '', label: 'All categories' }, ...EXPENSE_CATEGORIES]}
              />
            </div>
          </div>
          <div className="divide-y divide-stone-100">
            {ledger.length === 0 && <p className="text-sm text-stone-500 py-6 text-center">No expenses match.</p>}
            {ledger.map((e) => {
              const receipt = e.documentId ? p.documents.find((d) => d.id === e.documentId) : undefined
              return (
                <div key={e.id} className="group flex items-start gap-3 py-3">
                  <span className="text-[11px] font-semibold text-stone-400 w-16 flex-shrink-0 pt-0.5 tabular-nums">
                    {shortDate(e.date).replace(/ \d{4}$/, '')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-900 truncate">{e.description}</p>
                    <p className="text-xs text-stone-500 truncate">
                      {e.quantity !== undefined && e.unitCost !== undefined
                        ? `${e.quantity} ${e.unit ?? ''} × ${money(e.unitCost)} · `
                        : ''}
                      {expenseCategoryLabel(e.category)}
                      {phaseName(e.phaseId) ? ` · ${phaseName(e.phaseId)}` : ''}
                      {e.supplier ? ` · ${e.supplier}` : ''}
                    </p>
                    {receipt && (
                      <p className="text-[11px] text-endeavour mt-0.5 inline-flex items-center gap-1">
                        <Paperclip className="h-3 w-3" /> {receipt.title}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-extrabold text-stone-900 tabular-nums">{money(expenseAmount(e))}</span>
                  <div className="flex sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      aria-label={`Edit ${e.description}`}
                      onClick={() => setExpenseForm({ expense: e })}
                      className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-stone-400 hover:text-endeavour hover:bg-stone-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${e.description}`}
                      onClick={() => setConfirm({ kind: 'expense', id: e.id, label: e.description })}
                      className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {propertyExpenses.length > 0 && (
        <Card className="p-5">
          <SectionTitle title="Spending per month" hint="Last 12 months" />
          <BarChart ariaLabel="Spending per month" data={monthly} format={(n, o) => money(n, o)} />
        </Card>
      )}

      {project && (
        <div className="flex justify-end">
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={() => setConfirm({ kind: 'project', id: project.id, label: project.name })}
          >
            Delete project
          </Button>
        </div>
      )}

      {/* Drawers */}
      <ProjectForm
        open={!!projectForm}
        onOpenChange={(o) => !o && setProjectForm(null)}
        property={property}
        project={projectForm?.project ?? null}
        onSaved={(x) => setSelectedId(x.id)}
      />
      {project && (
        <PhaseForm
          open={!!phaseForm}
          onOpenChange={(o) => !o && setPhaseForm(null)}
          projectId={project.id}
          phase={phaseForm?.phase ?? null}
          nextPosition={(summary?.phases.length ?? 0) + 1}
          onDelete={() => {
            const ph = phaseForm?.phase
            setPhaseForm(null)
            if (ph) setConfirm({ kind: 'phase', id: ph.id, label: ph.name })
          }}
        />
      )}
      <ExpenseForm
        open={!!expenseForm}
        onOpenChange={(o) => !o && setExpenseForm(null)}
        property={property}
        expense={expenseForm?.expense ?? null}
        preset={expenseForm?.preset ?? null}
      />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Delete ${confirm?.label ?? ''}?`}
        description={
          confirm?.kind === 'project'
            ? 'The project, its phases and all of its expenses are removed. Documents stay in Documents.'
            : confirm?.kind === 'phase'
              ? 'The phase is removed. Its expenses stay on the project, without a phase.'
              : 'This expense is removed from the totals.'
        }
        onConfirm={() => {
          if (!confirm) return
          const r = confirm.kind === 'project' ? 'projects' : confirm.kind === 'phase' ? 'phases' : 'expenses'
          if (confirm.kind === 'project') setSelectedId(null)
          void actions.remove(r, confirm.id).catch(() => {})
        }}
      />
    </div>
  )
}
