import { IGeneric } from '@/types/interfaces'
import { axiosInstance } from './axios-instance'
// import { getSession } from 'next-auth/react'

const axiosConfig = async (config: IGeneric) => {
  // const session = await getSession()

  // if (!session) {
  //   throw new Error('Not authenticated')
  // }

  return axiosInstance({
    ...config,
    url: `${config?.url}`,
    headers: {
      // Authorization: `Bearer ${session?.user?.accessToken}`,
      'Content-Type': `${config?.contentType == 'multipart/form-data' ? 'multipart/form-data' : 'application/json'}`,
      // 'X-Tenant-Domain': session?.user?.tenant || 'benmeredith',
    },
  })
}
export default axiosConfig
