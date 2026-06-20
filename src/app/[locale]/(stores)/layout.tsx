import ILayout from '@/components/generals/layouts'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bytewave POS',
  description: 'Bytewave POS',
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  return <ILayout>{children}</ILayout>
}
