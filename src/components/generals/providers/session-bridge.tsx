'use client'

import { setSession } from '@/lib/session-store'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

export const SessionBridge = () => {
  const { data, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    setSession(data ?? null)
  }, [data, status])

  return null
}
