import React from 'react'
import { AppSidebar } from './widgets/sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import TopNav from './widgets/top-nav'
import { sidebarItems } from './logics/data'
import { auth } from '@/auth'

const ILayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth()
  const user = session?.user as any
  const isEmployee = user?.accountType === 'employee'

  // For employees, remove sidebar items their permissions don't cover.
  // Admins always see everything.
  const visibleItems = isEmployee
    ? sidebarItems
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.requiredPermission || !!user?.[item.requiredPermission]),
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
