import { AxiosRequestConfig } from 'axios'
import { apiClient } from '@/lib/axios-client'

export const useAxios = () => {
  return async (config: AxiosRequestConfig) => {
    return apiClient(config)
  }
}
