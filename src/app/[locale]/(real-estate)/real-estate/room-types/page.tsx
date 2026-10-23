'use client'

import React, { useMemo, useState } from 'react'
import { DoorOpen, Pencil, Plus, Shapes, Trash2 } from 'lucide-react'
import { usePortfolio, useRealEstateActions } from '../_logics/hooks'
import { layoutLabel, todayISO, unitOccupancy, unitsUsingType } from '../_logics/calc'
import { money, plural } from '../_logics/format'
import type { UnitType } from '../_logics/types'
import { Button, Card, ErrorNote, LoadingGrid, PageHeader, SectionTitle } from '../_components/ui'
import { ConfirmDialog } from '../_components/form'
import { FacilityList, FacilitySummaryPill } from '../_components/facilities'
import { PresetPicker } from '../_components/preset-picker'
import { RoomTypeForm } from '../_components/forms/room-type-form'

export default function RoomTypesPage() {
  const p = usePortfolio()
  const actions = useRealEstateActions()
  const today = todayISO()
  const [editing, setEditing] = useState<UnitType | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<UnitType | null>(null)

  const usage = useMemo(() => {
    const out = new Map<number, { units: number; properties: number; occupied: number }>()
    for (const t of p.unitTypes) {
      const units = unitsUsingType(t.id, p.units)
      out.set(t.id, {
        units: units.length,
        properties: new Set(units.map((u) => u.propertyId)).size,
        occupied: units.filter((u) => unitOccupancy(u, p.leases, p.bookings, today) === 'occupied').length,
      })
    }
    return out
  }, [p.unitTypes, p.units, p.leases, p.bookings, today])

  const untyped = p.units.filter((u) => u.unitTypeId === null || !p.unitTypeById.has(u.unitTypeId))

  return (
    <>
      <PageHeader
        eyebrow="Real estate"
        title="Room types"
        description="The kinds of rooms you rent — what each has, and which facilities are private or shared. Define them once; use them on every property."
        actions={
          <Button icon={Plus} onClick={() => setEditing(null)}>
            New room type
          </Button>
        }
      />
      {p.error && <ErrorNote message={p.error} />}
      {untyped.length > 0 && (
        <ErrorNote
          message={`${plural(untyped.length, 'unit')} ${untyped.length === 1 ? 'has' : 'have'} no room type. Open the property and edit ${untyped.length === 1 ? 'it' : 'them'} to choose one.`}
        />
      )}

      {p.isLoading ? (
        <LoadingGrid count={3} className="xl:grid-cols-3" />
      ) : p.unitTypes.length === 0 ? (
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-4 mb-5">
            <span className="h-12 w-12 rounded-2xl bg-endeavour/10 text-endeavour flex items-center justify-center flex-shrink-0">
              <Shapes className="h-6 w-6" />
            </span>
            <div>
              <p className="text-base font-bold text-stone-900">Start with the room types you have</p>
              <p className="text-sm text-stone-500 mt-1 max-w-xl">
                Tick the common ones — you can rename them, change prices and set exactly which facilities are shared — or create your own
                from scratch.
              </p>
            </div>
          </div>
          <PresetPicker />
          <div className="mt-4 pt-4 border-t border-stone-100">
            <Button variant="secondary" icon={Plus} onClick={() => setEditing(null)}>
              Create my own
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {p.unitTypes.map((t) => {
              const u = usage.get(t.id) ?? { units: 0, properties: 0, occupied: 0 }
              return (
                <Card key={t.id} className="p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-stone-900 leading-snug">{t.name}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{layoutLabel(t)}</p>
                    </div>
                    <p className="text-sm font-extrabold text-stone-900 tabular-nums whitespace-nowrap">
                      {t.rentalMode === 'long-term' ? money(t.defaultMonthlyRent) : money(t.defaultNightlyRate)}
                      <span className="text-[10px] font-medium text-stone-400">{t.rentalMode === 'long-term' ? '/mo' : '/night'}</span>
                    </p>
                  </div>
                  <FacilitySummaryPill facilities={t.facilities} className="self-start mt-3" />
                  <div className="mt-3">
                    <FacilityList facilities={t.facilities} compact />
                  </div>
                  {t.amenities.length > 0 && <p className="text-xs text-stone-500 mt-3">{t.amenities.join(' · ')}</p>}
                  {t.description && <p className="text-xs text-stone-500 mt-2 italic">{t.description}</p>}
                  <div className="mt-auto pt-4">
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-100">
                      <p className="text-xs text-stone-500 inline-flex items-center gap-1.5">
                        <DoorOpen className="h-3.5 w-3.5" />
                        {u.units === 0
                          ? 'Not used yet'
                          : `${plural(u.units, 'room')} · ${u.occupied} let${u.properties > 1 ? ` · ${u.properties} properties` : ''}`}
                      </p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(t)}
                          aria-label={`Edit ${t.name}`}
                          className="h-9 w-9 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-endeavour"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(t)}
                          disabled={u.units > 0}
                          title={u.units > 0 ? 'In use — change those rooms’ type first' : undefined}
                          aria-label={`Delete ${t.name}`}
                          className="h-9 w-9 rounded-xl flex items-center justify-center text-stone-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
          <div className="mt-8">
            <SectionTitle title="Add common types" hint="Typical Ghanaian room types you haven’t added yet" />
            <PresetPicker />
          </div>
        </>
      )}

      <RoomTypeForm open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} roomType={editing ?? null} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'room type'}?`}
        description="No rooms use it, so nothing else changes."
        onConfirm={() => deleting && void actions.remove('unitTypes', deleting.id).catch(() => {})}
      />
    </>
  )
}
