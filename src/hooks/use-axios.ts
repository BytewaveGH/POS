import { useCallback } from 'react'
import { AxiosRequestConfig } from 'axios'
import { apiClient } from '@/lib/axios-client'

// Stable across renders so it can be used in effect/callback dependencies.
export const useAxios = () => {
  return useCallback(async (config: AxiosRequestConfig) => {
    return apiClient(config)
  }, [])
}
