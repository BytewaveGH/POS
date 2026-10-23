'use client'

import ILayout from '@/components/generals/layouts'
import ToastTemplate from '@/components/templates/toast'
import { ModuleFrame } from './real-estate/_components/module-frame'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ILayout>
      <ToastTemplate position="top-right" />
      <ModuleFrame>{children}</ModuleFrame>
    </ILayout>
  )
}
