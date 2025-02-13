import axios, { AxiosRequestConfig } from 'axios'
import { getSession } from 'next-auth/react'

export const useAxios = () => {
  return async (config: AxiosRequestConfig) => {
    const session = await getSession()
    return axios({
      ...config,
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      headers: {
        Authorization: `Bearer ${session?.user.accessToken}`,
        'X-Tenant-Domain': session?.user?.tenant,
        'Cache-Control': 'no-cache',
      },
    })
  }
}
