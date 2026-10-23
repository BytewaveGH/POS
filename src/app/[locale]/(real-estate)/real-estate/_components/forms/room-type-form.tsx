'use client'

import React, { useEffect, useState } from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ALL_PRIVATE, ALL_SHARED, AMENITY_SUGGESTIONS, FACILITIES, FACILITY_ACCESS } from '../../_logics/constants'
import { facilitySummary, layoutLabel, unitsUsingType } from '../../_logics/calc'
import { money, plural } from '../../_logics/format'
import { usePortfolio, useRealEstateActions } from '../../_logics/hooks'
import type { FacilityAccess, FacilityKey, RentalMode, UnitType } from '../../_logics/types'
import { Button } from '../ui'
import { Drawer, Field, FormGrid, FormSection, Input, Segmented, Textarea, toNum } from '../form'
import { FACILITY_ICONS } from '../facilities'

const schema = z.object({
  name: z.string().trim().min(1, 'Give the room type a name'),
  description: z.string().optional(),
  bedrooms: z.coerce.number().int().min(0).max(20),
  livingRooms: z.coerce.number().int().min(0).max(10),
  defaultMonthlyRent: z.coerce.number().min(0),
  defaultNightlyRate: z.coerce.number().min(0),
  maxGuests: z.coerce.number().int().min(0),
})
type Values = z.infer<typeof schema>

