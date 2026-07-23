'use client'

import React from 'react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { useParams, usePathname } from 'next/navigation'
import { LayoutDashboard, Store } from 'lucide-react'

const NAV_ITEMS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, path: '' },
  { key: 'apps', label: 'Apps', icon: Store, path: '/apps' },
]

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const locale = (params?.locale as string) || 'en'
  const { data: session } = useSession()
  const isSuperAdmin = (session?.user as any)?.accountType === 'super-admin'

  const base = `/${locale}/super-admin`
  const isLoginPage = pathname?.startsWith(`${base}/login`)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="w-full bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between sticky top-0 z-10">
        <p className="bytewave-heading text-base">Bytewave · Super Admin</p>
        {isSuperAdmin && (
          <button
            onClick={() => signOut({ callbackUrl: `/${locale}/super-admin/login` })}
            className="text-xs text-gray-500 hover:text-red-500 font-medium"
          >
            Sign out
          </button>
        )}
      </nav>

      {isSuperAdmin && !isLoginPage ? (
        <div className="flex">
          <aside className="w-48 flex-shrink-0 border-r border-gray-200 bg-white min-h-[calc(100vh-3.25rem)] py-4 px-3">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const href = `${base}${item.path}`
                const active = pathname === href
                const Icon = item.icon
                return (
                  <Link
                    key={item.key}
                    href={href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active ? 'bg-endeavour/10 text-endeavour font-semibold' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </aside>
          <main className="flex-1 p-5 min-w-0">{children}</main>
        </div>
      ) : (
        <main className="p-5">{children}</main>
      )}
    </div>
  )
}
