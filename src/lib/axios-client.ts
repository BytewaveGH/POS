'use client'
import axios, { AxiosRequestConfig } from 'axios'
import { getSession } from 'next-auth/react'

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

apiClient.interceptors.request.use(async (config) => {
  const session = await getSession()
  if (session?.user?.accessToken) {
    config.headers['Authorization'] = `Bearer ${session.user.accessToken}`
    config.headers['X-Tenant-Domain'] = session.user.tenant
    config.headers['Cache-Control'] = 'no-cache'
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    original._retry = true

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((newToken: string) => {
          if (original.headers) original.headers['Authorization'] = `Bearer ${newToken}`
          resolve(apiClient(original))
        })
      })
    }

    isRefreshing = true
    try {
      const session = await getSession()
      if (!session?.user?.refreshToken) throw new Error('no refresh token')

      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        {},
        {
          headers: {
            'X-Refresh-Token': session.user.refreshToken,
            'X-Tenant-Domain': session.user.tenant,
          },
        }
      )
      const newToken: string = data.data.accessToken

      refreshQueue.forEach((cb) => cb(newToken))
      refreshQueue = []

      if (original.headers) original.headers['Authorization'] = `Bearer ${newToken}`
      return apiClient(original)
    } catch {
      refreshQueue = []
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)
