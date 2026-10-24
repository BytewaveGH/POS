'use client'

import React, { useEffect } from 'react'
import { AlertTriangle, Building2, Lock, LogIn, RotateCw, WifiOff } from 'lucide-react'
import { forceLogout } from '@/lib/force-logout'
import { usePortfolio, type Portfolio } from '../_logics/hooks'
import { NO_ACCESS_MESSAGE } from '../_logics/errors'
import { Button, Card } from './ui'

const PANEL = {
  unavailable: { icon: Building2, title: 'Business unavailable' },
  server: { icon: WifiOff, title: 'Couldn’t load your properties' },
  request: { icon: AlertTriangle, title: 'Couldn’t load your properties' },
  rebind: { icon: LogIn, title: 'Please sign in again' },
} as const

// Shown instead of the page when any collection fails to load (other than a
// section's own 403). Nothing reloads until Retry is pressed.
export const LoadErrorPanel = ({ p }: { p: Pick<Portfolio, 'error' | 'errorKind' | 'retry' | 'isRetrying'> }) => {
  const kind = p.errorKind === 'forbidden' || !p.errorKind ? 'request' : p.errorKind
  useEffect(() => {
    if (kind === 'rebind') void forceLogout('rebind')
  }, [kind])
  const { icon: Icon, title } = PANEL[kind]
  return (
    <Card role="alert" className="flex flex-col items-center text-center px-6 py-14">
      <span className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-base font-bold text-stone-900">{title}</p>
      <p className="text-sm text-stone-500 mt-1 max-w-md">{p.error}</p>
      {kind !== 'rebind' && (
        <Button className="mt-5" icon={RotateCw} loading={p.isRetrying} onClick={p.retry}>
          Retry
        </Button>
      )}
    </Card>
  )
}

// Wraps every real-estate page.
export const LoadGate = ({ children }: { children: React.ReactNode }) => {
  const p = usePortfolio()
  return p.error ? <LoadErrorPanel p={p} /> : <>{children}</>
}

// A section this user can't read (no permission, or the backend said 403).
export const NoAccess = ({ message = NO_ACCESS_MESSAGE }: { message?: string }) => (
  <Card className="flex items-center gap-3 px-5 py-6 border-dashed">
    <span className="h-10 w-10 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center flex-shrink-0">
      <Lock className="h-5 w-5" />
    </span>
    <p className="text-sm text-stone-600">{message}</p>
  </Card>
)
