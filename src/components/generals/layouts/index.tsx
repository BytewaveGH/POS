'use client'

import React from 'react'
import { AppSidebar } from './widgets/sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import TopNav from './widgets/top-nav'
import { getSidebarItems } from './logics/data'
import { useSession } from 'next-auth/react'

const ILayout = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession()
  const user = session?.user as any
  const isEmployee = user?.accountType === 'employee'
  const sidebarItems = getSidebarItems(user?.appType)

  const visibleItems = isEmployee
    ? sidebarItems
        .map((group) => ({
          ...group,
          // requiredPermission: one key, or a list of which any one is enough.
          items: group.items.filter((item) => {
            const req: string | string[] | undefined = item.requiredPermission
            return !req || (Array.isArray(req) ? req : [req]).some((k) => !!user?.[k])
          }),
        }))
        .filter((group) => group.items.length > 0)
    : sidebarItems

  return (
    <main className="w-full">
      <nav className="w-full sticky left-0 top-0 z-10 bg-white">
        <TopNav />
      </nav>
      <SidebarProvider>
        <AppSidebar isGrouped groupedItems={visibleItems} />
        <main className="w-full flex">
          <SidebarTrigger />
          <div className="w-full p-3 md:p-4">{children}</div>
        </main>
      </SidebarProvider>
    </main>
  )
}

export default ILayout
