'use client'

import React, { useEffect, useMemo, useState } from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addMonths, subDays } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import { BILLING_CYCLES, PAYMENT_METHODS } from '../../_logics/constants'
import { leaseState, parseDate, rentSummary, toISODate, todayISO, unitOccupancy } from '../../_logics/calc'
import { money, shortDate } from '../../_logics/format'
import { usePortfolio, useRealEstateActions } from '../../_logics/hooks'
import type { Lease, PaymentMethod, Tenant } from '../../_logics/types'
import { Badge, Button, RENT } from '../ui'
import { Drawer, Field, FormGrid, FormSection, Input, Segmented, Select, Textarea, toNum } from '../form'

const ID_TYPES = [
  { value: 'ghana-card', label: 'Ghana Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'voter-id', label: "Voter's ID" },
  { value: 'drivers-license', label: "Driver's licence" },
  { value: 'other', label: 'Other' },
]
const TERMS = [
  { value: 12, label: '1 year' },
  { value: 24, label: '2 years' },
  { value: 36, label: '3 years' },
  { value: 6, label: '6 months' },
  { value: 0, label: 'No fixed end' },
]

// Shared tenant fields (used by move-in "new tenant" and the tenant form).
const TenantFields = ({ register, errors, prefix = '' }: { register: any; errors: any; prefix?: string }) => (
  <>
    <FormGrid>
      <Field label="Full name" error={errors?.[`${prefix}fullName`]?.message} htmlFor={`${prefix}fullName`}>
        <Input id={`${prefix}fullName`} placeholder="e.g. Kwame Mensah" {...register(`${prefix}fullName`)} />
      </Field>
      <Field label="Phone" error={errors?.[`${prefix}phone`]?.message} htmlFor={`${prefix}phone`}>
        <Input id={`${prefix}phone`} type="tel" inputMode="tel" placeholder="024 000 0000" {...register(`${prefix}phone`)} />
      </Field>
    </FormGrid>
    <FormGrid>
      <Field label="ID type" htmlFor={`${prefix}idType`}>
        <Select id={`${prefix}idType`} options={ID_TYPES} {...register(`${prefix}idType`)} />
      </Field>
      <Field label="ID number" htmlFor={`${prefix}idNumber`}>
        <Input id={`${prefix}idNumber`} placeholder="GHA-000000000-0" {...register(`${prefix}idNumber`)} />
      </Field>
    </FormGrid>
    <FormGrid>
      <Field label="Email" hint="Optional" htmlFor={`${prefix}email`}>
        <Input id={`${prefix}email`} type="email" {...register(`${prefix}email`)} />
      </Field>
      <Field label="Occupation" hint="Optional" htmlFor={`${prefix}occupation`}>
        <Input id={`${prefix}occupation`} {...register(`${prefix}occupation`)} />
      </Field>
    </FormGrid>
    <FormGrid>
      <Field label="Emergency contact" hint="Optional" htmlFor={`${prefix}emergencyContactName`}>
        <Input id={`${prefix}emergencyContactName`} {...register(`${prefix}emergencyContactName`)} />
      </Field>
      <Field label="Their phone" hint="Optional" htmlFor={`${prefix}emergencyContactPhone`}>
        <Input id={`${prefix}emergencyContactPhone`} type="tel" {...register(`${prefix}emergencyContactPhone`)} />
      </Field>
    </FormGrid>
  </>
)

const tenantShape = {
  fullName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  occupation: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
}

const tenantBody = (v: Record<string, any>): Omit<Tenant, 'id'> => ({
  fullName: String(v.fullName ?? '').trim(),
  phone: String(v.phone ?? '').trim(),
  email: v.email?.trim() || undefined,
  idType: (v.idType || undefined) as Tenant['idType'],
  idNumber: v.idNumber?.trim() || undefined,
  occupation: v.occupation?.trim() || undefined,
  emergencyContactName: v.emergencyContactName?.trim() || undefined,
  emergencyContactPhone: v.emergencyContactPhone?.trim() || undefined,
})

// ── Move in ──────────────────────────────────────────────────────────────────

const moveInSchema = z
  .object({
    unitId: z.string().min(1, 'Choose a unit'),
    tenantMode: z.enum(['new', 'existing']),
    tenantId: z.string().optional(),
    ...tenantShape,
    startDate: z.string().min(1, 'Pick a date'),
    monthlyRent: z.coerce.number().positive('Enter the monthly rent'),
    billingCycleMonths: z.coerce.number().int().min(1),
    termMonths: z.coerce.number().int().min(0),
    securityDeposit: z.coerce.number().min(0),
    firstPayment: z.coerce.number().min(0),
    method: z.string(),
    notes: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.tenantMode === 'existing' && !v.tenantId) ctx.addIssue({ code: 'custom', path: ['tenantId'], message: 'Choose a tenant' })
    if (v.tenantMode === 'new' && !v.fullName?.trim()) ctx.addIssue({ code: 'custom', path: ['fullName'], message: 'Name is required' })
    if (v.tenantMode === 'new' && !v.phone?.trim()) ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Phone is required' })
  })
