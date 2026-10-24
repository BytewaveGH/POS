'use client'

import React, { useEffect, useMemo, useState } from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Paperclip, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EXPENSE_CATEGORIES, MATERIAL_SUGGESTIONS, PHASE_STATUSES, PROJECT_STATUSES, STANDARD_PHASES } from '../../_logics/constants'
import { expenseAmount, phasesFromNames } from '../../_logics/development'
import { todayISO } from '../../_logics/calc'
import { money } from '../../_logics/format'
import { usePortfolio, useRealEstateActions } from '../../_logics/hooks'
import { ACCEPT_ATTR, fileProblem, formatBytes } from '../../_logics/share'
import type { Expense, ExpenseCategory, PhaseStatus, Project, ProjectPhase, ProjectStatus, Property } from '../../_logics/types'
import { Button } from '../ui'
import { Drawer, Field, FormGrid, FormSection, Input, Select, Textarea, toNum } from '../form'

// ── Project ──────────────────────────────────────────────────────────────────

const projectSchema = z.object({
  name: z.string().trim().min(1, 'Name the project, e.g. “4-bedroom house”'),
  status: z.string(),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  budget: z.coerce.number().min(0),
  description: z.string().optional(),
})

export const ProjectForm = ({
  open,
  onOpenChange,
  property,
  project,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  property: Property
  project?: Project | null
  onSaved?: (p: Project) => void
}) => {
  const actions = useRealEstateActions({ inline: true })
  const [saving, setSaving] = useState(false)
  const [phases, setPhases] = useState<string[]>(STANDARD_PHASES)
  const [picked, setPicked] = useState<Set<string>>(new Set(STANDARD_PHASES))
  const [custom, setCustom] = useState('')
  const form = useForm<z.infer<typeof projectSchema>>({ resolver: zodResolver(projectSchema) })

  useEffect(() => {
    if (!open) return
    form.reset({
      name: project?.name ?? '',
      status: project?.status ?? 'in-progress',
      startDate: project?.startDate ?? '',
      targetEndDate: project?.targetEndDate ?? '',
      budget: project?.budget ?? 0,
      description: project?.description ?? '',
    })
    setPhases(STANDARD_PHASES)
    setPicked(new Set(STANDARD_PHASES))
    setCustom('')
  }, [open, project, form])

  const addCustom = () => {
    const name = custom.trim()
    if (!name) return
    if (!phases.includes(name)) setPhases((list) => [...list, name])
    setPicked((s) => new Set(s).add(name))
    setCustom('')
  }

  const submit = form.handleSubmit(async (v) => {
    setSaving(true)
    const body = {
      propertyId: property.id,
      name: v.name.trim(),
      status: v.status as ProjectStatus,
      startDate: v.startDate || undefined,
      targetEndDate: v.targetEndDate || undefined,
      budget: v.budget,
      description: v.description?.trim() || undefined,
    }
    try {
      if (project) {
        const saved = await actions.update('projects', project.id, body)
        onSaved?.(saved)
      } else {
        const created = await actions.create('projects', body)
        await actions.createMany(
          'phases',
          phasesFromNames(
            phases.filter((n) => picked.has(n)),
            created.id,
            property.land?.stage
          )
        )
        onSaved?.(created)
      }
      onOpenChange(false)
    } catch {
      // toast shown
    } finally {
      setSaving(false)
    }
  })

  const err = form.formState.errors
  return (
    <Drawer
      error={actions.error}
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={project ? 'Edit project' : 'Start a building project'}
      description={project ? undefined : `Track phases, materials and every cedi spent on ${property.name}.`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {project ? 'Save project' : `Create project · ${picked.size} phases`}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-7">
        <FormSection title="Project">
          <Field label="Name" error={err.name?.message} htmlFor="pj-name">
            <Input id="pj-name" placeholder="e.g. 4-bedroom house" {...form.register('name')} />
          </Field>
          <FormGrid cols={3}>
            <Field label="Status" htmlFor="pj-status">
              <Select id="pj-status" options={PROJECT_STATUSES} {...form.register('status')} />
            </Field>
            <Field label="Started" htmlFor="pj-start">
              <Input id="pj-start" type="date" {...form.register('startDate')} />
            </Field>
            <Field label="Target finish" htmlFor="pj-end">
              <Input id="pj-end" type="date" {...form.register('targetEndDate')} />
            </Field>
          </FormGrid>
          <Field label="Budget" hint="Optional — see spending against it" htmlFor="pj-budget">
            <Input id="pj-budget" prefix="₵" type="number" inputMode="decimal" step="any" min={0} {...form.register('budget')} />
          </Field>
          <Field label="Notes" htmlFor="pj-notes">
            <Textarea id="pj-notes" placeholder="Contractor, architect, plan details…" {...form.register('description')} />
          </Field>
        </FormSection>

        {!project && (
          <FormSection title="Phases">
            <p className="text-xs text-stone-500 -mt-2">
              A typical build, in order. Untick what doesn’t apply — you can rename, add or remove phases later.
              {property.land?.stage === 'fenced' && ' Documentation, clearing and fencing start as done since the land is fenced.'}
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {phases.map((name, i) => {
                const on = picked.has(name)
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setPicked((s) => {
                        const next = new Set(s)
                        if (next.has(name)) next.delete(name)
                        else next.add(name)
                        return next
                      })
                    }
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                      on ? 'border-endeavour/40 bg-endeavour/[0.04] text-stone-900' : 'border-stone-200 text-stone-400'
                    )}
                  >
                    <span
                      className={cn(
                        'h-5 w-5 rounded-md border flex items-center justify-center flex-shrink-0',
                        on ? 'bg-endeavour border-endeavour text-white' : 'border-stone-300'
                      )}
                    >
                      {on && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="text-[11px] font-bold text-stone-400 tabular-nums w-4">{i + 1}</span>
                    <span className="font-semibold">{name}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2">
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustom()
                  }
                }}
                placeholder="Add a phase, e.g. Borehole"
                aria-label="Add a phase"
              />
              <Button variant="secondary" icon={Plus} onClick={addCustom} disabled={!custom.trim()}>
                Add
              </Button>
            </div>
          </FormSection>
        )}
      </form>
    </Drawer>
  )
}

