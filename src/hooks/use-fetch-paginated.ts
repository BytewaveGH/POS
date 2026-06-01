'use client'

import { IGeneric } from '@/types/interfaces'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AxiosRequestConfig } from 'axios'
import { useSession } from 'next-auth/react'
import { apiClient } from '@/lib/axios-client'

export const useFetchPaginated = (
    key: string,
    config: IGeneric,
    page: number,
    pageSize: number,
    enabled = true,
) => {
    const { status } = useSession()

    const { isFetching, isError, data, error, refetch } = useQuery({
        queryKey: [key, page, pageSize],
        queryFn: async () => {
            const cfg = config as AxiosRequestConfig
            const response = await apiClient({
                ...cfg,
                params: { ...(cfg.params ?? {}), limit: pageSize, offset: page * pageSize },
            })
            const payload = response.data.data
            if (payload && !Array.isArray(payload) && Array.isArray(payload.data)) {
                return { data: payload.data as any[], total: (payload.count as number) ?? 0 }
            }
            if (Array.isArray(payload)) {
                return { data: payload as any[], total: payload.length }
            }
            return { data: [] as any[], total: 0 }
        },
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: false,
        staleTime: 0,
        enabled: enabled && status === 'authenticated',
    })

    const result = data as { data: any[]; total: number } | undefined
    return {
        data: result?.data ?? [],
        total: result?.total ?? 0,
        isLoading: isFetching || status === 'loading',
        isError,
        error,
        refetch,
    }
}
