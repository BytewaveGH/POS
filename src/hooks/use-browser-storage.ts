'use client'

import { useState } from 'react'
import { userDataCrypt } from './use-data-encrypt'

type StorageType = 'local' | 'session'
const getStorageKey = (key: string) => `G&&%bvs5dfd756^%^n$${key}`

export const useBrowserStorage = <T extends string>(storageType: StorageType) => {
  const [storedValues, setStoredValues] = useState<{ [key: string]: T | undefined | null }>({})

  const isClient = typeof window !== 'undefined'

  const getValue = (key: string): T | undefined => {
    if (!isClient) return undefined

    const storageKey = getStorageKey(key)
    const storedData = storageType === 'local' ? localStorage.getItem(storageKey) : sessionStorage.getItem(storageKey)

    if (storedData) {
      const decryptedData = userDataCrypt('decrypt', key, storedData)
      return decryptedData as T
    }
    return undefined
  }

  const setValue = (key: string, value: T) => {
    if (!isClient) return

    const storageKey = getStorageKey(key)
    const encryptedValue = userDataCrypt('encrypt', key, value)

    if (storageType === 'local') {
      localStorage.setItem(storageKey, encryptedValue as string)
    } else {
      sessionStorage.setItem(storageKey, encryptedValue as string)
    }

    setStoredValues((prev) => ({ ...prev, [key]: value }))
  }
  const setObjValue = (key: string, value: T) => {
    if (!isClient) return

    const storageKey = getStorageKey(key)
    const encryptedValue = userDataCrypt('encrypt', key, value)

    if (storageType === 'local') {
      localStorage.setItem(storageKey, encryptedValue as string)
    } else {
      sessionStorage.setItem(storageKey, encryptedValue as string)
    }

    setStoredValues((prev) => ({ ...prev, [key]: value }))
  }

  const removeValue = (key: string) => {
    if (!isClient) return

    const storageKey = getStorageKey(key)
    if (storageType === 'local') {
      localStorage.removeItem(storageKey)
    } else {
      sessionStorage.removeItem(storageKey)
    }

    setStoredValues((prev) => {
      const newValues = { ...prev }
      delete newValues[key]
      return newValues
    })
  }

  return { storedValues, getValue, setValue, removeValue, setObjValue }
}

// import { useEffect, useState } from 'react'
// import { userDataCrypt } from './useDataEncrypt'

// export const useBrowserStorage = <T>(storageType: 'local' | 'session', key: string, initialValue?: T) => {
//   const storageKey = `G&&%bvs5dfd756^%^n$${key}`
//   const [storedValue, setStoredValue] = useState<T | undefined>(initialValue)

//   useEffect(() => {
//     const storedData = storageType === 'local' ? localStorage.getItem(storageKey) : sessionStorage.getItem(storageKey)

//     if (storedData) {
//       const decryptedData = userDataCrypt('decrypt', storedData)
//       setStoredValue(decryptedData as T)
//     }
//   }, [storageKey, storageType])

//   const setValue = (value: T) => {
//     const encryptedValue = userDataCrypt('encrypt', value)
//     if (storageType === 'local') {
//       typeof window !== undefined && localStorage.setItem(storageKey, encryptedValue)
//     } else {
//       typeof window !== undefined && sessionStorage.setItem(storageKey, encryptedValue)
//     }
//     setStoredValue(value)
//   }

//   return [storedValue, setValue] as const
// }
