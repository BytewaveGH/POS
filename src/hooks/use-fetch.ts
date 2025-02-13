'use client'

import { IGeneric } from '@/types/interfaces'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { getSession } from 'next-auth/react'


export const fetcher = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
  const session = await getSession()
  return await axios({
    ...config,
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
      Authorization: `Bearer ${session?.user?.accessToken}`,
      'X-Tenant-Domain': session?.user?.tenant,
      'Cache-Control': 'no-cache',
    },
  }).then(({ data }) => data.data || [])
}

export const useFetchData = (key: string, config: IGeneric, enabled: boolean = true) => {
  const { isFetching, isError, data, error, refetch } = useQuery({
    queryKey: [key],
    queryFn: () => fetcher(config),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30_000),
    refetchInterval: false,
    staleTime: 0,
    refetchIntervalInBackground: true,
    enabled,
    // select: (fetchedData) => {
    //   if (streamData) {
    //     return [...streamData, ...fetchedData?.data?.data]
    //   } else {
    //     return fetchedData

    //   }
    // },
  })

  return {
    data,
    isLoading: isFetching,
    isError,
    error,
    refetch,
  }
}