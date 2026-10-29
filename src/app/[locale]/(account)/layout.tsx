'use client'

import ILayout from '@/components/generals/layouts'
import ToastTemplate from '@/components/templates/toast'

// Account pages shared by every module (plan & billing).
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ILayout>
      <ToastTemplate position="top-right" />
      {children}
    </ILayout>
  )
}
