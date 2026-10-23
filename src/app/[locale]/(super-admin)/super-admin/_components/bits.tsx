'use client'

import React, { useState } from 'react'
import { Ban, Check, CheckCircle2, Copy } from 'lucide-react'
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

export const CopyButton = ({ value, label = 'Copy', className }: { value: string; label?: string; className?: string }) => {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(value)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          // Clipboard blocked (e.g. insecure context) — nothing to do.
        }
      }}
      aria-label={done ? 'Copied' : label}
      title={done ? 'Copied' : label}
      className={cn(
        'h-7 w-7 rounded-lg inline-flex items-center justify-center text-stone-400 hover:text-endeavour hover:bg-stone-100 transition-colors',
        className
      )}
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export const timeAgo = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : formatDistanceToNowStrict(d, { addSuffix: true })
}

export const fullDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
