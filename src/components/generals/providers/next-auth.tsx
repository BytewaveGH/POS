'use client'

import { SessionProvider } from 'next-auth/react'
import { useState } from 'react'
import { SessionBridge } from './session-bridge'
import { RefreshTokenHandler } from '@/app/[locale]/(auth)/_logics/refresh-token-handler'

interface NextAuthProviderProps {
  children: React.ReactNode
}

export const NextAuthProvider = ({ children }: NextAuthProviderProps) => {
  const [interval, setInterval] = useState(0)
  return (
    <SessionProvider refetchInterval={interval} refetchOnWindowFocus={true}>
      <SessionBridge />
      {children}
      <RefreshTokenHandler setInterval={setInterval} />
    </SessionProvider>
  )
}
