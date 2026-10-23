// Building projects, phases and spending — pure, so the money maths is testable.

import { format, startOfMonth, subMonths } from 'date-fns'
import { parseDate } from './calc'
import { EXPENSE_CATEGORIES } from './constants'
import type { Expense, ExpenseCategory, LandStage, MaintenanceRequest, Project, ProjectPhase, Property } from './types'

const round2 = (n: number) => Math.round(n * 100) / 100

// quantity × unit cost when both are given, otherwise the amount typed in.
export const expenseAmount = (e: Pick<Expense, 'quantity' | 'unitCost' | 'amount'>) =>
  e.quantity !== undefined && e.unitCost !== undefined && e.quantity > 0 && e.unitCost >= 0
    ? round2(e.quantity * e.unitCost)
    : round2(e.amount || 0)

const sum = (list: Expense[]) => round2(list.reduce((s, e) => s + expenseAmount(e), 0))

export interface PhaseSummary {
  phase: ProjectPhase
  spent: number
  budget: number
  // spent / budget (0 when no budget)
  usage: number
  expenseCount: number
}

export interface ProjectSummary {
  spent: number
  budget: number
  remaining: number
  overBudget: boolean
  phases: PhaseSummary[]
  // Spending recorded on the project but not on any phase.
  unphasedSpent: number
  doneCount: number
  phaseCount: number
  // Share of phases done (0..1)
  progress: number
  // The phase to look at next: first in progress, else first not started.
  currentPhase?: ProjectPhase
}

export const projectSummary = (project: Project, phases: ProjectPhase[], expenses: Expense[]): ProjectSummary => {
  const mine = phases.filter((p) => p.projectId === project.id).sort((a, b) => a.position - b.position)
  const projectExpenses = expenses.filter((e) => e.projectId === project.id)
  const phaseIds = new Set(mine.map((p) => p.id))
  const spent = sum(projectExpenses)
  const doneCount = mine.filter((p) => p.status === 'done').length
  return {
    spent,
    budget: project.budget || 0,
    remaining: round2((project.budget || 0) - spent),
    overBudget: (project.budget || 0) > 0 && spent > project.budget,
    phases: mine.map((phase) => {
      const list = projectExpenses.filter((e) => e.phaseId === phase.id)
      const s = sum(list)
      return { phase, spent: s, budget: phase.budget || 0, usage: phase.budget ? s / phase.budget : 0, expenseCount: list.length }
    }),
    unphasedSpent: sum(projectExpenses.filter((e) => !e.phaseId || !phaseIds.has(e.phaseId))),
    doneCount,
    phaseCount: mine.length,
    progress: mine.length ? doneCount / mine.length : 0,
    currentPhase: mine.find((p) => p.status === 'in-progress') ?? mine.find((p) => p.status === 'not-started'),
  }
}

// Largest first; categories with no spending are left out.
export const spendByCategory = (expenses: Expense[]) => {
  const totals = new Map<ExpenseCategory, number>()
  for (const e of expenses) totals.set(e.category, (totals.get(e.category) ?? 0) + expenseAmount(e))
  return EXPENSE_CATEGORIES.map((c) => ({ category: c.value, label: c.label, amount: round2(totals.get(c.value) ?? 0) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

export const spendByMonth = (expenses: Expense[], now: Date, months = 12) => {
  const buckets = Array.from({ length: months }, (_, i) => startOfMonth(subMonths(now, months - 1 - i)))
  const totals = new Map(buckets.map((b) => [format(b, 'yyyy-MM'), 0]))
  for (const e of expenses) {
    const k = e.date.slice(0, 7)
    if (totals.has(k)) totals.set(k, totals.get(k)! + expenseAmount(e))
  }
  return buckets.map((b) => {
    const key = format(b, 'yyyy-MM')
    return { key, label: format(b, 'MMM'), detail: format(b, 'MMMM yyyy'), value: round2(totals.get(key) ?? 0) }
  })
}

export interface Investment {
  purchase: number
  development: number
  repairs: number
  total: number
}

// Everything put into a property: what it cost to buy, every recorded
// expense (building, materials, labour…), and repairs.
export const propertyInvestment = (property: Property, expenses: Expense[], maintenance: MaintenanceRequest[] = []): Investment => {
  const purchase = property.purchasePrice || 0
  const development = sum(expenses.filter((e) => e.propertyId === property.id))
  const repairs = round2(maintenance.filter((m) => m.propertyId === property.id).reduce((s, m) => s + (m.cost || 0), 0))
  return { purchase, development, repairs, total: round2(purchase + development + repairs) }
}

// Phases for a new project from chosen names. Steps a plot has already been
// through (by its land stage) start as done.
const DONE_BY_STAGE: Record<LandStage, string[]> = {
  bare: [],
  fenced: ['Land documentation', 'Site clearing', 'Fencing'],
  'under-construction': ['Land documentation', 'Site clearing', 'Fencing'],
  completed: [],
}

export const phasesFromNames = (names: string[], projectId: number, stage?: LandStage): Omit<ProjectPhase, 'id'>[] => {
  const done = new Set(stage ? DONE_BY_STAGE[stage] : [])
  return names
    .map((n) => n.trim())
    .filter(Boolean)
    .map((name, i) => ({
      projectId,
      name,
      position: i + 1,
      status: done.has(name) ? ('done' as const) : ('not-started' as const),
      budget: 0,
    }))
}

export const daysBetween = (a?: string, b?: string) => (a && b ? Math.round((+parseDate(b) - +parseDate(a)) / 86_400_000) : null)