export const RoomTypeForm = ({
  open,
  onOpenChange,
  roomType,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  roomType?: UnitType | null
  onSaved?: (t: UnitType) => void
}) => {
  const p = usePortfolio()
  const actions = useRealEstateActions()
  const [saving, setSaving] = useState(false)
  const [facilities, setFacilities] = useState<Record<FacilityKey, FacilityAccess>>(ALL_SHARED)
  const [amenities, setAmenities] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const [mode, setMode] = useState<RentalMode>('long-term')
  const [applyRent, setApplyRent] = useState(false)
  const form = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!open) return
    form.reset({
      name: roomType?.name ?? '',
      description: roomType?.description ?? '',
      bedrooms: roomType?.bedrooms ?? 1,
      livingRooms: roomType?.livingRooms ?? 0,
      defaultMonthlyRent: roomType?.defaultMonthlyRent ?? 0,
      defaultNightlyRate: roomType?.defaultNightlyRate ?? 0,
      maxGuests: roomType?.maxGuests ?? 2,
    })
    setFacilities(roomType?.facilities ?? ALL_SHARED)
    setAmenities(roomType?.amenities ?? [])
    setMode(roomType?.rentalMode ?? 'long-term')
    setApplyRent(false)
    setCustom('')
  }, [open, roomType, form])

  const v = form.watch()
  const used = roomType ? unitsUsingType(roomType.id, p.units) : []
  const rentChanged =
    !!roomType &&
    (mode === 'long-term'
      ? toNum(v.defaultMonthlyRent) !== roomType.defaultMonthlyRent
      : toNum(v.defaultNightlyRate) !== roomType.defaultNightlyRate)
  const summary = facilitySummary(facilities)

  const toggleAmenity = (a: string) => setAmenities((list) => (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]))
  const addCustom = () => {
    const a = custom.trim()
    if (a && !amenities.some((x) => x.toLowerCase() === a.toLowerCase())) setAmenities((list) => [...list, a])
    setCustom('')
  }

  const submit = form.handleSubmit(async (values) => {
    const duplicate = p.unitTypes.find((t) => t.id !== roomType?.id && t.name.trim().toLowerCase() === values.name.trim().toLowerCase())
    if (duplicate) {
      form.setError('name', { message: 'You already have a room type with this name' })
      return
    }
    setSaving(true)
    const body: Omit<UnitType, 'id'> = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      bedrooms: values.bedrooms,
      livingRooms: values.livingRooms,
      facilities,
      amenities,
      rentalMode: mode,
      defaultMonthlyRent: mode === 'long-term' ? values.defaultMonthlyRent : 0,
      defaultNightlyRate: mode === 'short-stay' ? values.defaultNightlyRate : 0,
      maxGuests: mode === 'short-stay' ? values.maxGuests : 0,
    }
    try {
      const saved = roomType ? await actions.update('unitTypes', roomType.id, body) : await actions.create('unitTypes', body)
      if (roomType && applyRent && rentChanged) {
        // Listed price only — rent agreed in a lease is never touched.
        for (const u of used.filter((x) => x.rentalMode === mode)) {
          await actions.update(
            'units',
            u.id,
            mode === 'long-term' ? { monthlyRent: body.defaultMonthlyRent } : { nightlyRate: body.defaultNightlyRate }
          )
        }
      }
      onSaved?.(saved)
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
      open={open}
      onOpenChange={onOpenChange}
      title={roomType ? `Edit ${roomType.name}` : 'New room type'}
      description="Describe a kind of room once and reuse it across all your properties."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {roomType ? 'Save room type' : 'Create room type'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-7">
        <FormSection title="Room type">
          <Field label="Name" error={err.name?.message} htmlFor="rt-name" hint="e.g. Chamber & hall (self-contained)">
            <Input id="rt-name" placeholder="Name it the way you’d describe it to a tenant" {...form.register('name')} />
          </Field>
          <FormGrid>
            <Field label="Bedrooms" htmlFor="rt-bed">
              <Input id="rt-bed" type="number" inputMode="numeric" min={0} {...form.register('bedrooms')} />
            </Field>
            <Field label="Halls / sitting rooms" htmlFor="rt-hall">
              <Input id="rt-hall" type="number" inputMode="numeric" min={0} {...form.register('livingRooms')} />
            </Field>
          </FormGrid>
          <p className="text-xs text-stone-500 -mt-2">
            Layout: {layoutLabel({ bedrooms: toNum(v.bedrooms), livingRooms: toNum(v.livingRooms) })}
          </p>
        </FormSection>

        <FormSection title="Facilities">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFacilities(ALL_PRIVATE)}
              className="h-8 px-3 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:border-endeavour hover:text-endeavour"
            >
              Self-contained
            </button>
            <button
              type="button"
              onClick={() => setFacilities(ALL_SHARED)}
              className="h-8 px-3 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:border-endeavour hover:text-endeavour"
            >
              All shared
            </button>
            <span className="text-xs text-stone-500 ml-auto">→ {summary.label}</span>
          </div>
          <div className="rounded-2xl border border-stone-200 divide-y divide-stone-100">
            {FACILITIES.map((f) => {
              const Icon = FACILITY_ICONS[f.key]
              return (
                <div key={f.key} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="h-8 w-8 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-stone-800 flex-1 min-w-0">{f.label}</span>
                  <div className="w-[210px]">
                    <Segmented
                      ariaLabel={f.label}
                      value={facilities[f.key]}
                      onChange={(access) => setFacilities((cur) => ({ ...cur, [f.key]: access }))}
                      options={FACILITY_ACCESS}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </FormSection>

        <FormSection title="Extras">
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set([...AMENITY_SUGGESTIONS, ...amenities])).map((a) => {
              const on = amenities.includes(a)
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleAmenity(a)}
                  className={cn(
                    'h-8 px-3 rounded-full text-xs font-semibold border transition-colors inline-flex items-center gap-1',
                    on ? 'bg-endeavour text-white border-endeavour' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                  )}
                >
                  {a}
                  {on && !AMENITY_SUGGESTIONS.includes(a) && <X className="h-3 w-3" />}
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
              placeholder="Add another, e.g. Prepaid meter"
              aria-label="Add an extra"
            />
            <Button variant="secondary" icon={Plus} onClick={addCustom} disabled={!custom.trim()}>
              Add
            </Button>
          </div>
        </FormSection>

        <FormSection title="Default price">
          <Segmented
            ariaLabel="Rental mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'long-term', label: 'Monthly rent' },
              { value: 'short-stay', label: 'Nightly (Airbnb)' },
            ]}
          />
          {mode === 'long-term' ? (
            <Field label="Rent per month" hint="Pre-filled for new rooms of this type; each room can differ" htmlFor="rt-rent">
              <Input
                id="rt-rent"
                prefix="₵"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                {...form.register('defaultMonthlyRent')}
              />
            </Field>
          ) : (
            <FormGrid>
              <Field label="Rate per night" htmlFor="rt-night">
                <Input
                  id="rt-night"
                  prefix="₵"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  {...form.register('defaultNightlyRate')}
                />
              </Field>
              <Field label="Max guests" htmlFor="rt-guests">
                <Input id="rt-guests" type="number" inputMode="numeric" min={1} {...form.register('maxGuests')} />
              </Field>
            </FormGrid>
          )}
          {roomType && rentChanged && used.length > 0 && (
            <label className="flex items-start gap-3 rounded-2xl border border-stone-200 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 mt-0.5 accent-endeavour"
                checked={applyRent}
                onChange={(e) => setApplyRent(e.target.checked)}
              />
              <span className="text-sm text-stone-700">
                Also set the listed price of the {plural(used.length, 'room')} of this type to{' '}
                <span className="font-semibold">
                  {money(mode === 'long-term' ? toNum(v.defaultMonthlyRent) : toNum(v.defaultNightlyRate))}
                </span>
                <span className="block text-xs text-stone-500 mt-0.5">Rent already agreed with current tenants doesn’t change.</span>
              </span>
            </label>
          )}
          <Field label="Notes" htmlFor="rt-desc">
            <Textarea id="rt-desc" placeholder="e.g. Shares bathroom with 3 other rooms" {...form.register('description')} />
          </Field>
        </FormSection>
      </form>
    </Drawer>
  )
}
