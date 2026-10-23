'use client'

import React from 'react'
import { CookingPot, Droplets, ShowerHead, Toilet, Users, Zap, BadgeCheck, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FACILITIES } from '../_logics/constants'
import { facilitySummary, layoutLabel } from '../_logics/calc'
import type { FacilityAccess, FacilityKey, UnitType } from '../_logics/types'

export const FACILITY_ICONS: Record<FacilityKey, LucideIcon> = {
  bathroom: ShowerHead,
  toilet: Toilet,
  kitchen: CookingPot,
  electricity: Zap,
  water: Droplets,
}

// "Self-contained" / "Shared facilities" / "Own bath & toilet · shared kitchen".
export const FacilitySummaryPill = ({
  facilities,
  className,
}: {
  facilities?: Record<FacilityKey, FacilityAccess>
  className?: string
}) => {
  const s = facilitySummary(facilities)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap',
        s.selfContained ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' : 'bg-stone-100 text-stone-600 ring-stone-400/20',
        className
      )}
    >
      {s.selfContained ? <BadgeCheck className="h-3 w-3" /> : <Users className="h-3 w-3" />}
      {s.label}
    </span>
  )
}

// Every facility with its access level — private ones stand out, shared are
// muted, missing ones are struck out. Text always says which, so nothing
// relies on colour alone.
export const FacilityList = ({ facilities, compact }: { facilities?: Record<FacilityKey, FacilityAccess>; compact?: boolean }) => (
  <div className={cn('flex flex-wrap', compact ? 'gap-1' : 'gap-1.5')}>
    {FACILITIES.map((f) => {
      const access = facilities?.[f.key] ?? 'none'
      const Icon = FACILITY_ICONS[f.key]
      return (
        <span
          key={f.key}
          title={`${f.label}: ${access}`}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg border whitespace-nowrap',
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]',
            access === 'private' && 'border-endeavour/20 bg-endeavour/[0.06] text-endeavour font-semibold',
            access === 'shared' && 'border-stone-200 bg-white text-stone-600',
            access === 'none' && 'border-dashed border-stone-200 text-stone-400 line-through'
          )}
        >
          <Icon className="h-3 w-3 flex-shrink-0" />
          {access === 'private' ? f.privateLabel : access === 'shared' ? f.sharedLabel : f.label}
        </span>
      )
    })}
  </div>
)

export const TypeLine = ({ type }: { type?: UnitType }) =>
  type ? (
    <span>
      {type.name} · {layoutLabel(type)}
    </span>
  ) : (
    <span className="text-amber-700">No room type</span>
  )
