'use client'

import React, { useEffect, useMemo, useState } from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addDays } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import { BOOKING_CHANNELS, BOOKING_STATUSES, MAINTENANCE_PRIORITIES, MAINTENANCE_STATUSES } from '../../_logics/constants'
import { bookingNights, findBookingConflict, parseDate, toISODate, todayISO } from '../../_logics/calc'
import { dayMonth, money, plural } from '../../_logics/format'
import { usePortfolio, useRealEstateActions } from '../../_logics/hooks'
import type {
  Booking,
  BookingChannel,
  BookingStatus,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceStatus,
} from '../../_logics/types'
import { Button } from '../ui'
import { Drawer, Field, FormGrid, FormSection, Input, Select, Textarea, toNum } from '../form'

// ── Booking (short stay) ─────────────────────────────────────────────────────

const bookingSchema = z
  .object({
    unitId: z.string().min(1, 'Choose a unit'),
    guestName: z.string().trim().min(1, 'Guest name is required'),
    guestPhone: z.string().optional(),
    guests: z.coerce.number().int().min(1),
    checkIn: z.string().min(1, 'Pick a date'),
    checkOut: z.string().min(1, 'Pick a date'),
    nightlyRate: z.coerce.number().min(0),
    cleaningFee: z.coerce.number().min(0),
    amountPaid: z.coerce.number().min(0),
    channel: z.string(),
    status: z.string(),
    notes: z.string().optional(),
  })
  .refine((v) => v.checkOut > v.checkIn, { path: ['checkOut'], message: 'Check-out must be after check-in' })
type BookingValues = z.infer<typeof bookingSchema>

