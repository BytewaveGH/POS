'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { HardDrive } from 'lucide-react'
import { DATA_SOURCE_KIND } from '../_logics/data-source'

export const useLocaleHref = () => {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  return (path: string) => `/${locale}/real-estate${path}`
}

// Wraps every real-estate page: width, rhythm, and the local-data notice.
export const ModuleFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full max-w-[1400px] mx-auto pb-16">
    {DATA_SOURCE_KIND === 'local' && (
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
        <HardDrive className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <span className="font-bold">Saved on this device only.</span> Real-estate data is stored in this browser until the Sellix backend
          for this module is live — it won’t appear on other devices and is lost if the browser’s site data is cleared.
        </p>
      </div>
    )}
    {children}
  </div>
)