// ── Phase ────────────────────────────────────────────────────────────────────

const phaseSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  status: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.coerce.number().min(0),
  notes: z.string().optional(),
})

export const PhaseForm = ({
  open,
  onOpenChange,
  projectId,
  phase,
  nextPosition,
  onDelete,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  projectId: number
  phase?: ProjectPhase | null
  nextPosition: number
  onDelete?: () => void
}) => {
  const actions = useRealEstateActions({ inline: true })
  const [saving, setSaving] = useState(false)
  const form = useForm<z.infer<typeof phaseSchema>>({ resolver: zodResolver(phaseSchema) })
  useEffect(() => {
    if (!open) return
    form.reset({
      name: phase?.name ?? '',
      status: phase?.status ?? 'not-started',
      startDate: phase?.startDate ?? '',
      endDate: phase?.endDate ?? '',
      budget: phase?.budget ?? 0,
      notes: phase?.notes ?? '',
    })
  }, [open, phase, form])

  const submit = form.handleSubmit(async (v) => {
    setSaving(true)
    const body = {
      projectId,
      name: v.name.trim(),
      status: v.status as PhaseStatus,
      startDate: v.startDate || undefined,
      endDate: v.endDate || (v.status === 'done' && !phase?.endDate ? todayISO() : undefined),
      budget: v.budget,
      notes: v.notes?.trim() || undefined,
      position: phase?.position ?? nextPosition,
    }
    try {
      if (phase) await actions.update('phases', phase.id, body)
      else await actions.create('phases', body)
      onOpenChange(false)
    } catch {
      // toast shown
    } finally {
      setSaving(false)
    }
  })

  return (
    <Drawer
      error={actions.error}
      open={open}
      onOpenChange={onOpenChange}
      title={phase ? `Edit ${phase.name}` : 'Add a phase'}
      footer={
        <>
          {phase && onDelete && (
            <Button variant="ghost" icon={Trash2} className="mr-auto text-rose-600 hover:bg-rose-50" onClick={onDelete}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {phase ? 'Save phase' : 'Add phase'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field label="Phase" error={form.formState.errors.name?.message} htmlFor="ph-name">
          <Input id="ph-name" placeholder="e.g. Roofing" {...form.register('name')} />
        </Field>
        <Field label="Status" htmlFor="ph-status">
          <Select id="ph-status" options={PHASE_STATUSES} {...form.register('status')} />
        </Field>
        <FormGrid>
          <Field label="Started" htmlFor="ph-start">
            <Input id="ph-start" type="date" {...form.register('startDate')} />
          </Field>
          <Field label="Finished" htmlFor="ph-end">
            <Input id="ph-end" type="date" {...form.register('endDate')} />
          </Field>
        </FormGrid>
        <Field label="Budget" hint="Optional" htmlFor="ph-budget">
          <Input id="ph-budget" prefix="₵" type="number" inputMode="decimal" step="any" min={0} {...form.register('budget')} />
        </Field>
        <Field label="Notes" htmlFor="ph-notes">
          <Textarea id="ph-notes" placeholder="Who did the work, what’s left…" {...form.register('notes')} />
        </Field>
      </form>
    </Drawer>
  )
}

// ── Expense ──────────────────────────────────────────────────────────────────

const expenseSchema = z.object({
  projectId: z.string().optional(),
  phaseId: z.string().optional(),
  category: z.string(),
  description: z.string().trim().min(1, 'What was it for?'),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  unitCost: z.string().optional(),
  amount: z.string().optional(),
  date: z.string().min(1),
  supplier: z.string().optional(),
})
type ExpenseValues = z.infer<typeof expenseSchema>

export const ExpenseForm = ({
  open,
  onOpenChange,
  property,
  expense,
  preset,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  property: Property
  expense?: Expense | null
  preset?: { projectId?: number; phaseId?: number } | null
}) => {
  const p = usePortfolio()
  const actions = useRealEstateActions({ inline: true })
  const [saving, setSaving] = useState(false)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)
  const form = useForm<ExpenseValues>({ resolver: zodResolver(expenseSchema) })

  useEffect(() => {
    if (!open) return
    form.reset({
      projectId: String(expense?.projectId ?? preset?.projectId ?? ''),
      phaseId: String(expense?.phaseId ?? preset?.phaseId ?? ''),
      category: expense?.category ?? 'materials',
      description: expense?.description ?? '',
      quantity: expense?.quantity !== undefined ? String(expense.quantity) : '',
      unit: expense?.unit ?? '',
      unitCost: expense?.unitCost !== undefined ? String(expense.unitCost) : '',
      amount: expense ? String(expense.amount) : '',
      date: expense?.date ?? todayISO(),
      supplier: expense?.supplier ?? '',
    })
    setReceipt(null)
    setReceiptError(null)
    setAmountError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense, preset])

  const v = form.watch()
  const projects = p.projects.filter((x) => x.propertyId === property.id)
  const phases = useMemo(
    () => p.phases.filter((x) => String(x.projectId) === v.projectId).sort((a, b) => a.position - b.position),
    [p.phases, v.projectId]
  )
  const qty = v.quantity ? toNum(v.quantity) : undefined
  const unitCost = v.unitCost ? toNum(v.unitCost) : undefined
  const computed = qty !== undefined && unitCost !== undefined ? expenseAmount({ quantity: qty, unitCost, amount: 0 }) : null
  const amount = computed ?? (v.amount ? toNum(v.amount) : 0)

  const submit = form.handleSubmit(async (values) => {
    if (!(amount > 0)) {
      setAmountError('Enter the amount, or a quantity and unit price')
      return
    }
    setSaving(true)
    try {
      let documentId = expense?.documentId ?? null
      if (receipt) {
        const doc = await actions.uploadDocument(
          {
            title: `Receipt — ${values.description.trim()}`,
            category: 'receipt',
            propertyId: property.id,
            projectId: values.projectId ? Number(values.projectId) : null,
          },
          receipt
        )
        documentId = doc.id
      }
      const body = {
        propertyId: property.id,
        projectId: values.projectId ? Number(values.projectId) : null,
        phaseId: values.phaseId ? Number(values.phaseId) : null,
        category: values.category as ExpenseCategory,
        description: values.description.trim(),
        quantity: qty,
        unit: values.unit?.trim() || undefined,
        unitCost,
        amount,
        date: values.date,
        supplier: values.supplier?.trim() || undefined,
        documentId,
      }
      if (expense) await actions.update('expenses', expense.id, body)
      else await actions.create('expenses', body)
      onOpenChange(false)
    } catch {
      // toast shown
    } finally {
      setSaving(false)
    }
  })

  return (
    <Drawer
      error={actions.error}
      open={open}
      onOpenChange={onOpenChange}
      title={expense ? 'Edit expense' : 'Record an expense'}
      description={property.name}
      footer={
        <>
          <span className="mr-auto text-sm text-stone-600">
            Total <span className="font-extrabold text-stone-900 tabular-nums">{money(amount)}</span>
          </span>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {expense ? 'Save' : 'Record expense'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-6">
        {projects.length > 0 && (
          <FormGrid>
            <Field label="Project" htmlFor="ex-project">
              <Select
                id="ex-project"
                options={[{ value: '', label: 'Not part of a project' }, ...projects.map((x) => ({ value: String(x.id), label: x.name }))]}
                {...form.register('projectId', { onChange: () => form.setValue('phaseId', '') })}
              />
            </Field>
            <Field label="Phase" htmlFor="ex-phase">
              <Select
                id="ex-phase"
                disabled={!v.projectId}
                options={[
                  { value: '', label: 'General / no phase' },
                  ...phases.map((x) => ({ value: String(x.id), label: `${x.position}. ${x.name}` })),
                ]}
                {...form.register('phaseId')}
              />
            </Field>
          </FormGrid>
        )}
        <Field label="Category" htmlFor="ex-cat">
          <Select id="ex-cat" options={EXPENSE_CATEGORIES} {...form.register('category')} />
        </Field>
        {v.category === 'materials' && (
          <div className="flex flex-wrap gap-1.5 -mt-2" aria-label="Common materials">
            {MATERIAL_SUGGESTIONS.map((m) => (
              <button
                key={m.name}
                type="button"
                onClick={() => {
                  form.setValue('description', m.name, { shouldValidate: true })
                  form.setValue('unit', m.unit)
                  if (m.name.startsWith('Labour')) form.setValue('category', 'labour')
                }}
                className={cn(
                  'h-8 px-3 rounded-full border text-xs font-semibold transition-colors',
                  v.description === m.name
                    ? 'bg-endeavour text-white border-endeavour'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                )}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
        <Field label="Description" error={form.formState.errors.description?.message} htmlFor="ex-desc">
          <Input id="ex-desc" placeholder="e.g. Cement for foundation" {...form.register('description')} />
        </Field>
        <FormGrid cols={3}>
          <Field label="Quantity" htmlFor="ex-qty">
            <Input id="ex-qty" type="number" inputMode="decimal" step="any" min={0} placeholder="200" {...form.register('quantity')} />
          </Field>
          <Field label="Unit" htmlFor="ex-unit">
            <Input id="ex-unit" placeholder="bags" {...form.register('unit')} />
          </Field>
          <Field label="Price per unit" htmlFor="ex-unitcost">
            <Input
              id="ex-unitcost"
              prefix="₵"
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              placeholder="95"
              {...form.register('unitCost')}
            />
          </Field>
        </FormGrid>
        {computed !== null ? (
          <p className="text-sm text-stone-600 -mt-2">
            {qty} {v.unit || 'units'} × {money(unitCost ?? 0)} = <span className="font-bold text-stone-900">{money(computed)}</span>
          </p>
        ) : (
          <Field label="Amount" hint="Or fill quantity and price per unit above" error={amountError ?? undefined} htmlFor="ex-amount">
            <Input
              id="ex-amount"
              prefix="₵"
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              {...form.register('amount', { onChange: () => setAmountError(null) })}
            />
          </Field>
        )}
        <FormGrid>
          <Field label="Date" htmlFor="ex-date">
            <Input id="ex-date" type="date" {...form.register('date')} />
          </Field>
          <Field label="Supplier / paid to" htmlFor="ex-supplier">
            <Input id="ex-supplier" placeholder="e.g. Kumasi Cement Depot" {...form.register('supplier')} />
          </Field>
        </FormGrid>
        <Field
          label="Receipt"
          hint={
            expense?.documentId && !receipt
              ? 'A receipt is already attached — choose a file to add another'
              : 'Optional — a photo or PDF, saved to Documents'
          }
        >
          {receipt ? (
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2">
              <Paperclip className="h-4 w-4 text-stone-400" />
              <span className="text-sm text-stone-700 truncate flex-1">{receipt.name}</span>
              <span className="text-xs text-stone-400">{formatBytes(receipt.size)}</span>
              <button
                type="button"
                aria-label="Remove receipt"
                onClick={() => setReceipt(null)}
                className="text-stone-400 hover:text-rose-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-stone-300 text-sm font-semibold text-stone-600 hover:border-endeavour hover:text-endeavour cursor-pointer">
              <Paperclip className="h-4 w-4" /> Attach receipt
              <input
                type="file"
                accept={ACCEPT_ATTR}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (!f) return
                  const problem = fileProblem(f)
                  setReceiptError(problem)
                  if (!problem) setReceipt(f)
                }}
              />
            </label>
          )}
          {receiptError && <p className="text-xs text-rose-600">{receiptError}</p>}
        </Field>
      </form>
    </Drawer>
  )
}
