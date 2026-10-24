'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { askToNotify, chime, notify, notifyPermission } from '@/lib/eatery/notify'
import { formatMoney } from '@/lib/eatery/menu'
import type { Order } from '@/lib/eatery/types'

const SOUND_KEY = 'sellix-eatery:sound'
const readSound = () => {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

// Chimes (and shows a system notification) when a new online order arrives.
// Orders already waiting when the page opens don't ring.
export const useNewOrderAlert = (orders: Order[], currency: string) => {
  const seen = useRef<Set<number> | null>(null)
  const [sound, setSound] = useState(true)
  useEffect(() => setSound(readSound()), [])
  const waiting = orders.filter((o) => o.status === 'placed')
  useEffect(() => {
    const ids = new Set(waiting.map((o) => o.id))
    if (seen.current === null) {
      seen.current = ids
      return
    }
    const fresh = waiting.filter((o) => !seen.current!.has(o.id))
    seen.current = ids
    if (!fresh.length) return
    if (sound) chime('new')
    const o = fresh[0]
    notify(
      fresh.length === 1 ? `New order #${o.code}` : `${fresh.length} new orders`,
      fresh.length === 1
        ? `${o.customer.name} · ${o.lines.reduce((s, l) => s + l.quantity, 0)} items · ${formatMoney(o.total, currency)}`
        : 'Open Sellix to accept them',
      'eatery-new-order'
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting.map((o) => o.id).join(',')])

  const toggle = async () => {
    const next = !sound
    setSound(next)
    try {
      window.localStorage.setItem(SOUND_KEY, next ? 'on' : 'off')
    } catch {
      // per-device preference only
    }
    if (next) {
      chime('new')
      if (notifyPermission() === 'default') await askToNotify()
    }
  }
  return { waiting, sound, toggle }
}

export const SoundToggle = ({ sound, onToggle }: { sound: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={sound}
    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
  >
    {sound ? <Bell className="h-4 w-4 text-endeavour" /> : <BellOff className="h-4 w-4 text-stone-400" />}
    {sound ? 'Alerts on' : 'Alerts off'}
  </button>
)
