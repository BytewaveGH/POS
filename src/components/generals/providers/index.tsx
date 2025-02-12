

import React from 'react'
import { TanstackQueryProvider } from './react-query'

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    // <NextAuthProvider>
    <TanstackQueryProvider>{children}</TanstackQueryProvider>
    // </NextAuthProvider>
  )
}
