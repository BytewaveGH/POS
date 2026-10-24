'use client'

import ILayout from '@/components/generals/layouts'
import ToastTemplate from '@/components/templates/toast'
// Storefront fonts and styles, for the theme editor's live preview.
import '@/components/eatery/fonts'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ILayout>
      <ToastTemplate position="top-right" />
      {children}
    </ILayout>
  )
}