type MoveInValues = z.infer<typeof moveInSchema>

export const MoveInForm = ({
  open,
  onOpenChange,
  unitId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  unitId?: number | null
}) => {
  const p = usePortfolio()
  const actions = useRealEstateActions({ inline: true })
  const [saving, setSaving] = useState(false)
  const today = todayISO()

  const vacantUnits = useMemo(
    () =>
      p.units
        .filter((u) => u.rentalMode === 'long-term' && ['vacant', 'reserved'].includes(unitOccupancy(u, p.leases, p.bookings, today)))
        .map((u) => ({
          value: String(u.id),
          label: `${p.propertyById.get(u.propertyId)?.name ?? 'Property'} · ${u.name} (${(u.unitTypeId !== null && p.unitTypeById.get(u.unitTypeId)?.name) || 'room'})`,
        })),
    [p.units, p.leases, p.bookings, p.propertyById, today]
  )

  const form = useForm<MoveInValues>({ resolver: zodResolver(moveInSchema) })
  // The preset unit may not be loaded yet when the drawer opens.
  const presetReady = !!(unitId && p.unitById.get(unitId))
  useEffect(() => {
    if (!open) return
    const unit = unitId ? p.unitById.get(unitId) : undefined
    const rent = unit?.monthlyRent ?? 0
    form.reset({
      unitId: unitId ? String(unitId) : '',
      tenantMode: 'new',
      tenantId: '',
      idType: 'ghana-card',
      startDate: today,
      monthlyRent: rent,
      billingCycleMonths: 12,
      termMonths: 12,
      securityDeposit: 0,
      firstPayment: rent * 12,
      method: 'momo',
      notes: '',
    })
    // When the drawer opens, and once more when its preset unit has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unitId, presetReady])

  const v = form.watch()
  const term = toNum(v.termMonths)
  const cycle = toNum(v.billingCycleMonths, 12)
  const rent = toNum(v.monthlyRent)
  const firstCycleAmount = rent * Math.min(cycle, term || cycle)
  const endDate = v.startDate && term > 0 ? toISODate(addMonths(parseDate(v.startDate), term)) : undefined
  const coveredMonths = rent > 0 ? toNum(v.firstPayment) / rent : 0
  const coversUntil =
    v.startDate && coveredMonths > 0 ? toISODate(subDays(addMonths(parseDate(v.startDate), Math.floor(coveredMonths)), 1)) : null

  // Changing unit / rent / cycle re-suggests the first payment.
  const suggest = (patch: Partial<MoveInValues>) => {
    const next = { ...form.getValues(), ...patch }
    const r = toNum(next.monthlyRent)
    const c = toNum(next.billingCycleMonths, 12)
    const t = toNum(next.termMonths)
    form.setValue('firstPayment', r * Math.min(c, t || c))
  }

  const submit = form.handleSubmit(async (values) => {
    setSaving(true)
    try {
      const tenantId = values.tenantMode === 'existing' ? Number(values.tenantId) : (await actions.create('tenants', tenantBody(values))).id
      const lease = await actions.create('leases', {
        unitId: Number(values.unitId),
        tenantId,
        startDate: values.startDate,
        endDate,
        monthlyRent: values.monthlyRent,
        billingCycleMonths: values.billingCycleMonths,
        securityDeposit: values.securityDeposit,
        notes: values.notes || undefined,
      })
      if (values.firstPayment > 0) {
        await actions.create('payments', {
          leaseId: lease.id,
          amount: values.firstPayment,
          paidOn: values.startDate <= today ? values.startDate : today,
          method: values.method as PaymentMethod,
          note: 'Advance at move-in',
        })
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
      title="Move a tenant in"
      description="Creates the tenancy and records the advance they paid."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={vacantUnits.length === 0 && !unitId}>
            Move in
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-7">
        <FormSection title="Unit">
          <Field label="Which unit?" error={err.unitId?.message} htmlFor="mi-unit">
            <Select
              id="mi-unit"
              placeholder={vacantUnits.length ? 'Choose a vacant unit' : 'No vacant long-term units'}
              options={vacantUnits}
              {...form.register('unitId', {
                onChange: (e) => {
                  const unit = p.unitById.get(Number(e.target.value))
                  if (unit) {
                    form.setValue('monthlyRent', unit.monthlyRent)
                    suggest({ monthlyRent: unit.monthlyRent })
                  }
                },
              })}
            />
          </Field>
        </FormSection>

        <FormSection title="Tenant">
          {p.tenants.length > 0 && (
            <Segmented
              ariaLabel="Tenant"
              value={v.tenantMode ?? 'new'}
              onChange={(m) => form.setValue('tenantMode', m)}
              options={[
                { value: 'new', label: 'New tenant' },
                { value: 'existing', label: 'Existing tenant' },
              ]}
            />
          )}
          {v.tenantMode === 'existing' ? (
            <Field label="Tenant" error={err.tenantId?.message} htmlFor="mi-tenant">
              <Select
                id="mi-tenant"
                placeholder="Choose a tenant"
                options={p.tenants.map((t) => ({ value: String(t.id), label: `${t.fullName} · ${t.phone}` }))}
                {...form.register('tenantId')}
              />
            </Field>
          ) : (
            <TenantFields register={form.register} errors={err} />
          )}
        </FormSection>

        <FormSection title="Tenancy">
          <FormGrid>
            <Field label="Move-in date" error={err.startDate?.message} htmlFor="mi-start">
              <Input id="mi-start" type="date" {...form.register('startDate')} />
            </Field>
            <Field label="Term" htmlFor="mi-term">
              <Select
                id="mi-term"
                options={TERMS}
                {...form.register('termMonths', { onChange: (e) => suggest({ termMonths: toNum(e.target.value) }) })}
              />
            </Field>
          </FormGrid>
          <FormGrid>
            <Field label="Rent per month" error={err.monthlyRent?.message} htmlFor="mi-rent">
              <Input
                id="mi-rent"
                prefix="₵"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                {...form.register('monthlyRent', { onChange: (e) => suggest({ monthlyRent: toNum(e.target.value) }) })}
              />
            </Field>
            <Field label="Pays" htmlFor="mi-cycle">
              <Select
                id="mi-cycle"
                options={BILLING_CYCLES}
                {...form.register('billingCycleMonths', { onChange: (e) => suggest({ billingCycleMonths: toNum(e.target.value) }) })}
              />
            </Field>
          </FormGrid>
          <Field label="Security deposit" hint="Refundable — not counted as rent" htmlFor="mi-deposit">
            <Input id="mi-deposit" prefix="₵" type="number" inputMode="decimal" step="any" min={0} {...form.register('securityDeposit')} />
          </Field>
        </FormSection>

        <FormSection title="Advance paid today">
          <FormGrid>
            <Field
              label="Amount received"
              htmlFor="mi-paid"
              hint={firstCycleAmount > 0 ? `Suggested ${money(firstCycleAmount)}` : undefined}
            >
              <Input id="mi-paid" prefix="₵" type="number" inputMode="decimal" step="any" min={0} {...form.register('firstPayment')} />
            </Field>
            <Field label="Paid by" htmlFor="mi-method">
              <Select id="mi-method" options={PAYMENT_METHODS} {...form.register('method')} />
            </Field>
          </FormGrid>
          <div className="rounded-2xl bg-stone-50 border border-stone-200 px-4 py-3 text-sm text-stone-600 leading-relaxed">
            {coversUntil ? (
              <>
                Covers rent until <span className="font-bold text-stone-900">{shortDate(coversUntil)}</span>
                {endDate && <> · lease ends {shortDate(endDate)}</>}
              </>
            ) : (
              <>No advance recorded — the first rent will show as due on {shortDate(v.startDate)}.</>
            )}
          </div>
          <Field label="Notes" htmlFor="mi-notes">
            <Textarea id="mi-notes" placeholder="Agreement details, items handed over, meter readings…" {...form.register('notes')} />
          </Field>
        </FormSection>
      </form>
    </Drawer>
  )
}

// ── Record payment ───────────────────────────────────────────────────────────

const paymentSchema = z.object({
  leaseId: z.string().min(1, 'Choose a tenancy'),
  amount: z.coerce.number().positive('Enter the amount'),
  paidOn: z.string().min(1),
  method: z.string(),
  reference: z.string().optional(),
  note: z.string().optional(),
})
type PaymentValues = z.infer<typeof paymentSchema>

export const PaymentForm = ({
  open,
  onOpenChange,
  leaseId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  leaseId?: number | null
}) => {
  const p = usePortfolio()
  const actions = useRealEstateActions({ inline: true })
  const [saving, setSaving] = useState(false)
  const today = todayISO()

  const options = useMemo(
    () =>
      p.leases
        .filter((l) => leaseState(l, today) !== 'ended' || rentSummary(l, p.payments, today).arrears > 0)
        .map((l) => {
          const unit = p.unitById.get(l.unitId)
          return { value: String(l.id), label: `${p.tenantById.get(l.tenantId)?.fullName ?? 'Tenant'} · ${unit?.name ?? 'Unit'}` }
        }),
    [p.leases, p.payments, p.unitById, p.tenantById, today]
  )

  const form = useForm<PaymentValues>({ resolver: zodResolver(paymentSchema) })
  const selected = p.leases.find((l) => String(l.id) === form.watch('leaseId'))
  const summary = selected ? rentSummary(selected, p.payments, today) : null

  useEffect(() => {
    if (!open) return
    const lease = leaseId ? p.leases.find((l) => l.id === leaseId) : undefined
    const due = lease ? rentSummary(lease, p.payments, today).nextDueAmount : 0
    form.reset({
      leaseId: leaseId ? String(leaseId) : '',
      amount: due || undefined,
      paidOn: today,
      method: 'momo',
      reference: '',
      note: '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leaseId])

  const submit = form.handleSubmit(async (v) => {
    setSaving(true)
    try {
      await actions.create('payments', {
        leaseId: Number(v.leaseId),
        amount: v.amount,
        paidOn: v.paidOn,
        method: v.method as PaymentMethod,
        reference: v.reference || undefined,
        note: v.note || undefined,
      })
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
      title="Record a payment"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Save payment
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field label="Tenant" error={err.leaseId?.message} htmlFor="pay-lease">
          <Select
            id="pay-lease"
            placeholder="Choose a tenancy"
            options={options}
            {...form.register('leaseId', {
              onChange: (e) => {
                const lease = p.leases.find((l) => String(l.id) === e.target.value)
                if (lease) form.setValue('amount', rentSummary(lease, p.payments, today).nextDueAmount || (undefined as unknown as number))
              },
            })}
          />
        </Field>
        {summary && (
          <div className="rounded-2xl border border-stone-200 px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-sm text-stone-600">
              Paid through <span className="font-semibold text-stone-900">{shortDate(summary.paidThrough)}</span>
              {summary.arrears > 0 && <span className="block text-rose-600 font-semibold">{money(summary.arrears)} outstanding</span>}
            </div>
            <Badge spec={RENT[summary.status]} />
          </div>
        )}
        <FormGrid>
          <Field label="Amount" error={err.amount?.message} htmlFor="pay-amount">
            <Input id="pay-amount" prefix="₵" type="number" inputMode="decimal" step="any" min={0} {...form.register('amount')} />
          </Field>
          <Field label="Date received" htmlFor="pay-date">
            <Input id="pay-date" type="date" {...form.register('paidOn')} />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Method" htmlFor="pay-method">
            <Select id="pay-method" options={PAYMENT_METHODS} {...form.register('method')} />
          </Field>
          <Field label="Reference" hint="MoMo / bank transaction ID" htmlFor="pay-ref">
            <Input id="pay-ref" {...form.register('reference')} />
          </Field>
        </FormGrid>
        <Field label="Note" htmlFor="pay-note">
          <Textarea id="pay-note" {...form.register('note')} />
        </Field>
      </form>
    </Drawer>
  )
}

// ── Tenant details ───────────────────────────────────────────────────────────

const tenantSchema = z.object({
  ...tenantShape,
  fullName: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().min(1, 'Phone is required'),
  notes: z.string().optional(),
})

export const TenantForm = ({
  open,
  onOpenChange,
  tenant,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  tenant?: Tenant | null
}) => {
  const actions = useRealEstateActions({ inline: true })
  const [saving, setSaving] = useState(false)
  const form = useForm<z.infer<typeof tenantSchema>>({ resolver: zodResolver(tenantSchema) })

  useEffect(() => {
    if (!open) return
    form.reset({
      fullName: tenant?.fullName ?? '',
      phone: tenant?.phone ?? '',
      email: tenant?.email ?? '',
      idType: tenant?.idType ?? 'ghana-card',
      idNumber: tenant?.idNumber ?? '',
      occupation: tenant?.occupation ?? '',
      emergencyContactName: tenant?.emergencyContactName ?? '',
      emergencyContactPhone: tenant?.emergencyContactPhone ?? '',
      notes: tenant?.notes ?? '',
    })
  }, [open, tenant, form])

  const submit = form.handleSubmit(async (v) => {
    setSaving(true)
    try {
      const body = { ...tenantBody(v), notes: v.notes?.trim() || undefined }
      if (tenant) await actions.update('tenants', tenant.id, body)
      else await actions.create('tenants', body)
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
      title={tenant ? `Edit ${tenant.fullName}` : 'Add a tenant'}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Save tenant
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TenantFields register={form.register} errors={form.formState.errors} />
        <Field label="Notes" htmlFor="t-notes">
          <Textarea id="t-notes" {...form.register('notes')} />
        </Field>
      </form>
    </Drawer>
  )
}

// ── Move out ─────────────────────────────────────────────────────────────────

export const MoveOutForm = ({ open, onOpenChange, lease }: { open: boolean; onOpenChange: (o: boolean) => void; lease: Lease | null }) => {
  const p = usePortfolio()
  const actions = useRealEstateActions({ inline: true })
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (open) setDate(todayISO())
  }, [open])
  if (!lease) return null

  const tenant = p.tenantById.get(lease.tenantId)
  const unit = p.unitById.get(lease.unitId)
  const summary = rentSummary({ ...lease, terminatedOn: date }, p.payments, todayISO())

  const submit = async () => {
    setSaving(true)
    try {
      await actions.update('leases', lease.id, { terminatedOn: date })
      onOpenChange(false)
    } catch {
      // toast shown
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      error={actions.error}
      open={open}
      onOpenChange={onOpenChange}
      title={`Move out ${tenant?.fullName ?? 'tenant'}`}
      description={unit ? `${unit.name} becomes vacant from the move-out date.` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} loading={saving}>
            Confirm move-out
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Move-out date" htmlFor="mo-date">
          <Input id="mo-date" type="date" value={date} min={lease.startDate} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {summary.arrears > 0 ? (
          <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{money(summary.arrears)} is still owed up to this date. It stays on their record after they move out.</p>
          </div>
        ) : (
          <p className="text-sm text-stone-600">Rent is settled up to this date.</p>
        )}
        {lease.securityDeposit > 0 && (
          <p className="text-sm text-stone-600">
            Remember to settle the <span className="font-semibold text-stone-900">{money(lease.securityDeposit)}</span> security deposit.
          </p>
        )}
      </div>
    </Drawer>
  )
}
