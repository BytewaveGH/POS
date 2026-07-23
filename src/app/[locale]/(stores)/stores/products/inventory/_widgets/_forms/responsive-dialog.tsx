'use client'

import React from 'react'

interface ResponsiveDialogProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  maxWidthClassName?: string
  children: React.ReactNode
}

export default function ResponsiveDialog({
  open,
  onClose,
  title,
  subtitle,
  maxWidthClassName = 'sm:max-w-[480px]',
  children,
}: ResponsiveDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full ${maxWidthClassName} max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden`}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="bytewave-heading text-base">{title}</h2>
            {subtitle && <p className="bytewave-paragraph text-xs text-gray-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none mt-0.5">
            ✕
          </button>
        </div>

        {/* Body — content controls its own scroll/footer layout */}
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      </div>
    </div>
  )
}
