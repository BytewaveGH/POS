'use client'

import { IGeneric } from '@/types/interfaces'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AxiosRequestConfig } from 'axios'
import { useSession } from 'next-auth/react'
import { apiClient } from '@/lib/axios-client'

export const fetcher = async (config: AxiosRequestConfig) => {
  return await apiClient(config).then(({ data }) => {
    const payload = data.data
    if (Array.isArray(payload)) return payload
    if (payload && Array.isArray(payload.data)) return payload.data
    return payload || []
  })
}

export const useFetchData = (key: string, config: IGeneric, enabled = true) => {
  const { status } = useSession()

  const { isFetching, isError, data, error, refetch } = useQuery({
    queryKey: [key],
    queryFn: () => fetcher(config as AxiosRequestConfig),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30_000),
    refetchInterval: false,
    staleTime: 0,
    refetchIntervalInBackground: true,
    enabled: enabled && status === 'authenticated',
  })

  return { data, isLoading: isFetching || status === 'loading', isError, error, refetch }
}
