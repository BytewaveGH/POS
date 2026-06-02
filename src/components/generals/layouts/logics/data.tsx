'use client'

import {
  LayoutDashboard,
  BarChart,
  Package,
  Building2,
  Warehouse,
  ShoppingCart,
  Hourglass,
  CheckCircle,
  Users,
  UserCheck,
  Settings,
  CreditCard,
} from 'lucide-react'
import { ITopNavItems } from './interface'

export const topNavItems: ITopNavItems[] = [{ id: 1, label: '', content: '' }]

export const sidebarItems = [
  {
    title: 'Dashboard',
    items: [
      { label: 'Overview', href: '/en/stores/overview', icon: LayoutDashboard },
      { label: 'Analytics', href: '/en/stores/analytics', icon: BarChart },
    ],
  },
  {
    title: 'Products',
    items: [
      { label: 'All Products', href: '/en/stores/products', icon: Package },
      { label: 'Warehouse', href: '/en/stores/products/categories', icon: Building2 },
      { label: 'Inventory', href: '/en/stores/products/inventory', icon: Warehouse },
    ],
  },
  {
    title: 'Orders',
    items: [
      { label: 'All Orders', href: '/en/stores/orders', icon: ShoppingCart },
      { label: 'Pending Orders', href: '/en/stores/orders/pending', icon: Hourglass },
      { label: 'Completed Orders', href: '/en/stores/orders/completed', icon: CheckCircle },
    ],
  },
  {
    title: 'Users',
    items: [
      { label: 'Customers', href: '/en/stores/customers', icon: Users },
      { label: 'storess', href: '/en/stores/storess', icon: UserCheck },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Store Settings', href: '/en/stores/settings', icon: Settings },
      { label: 'Payment', href: '/en/stores/payment-settings', icon: CreditCard },
    ],
  },
]
