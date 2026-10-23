'use client'

import React, { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UNIT_TYPE_PRESETS } from '../_logics/constants'
import { layoutLabel } from '../_logics/calc'
import { money } from '../_logics/format'
import { usePortfolio, useRealEstateActions } from '../_logics/hooks'
import type { UnitType } from '../_logics/types'
import { Button } from './ui'
import { FacilitySummaryPill } from './facilities'

// Tick the common room types you have and add them in one go. Names that
// already exist are skipped; everything stays editable afterwards.
export const PresetPicker = ({ onAdded, compact }: { onAdded?: (types: UnitType[]) => void; compact?: boolean }) => {
  const p = usePortfolio()
  const actions = useRealEstateActions()
  const existing = new Set(p.unitTypes.map((t) => t.name.toLowerCase()))
  const available = UNIT_TYPE_PRESETS.filter((t) => !existing.has(t.name.toLowerCase()))
  const [picked, setPicked] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  if (available.length === 0) return null

  const add = async () => {
    setSaving(true)
    try {
      const created = await actions.createMany(
        'unitTypes',
        available.filter((t) => picked.includes(t.name))
      )
      setPicked([])
      onAdded?.(created)
    } catch {
      // toast shown
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
        {available.map((t) => {
          const on = picked.includes(t.name)
          return (
            <button
              key={t.name}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked((list) => (on ? list.filter((x) => x !== t.name) : [...list, t.name]))}
              className={cn(
                'flex items-start gap-3 rounded-2xl border p-3 text-left transition-all',
                on ? 'border-endeavour bg-endeavour/[0.04] ring-2 ring-endeavour/15' : 'border-stone-200 hover:border-stone-300 bg-white'
              )}
            >
              <span
                className={cn(
                  'h-5 w-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5',
                  on ? 'bg-endeavour border-endeavour text-white' : 'border-stone-300'
                )}
              >
                {on && <Check className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-stone-900">{t.name}</span>
                <span className="block text-xs text-stone-500 mt-0.5">
                  {layoutLabel(t)} ·{' '}
                  {t.rentalMode === 'long-term' ? `${money(t.defaultMonthlyRent)}/mo` : `${money(t.defaultNightlyRate)}/night`}
                </span>
                <FacilitySummaryPill facilities={t.facilities} className="mt-1.5" />
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-stone-500">Prices are suggestions — change them to match yours.</p>
        <Button size="sm" onClick={add} loading={saving} disabled={picked.length === 0}>
          {picked.length > 0 ? `Add ${picked.length} room type${picked.length === 1 ? '' : 's'}` : 'Add room types'}
        </Button>
      </div>
    </div>
  )
}
