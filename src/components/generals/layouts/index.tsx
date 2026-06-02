import React from 'react'
import { AppSidebar } from './widgets/sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import TopNav from './widgets/top-nav'
import { sidebarItems } from './logics/data'

const ILayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="w-full">
      <nav className="w-full sticky left-0 top-0 z-10 bg-white">
        <TopNav />
      </nav>
      <SidebarProvider>
        <AppSidebar isGrouped groupedItems={sidebarItems} />
        <main className="w-full flex">
          <SidebarTrigger />
          <div className="w-full p-3 md:p-4">{children}</div>
        </main>
      </SidebarProvider>
    </main>
  )
}

export default ILayout
