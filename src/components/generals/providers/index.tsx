import React from 'react'
import { TanstackQueryProvider } from './react-query'
import { NextAuthProvider } from './next-auth'

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <TanstackQueryProvider>
      <NextAuthProvider>
          {/* <ReactFlowProvider>{children}</ReactFlowProvider> */}
          {children}
      </NextAuthProvider>
    </TanstackQueryProvider>
  )
}
