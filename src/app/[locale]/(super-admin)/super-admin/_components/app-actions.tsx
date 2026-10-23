'use client'

import React from 'react'
import Link from 'next/link'
import { Ban, CheckCircle2, Copy, ExternalLink, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { ROOT_DOMAIN } from '@/lib/tenant'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { tenantUrl } from '../_logics/insights'
import type { TenantRecord } from '../_logics/types'

// Row "⋯" menu shared by the table and card views.
export const AppActionsMenu = ({
  tenant,
  href,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  tenant: TenantRecord
  href: string
  onEdit: () => void
  onToggleStatus: () => void
  onDelete: () => void
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        aria-label={`Actions for ${tenant.name}`}
        className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-700 data-[state=open]:bg-stone-100"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-52 rounded-xl p-1">
      <DropdownMenuItem asChild className="rounded-lg gap-2 cursor-pointer">
        <Link href={href}>
          <Eye className="h-4 w-4" /> View details
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer" onSelect={onEdit}>
        <Pencil className="h-4 w-4" /> Edit
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="rounded-lg gap-2 cursor-pointer">
        <a href={tenantUrl(tenant.slug, ROOT_DOMAIN)} target="_blank" rel="noreferrer">
          <ExternalLink className="h-4 w-4" /> Open app
        </a>
      </DropdownMenuItem>
      <DropdownMenuItem
        className="rounded-lg gap-2 cursor-pointer"
        onSelect={() => void navigator.clipboard.writeText(tenantUrl(tenant.slug, ROOT_DOMAIN)).catch(() => {})}
      >
        <Copy className="h-4 w-4" /> Copy sign-in link
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer" onSelect={onToggleStatus}>
        {tenant.status === 'active' ? (
          <>
            <Ban className="h-4 w-4 text-amber-600" /> Suspend
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Reactivate
          </>
        )}
      </DropdownMenuItem>
      <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50" onSelect={onDelete}>
        <Trash2 className="h-4 w-4" /> Delete…
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)
