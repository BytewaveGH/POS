'use client'

import React, { createContext, useContext } from 'react'

// Lets any console page open the shell-level "Register app" wizard.
export const ConsoleContext = createContext<{ openRegister: () => void }>({ openRegister: () => {} })
export const useConsole = () => useContext(ConsoleContext)

export const useConsoleBase = (locale: string) => `/${locale}/super-admin`
