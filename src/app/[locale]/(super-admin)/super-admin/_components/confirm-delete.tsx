'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/kit/ui'
import { Input } from '@/components/kit/form'
import type { TenantRecord } from '../_logics/types'

// Deleting a business is irreversible, so the operator types its subdomain to confirm.
export const ConfirmDeleteApp = ({
  tenant,
  onOpenChange,
  onConfirm,
}: {
  tenant: TenantRecord | null
  onOpenChange: (o: boolean) => void
  onConfirm: (t: TenantRecord) => Promise<unknown>
}) => {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => setTyped(''), [tenant])
  const matches = !!tenant && typed.trim() === tenant.slug

  return (
    <AlertDialog open={!!tenant} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <div className="h-11 w-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-1">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <AlertDialogTitle className="text-stone-900">Delete {tenant?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The business, its owner login and its subdomain will be removed. This cannot be undone — suspending keeps the data and is
            reversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm-slug" className="text-[13px] font-semibold text-stone-700">
            Type <span className="font-mono text-rose-600">{tenant?.slug}</span> to confirm
          </label>
          <Input id="confirm-slug" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
          <Button
            variant="danger"
            disabled={!matches}
            loading={busy}
            className="bg-rose-600 text-white border-rose-600 hover:bg-rose-700"
            onClick={async () => {
              if (!tenant) return
              setBusy(true)
              try {
                await onConfirm(tenant)
                onOpenChange(false)
              } catch {
                // toast shown by the action
              } finally {
                setBusy(false)
              }
            }}
          >
            Delete permanently
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
