'use client'

import { Calendar, Home, Inbox, Search, Settings } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Fragment } from 'react'
import Image from 'next/image'
import byteLogo from '@/assets/images/byte.png'

interface SidebarProps {
  isGrouped?: boolean
  groupedItems?: any[]
}
// Menu items.
const items = [
  {
    title: 'Home',
    url: '#',
    icon: Home,
  },
  {
    title: 'Inbox',
    url: '#',
    icon: Inbox,
  },
  {
    title: 'Calendar',
    url: '#',
    icon: Calendar,
  },
  {
    title: 'Search',
    url: '#',
    icon: Search,
  },
  {
    title: 'Settings',
    url: '#',
    icon: Settings,
  },
]

export function AppSidebar({ isGrouped, groupedItems = [] }: SidebarProps) {
  return (
    <Sidebar>
      <SidebarContent>
        <Image src={byteLogo} alt="" width={300} height={50} />
        <SidebarGroup>
          {isGrouped ? (
            <>
              {groupedItems.map((group: { title: string; items: { label: string; href: string; icon: React.ReactNode | any }[] }) => {
                return (
                  <>
                    <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {group.items.map((item) => (
                          <SidebarMenuItem key={item.label}>
                            <SidebarMenuButton asChild>
                              <a href={item.href}>
                                <item.icon />
                                <span>{item.label}</span>
                              </a>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </>
                )
              })}
            </>
          ) : (
            <Fragment key={'no-group'}>
              <SidebarGroupLabel>Application</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </Fragment>
          )}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
