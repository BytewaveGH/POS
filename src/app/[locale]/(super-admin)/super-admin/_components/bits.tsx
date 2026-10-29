'use client'

import React from 'react'
import { Ban, CheckCircle2 } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { cn } from '@/lib/utils'
import { verticalMeta } from '../_logics/verticals'
import type { TenantStatus } from '../_logics/types'

export const VerticalBadge = ({ appType, className }: { appType: string; className?: string }) => {
  const v = verticalMeta(appType)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700 whitespace-nowrap',
        className
      )}
    >
      <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: v.color }} aria-hidden />
      {v.short}
    </span>
  )
}

export const StatusPill = ({ status }: { status: TenantStatus }) =>
  status === 'active' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
      <CheckCircle2 className="h-3 w-3" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/15">
      <Ban className="h-3 w-3" /> Suspended
    </span>
  )

// Square app mark tinted by vertical; suspended apps are desaturated.
export const AppAvatar = ({
  name,
  appType,
  status,
  size = 'md',
}: {
  name: string
  appType: string
  status?: TenantStatus
  size?: 'sm' | 'md' | 'lg'
}) => {
  const v = verticalMeta(appType)
  const Icon = v.icon
  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center rounded-xl text-white flex-shrink-0 shadow-sm',
        size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-10 w-10',
        status === 'suspended' && 'grayscale opacity-60'
      )}
      style={{ background: `linear-gradient(135deg, ${v.color}, ${v.color}cc)` }}
      aria-hidden
    >
      <Icon className={size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={1.75} />
      <span className="absolute -bottom-1 -right-1 rounded-md bg-white px-1 text-[9px] font-extrabold text-stone-700 shadow ring-1 ring-stone-200">
        {name.trim()[0]?.toUpperCase() ?? '?'}
      </span>
    </span>
  )
}

// Moved to the shared kit (also used by business dashboards).
export { CopyButton } from '@/components/kit/ui'

export const timeAgo = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : formatDistanceToNowStrict(d, { addSuffix: true })
}

export const fullDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