export const BookingForm = ({
  open,
  onOpenChange,
  booking,
  preset,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  booking?: Booking | null
  preset?: { unitId?: number; checkIn?: string } | null
}) => {
  const p = usePortfolio()
  const actions = useRealEstateActions({ inline: true })
  const [saving, setSaving] = useState(false)

  const units = useMemo(
    () =>
      p.units
        .filter((u) => u.rentalMode === 'short-stay')
        .map((u) => ({ value: String(u.id), label: `${p.propertyById.get(u.propertyId)?.name ?? 'Property'} · ${u.name}` })),
    [p.units, p.propertyById]
  )

  const form = useForm<BookingValues>({ resolver: zodResolver(bookingSchema) })
  const presetUnitId = booking?.unitId ?? preset?.unitId
  const presetReady = !!(presetUnitId && p.unitById.get(presetUnitId))
  useEffect(() => {
    if (!open) return
    const unitId = booking?.unitId ?? preset?.unitId
    const unit = unitId ? p.unitById.get(unitId) : undefined
    const checkIn = booking?.checkIn ?? preset?.checkIn ?? todayISO()
    form.reset({
      unitId: unitId ? String(unitId) : '',
      guestName: booking?.guestName ?? '',
      guestPhone: booking?.guestPhone ?? '',
      guests: booking?.guests ?? 2,
      checkIn,
      checkOut: booking?.checkOut ?? toISODate(addDays(parseDate(checkIn), 2)),
      nightlyRate: booking?.nightlyRate ?? unit?.nightlyRate ?? 0,
      cleaningFee: booking?.cleaningFee ?? 0,
      amountPaid: booking?.amountPaid ?? 0,
      channel: booking?.channel ?? 'direct',
      status: booking?.status ?? 'confirmed',
      notes: booking?.notes ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking, preset, presetReady])

  const v = form.watch()
  const nights = v.checkIn && v.checkOut && v.checkOut > v.checkIn ? bookingNights(v) : 0
  const total = nights * toNum(v.nightlyRate) + toNum(v.cleaningFee)
  const conflict =
    v.unitId && nights > 0 && v.status !== 'cancelled'
      ? findBookingConflict({ id: booking?.id, unitId: Number(v.unitId), checkIn: v.checkIn, checkOut: v.checkOut }, p.bookings)
      : undefined

  const submit = form.handleSubmit(async (values) => {
    if (conflict) return
    setSaving(true)
    const body = {
      ...values,
      unitId: Number(values.unitId),
      channel: values.channel as BookingChannel,
      status: values.status as BookingStatus,
      guestPhone: values.guestPhone || undefined,
      notes: values.notes || undefined,
    }
    try {
      if (booking) await actions.update('bookings', booking.id, body)
      else await actions.create('bookings', body)
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
      title={booking ? 'Edit booking' : 'New booking'}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!!conflict}>
            {booking ? 'Save booking' : 'Create booking'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-7">
        <FormSection title="Stay">
          <Field label="Unit" error={err.unitId?.message} htmlFor="b-unit">
            <Select
              id="b-unit"
              placeholder={units.length ? 'Choose a unit' : 'No short-stay units yet'}
              options={units}
              {...form.register('unitId', {
                onChange: (e) => {
                  const unit = p.unitById.get(Number(e.target.value))
                  if (unit && !booking) form.setValue('nightlyRate', unit.nightlyRate)
                },
              })}
            />
          </Field>
          <FormGrid>
            <Field label="Check-in" error={err.checkIn?.message} htmlFor="b-in">
              <Input id="b-in" type="date" {...form.register('checkIn')} />
            </Field>
            <Field label="Check-out" error={err.checkOut?.message} htmlFor="b-out">
              <Input id="b-out" type="date" min={v.checkIn} {...form.register('checkOut')} />
            </Field>
          </FormGrid>
          {conflict && (
            <div role="alert" className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Overlaps {conflict.guestName}’s stay ({dayMonth(conflict.checkIn)} – {dayMonth(conflict.checkOut)}). Choose other dates or
                another unit.
              </p>
            </div>
          )}
        </FormSection>

        <FormSection title="Guest">
          <FormGrid>
            <Field label="Guest name" error={err.guestName?.message} htmlFor="b-guest">
              <Input id="b-guest" {...form.register('guestName')} />
            </Field>
            <Field label="Phone" htmlFor="b-phone">
              <Input id="b-phone" type="tel" {...form.register('guestPhone')} />
            </Field>
          </FormGrid>
          <FormGrid>
            <Field label="Guests" htmlFor="b-guests">
              <Input id="b-guests" type="number" inputMode="numeric" min={1} {...form.register('guests')} />
            </Field>
            <Field label="Booked via" htmlFor="b-channel">
              <Select id="b-channel" options={BOOKING_CHANNELS} {...form.register('channel')} />
            </Field>
          </FormGrid>
        </FormSection>

        <FormSection title="Payment">
          <FormGrid cols={3}>
            <Field label="Per night" htmlFor="b-rate">
              <Input id="b-rate" prefix="₵" type="number" inputMode="decimal" step="any" min={0} {...form.register('nightlyRate')} />
            </Field>
            <Field label="Cleaning fee" htmlFor="b-clean">
              <Input id="b-clean" prefix="₵" type="number" inputMode="decimal" step="any" min={0} {...form.register('cleaningFee')} />
            </Field>
            <Field label="Paid so far" htmlFor="b-paid">
              <Input id="b-paid" prefix="₵" type="number" inputMode="decimal" step="any" min={0} {...form.register('amountPaid')} />
            </Field>
          </FormGrid>
          <div className="rounded-2xl bg-stone-50 border border-stone-200 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-stone-600">
              {plural(nights, 'night')} · total <span className="font-bold text-stone-900 tabular-nums">{money(total)}</span>
            </span>
            {total > toNum(v.amountPaid) && (
              <span className="font-semibold text-amber-700 tabular-nums">{money(total - toNum(v.amountPaid))} to collect</span>
            )}
          </div>
          <Field label="Status" htmlFor="b-status">
            <Select id="b-status" options={BOOKING_STATUSES} {...form.register('status')} />
          </Field>
          <Field label="Notes" htmlFor="b-notes">
            <Textarea id="b-notes" placeholder="Arrival time, special requests…" {...form.register('notes')} />
          </Field>
        </FormSection>
      </form>
    </Drawer>
  )
}

// ── Maintenance ──────────────────────────────────────────────────────────────

const maintenanceSchema = z.object({
  propertyId: z.string().min(1, 'Choose a property'),
  unitId: z.string().optional(),
  title: z.string().trim().min(1, 'Describe the issue in a few words'),
  description: z.string().optional(),
  priority: z.string(),
  status: z.string(),
  cost: z.coerce.number().min(0),
  reportedOn: z.string().min(1),
})
type MaintenanceValues = z.infer<typeof maintenanceSchema>

export const MaintenanceForm = ({
  open,
  onOpenChange,
  item,
  propertyId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  item?: MaintenanceRequest | null
  propertyId?: number
}) => {
  const p = usePortfolio()
  const actions = useRealEstateActions({ inline: true })
  const [saving, setSaving] = useState(false)
  const form = useForm<MaintenanceValues>({ resolver: zodResolver(maintenanceSchema) })

  useEffect(() => {
    if (!open) return
    form.reset({
      propertyId: String(item?.propertyId ?? propertyId ?? p.properties[0]?.id ?? ''),
      unitId: item?.unitId ? String(item.unitId) : '',
      title: item?.title ?? '',
      description: item?.description ?? '',
      priority: item?.priority ?? 'medium',
      status: item?.status ?? 'open',
      cost: item?.cost ?? 0,
      reportedOn: item?.reportedOn ?? todayISO(),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item, propertyId])

  const selectedProperty = Number(form.watch('propertyId'))
  const unitOptions = [{ value: '', label: 'Whole property / shared area' }].concat(
    p.units.filter((u) => u.propertyId === selectedProperty).map((u) => ({ value: String(u.id), label: u.name }))
  )

  const submit = form.handleSubmit(async (v) => {
    setSaving(true)
    const status = v.status as MaintenanceStatus
    const body = {
      propertyId: Number(v.propertyId),
      unitId: v.unitId ? Number(v.unitId) : null,
      title: v.title,
      description: v.description || undefined,
      priority: v.priority as MaintenancePriority,
      status,
      cost: v.cost,
      reportedOn: v.reportedOn,
      resolvedOn: status === 'resolved' ? (item?.resolvedOn ?? todayISO()) : undefined,
    }
    try {
      if (item) await actions.update('maintenance', item.id, body)
      else await actions.create('maintenance', body)
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
      title={item ? 'Edit request' : 'Log a repair'}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {item ? 'Save' : 'Log repair'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <FormGrid>
          <Field label="Property" error={err.propertyId?.message} htmlFor="m-prop">
            <Select
              id="m-prop"
              placeholder="Choose a property"
              options={p.properties.map((x) => ({ value: String(x.id), label: x.name }))}
              {...form.register('propertyId', { onChange: () => form.setValue('unitId', '') })}
            />
          </Field>
          <Field label="Where" htmlFor="m-unit">
            <Select id="m-unit" options={unitOptions} {...form.register('unitId')} />
          </Field>
        </FormGrid>
        <Field label="Issue" error={err.title?.message} htmlFor="m-title">
          <Input id="m-title" placeholder="e.g. Leaking tap in bathroom" {...form.register('title')} />
        </Field>
        <Field label="Details" htmlFor="m-desc">
          <Textarea id="m-desc" {...form.register('description')} />
        </Field>
        <FormGrid>
          <Field label="Priority" htmlFor="m-priority">
            <Select id="m-priority" options={MAINTENANCE_PRIORITIES} {...form.register('priority')} />
          </Field>
          <Field label="Status" htmlFor="m-status">
            <Select id="m-status" options={MAINTENANCE_STATUSES} {...form.register('status')} />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Cost" hint="Parts and labour" htmlFor="m-cost">
            <Input id="m-cost" prefix="₵" type="number" inputMode="decimal" step="any" min={0} {...form.register('cost')} />
          </Field>
          <Field label="Reported on" htmlFor="m-date">
            <Input id="m-date" type="date" {...form.register('reportedOn')} />
          </Field>
        </FormGrid>
      </form>
    </Drawer>
  )
}
