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
  UserCog,
  Settings,
  CreditCard,
  ScanLine,
  Ticket,
  Compass,
  CalendarCheck,
  Trophy,
} from 'lucide-react'
import { ITopNavItems } from './interface'

export const topNavItems: ITopNavItems[] = [{ id: 1, label: '', content: '' }]

const retailSidebarItems = [
  {
    title: 'Point of Sale',
    items: [{ label: 'POS', href: '/en/stores/pos', icon: ScanLine, requiredPermission: 'canManageSales' }],
  },
  {
    title: 'Dashboard',
    items: [
      { label: 'Overview', href: '/en/stores/overview', icon: LayoutDashboard, requiredPermission: 'canViewReports' },
      { label: 'Analytics', href: '/en/stores/analytics', icon: BarChart, requiredPermission: 'canViewReports' },
    ],
  },
  {
    title: 'Products',
    items: [
      { label: 'All Products', href: '/en/stores/products', icon: Package, requiredPermission: 'canManageProducts' },
      { label: 'Warehouse', href: '/en/stores/products/categories', icon: Building2, requiredPermission: 'canManageWarehouses' },
      { label: 'Inventory', href: '/en/stores/products/inventory', icon: Warehouse, requiredPermission: 'canManageStock' },
    ],
  },
  {
    title: 'Orders',
    items: [
      { label: 'All Orders', href: '/en/stores/orders', icon: ShoppingCart, requiredPermission: 'canManageSales' },
      { label: 'Pending Orders', href: '/en/stores/orders/pending', icon: Hourglass, requiredPermission: 'canManageSales' },
      { label: 'Completed Orders', href: '/en/stores/orders/completed', icon: CheckCircle, requiredPermission: 'canManageSales' },
    ],
  },
  {
    title: 'Users',
    items: [
      { label: 'Customers', href: '/en/stores/customers', icon: Users, requiredPermission: 'canManageSales' },
      { label: 'Employees', href: '/en/stores/users', icon: UserCog, requiredPermission: 'canManageEmployees' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Store Settings', href: '/en/stores/settings', icon: Settings, requiredPermission: 'canManageOperations' },
      { label: 'Payment', href: '/en/stores/payment-settings', icon: CreditCard, requiredPermission: 'canManageOperations' },
    ],
  },
]

const amusementSidebarItems = [
  {
    title: 'Dashboard',
    items: [{ label: 'Overview', href: '/en/amusement', icon: LayoutDashboard, requiredPermission: 'canViewReports' }],
  },
  {
    title: 'Ticketing',
    items: [{ label: 'Tickets', href: '/en/amusement/tickets', icon: Ticket, requiredPermission: 'canManageSales' }],
  },
  {
    title: 'Park',
    items: [{ label: 'Attractions', href: '/en/amusement/attractions', icon: Compass, requiredPermission: 'canManageProducts' }],
  },
  {
    title: 'Reservations',
    items: [{ label: 'Bookings', href: '/en/amusement/bookings', icon: CalendarCheck, requiredPermission: 'canManageSales' }],
  },
  {
    title: 'Leaderboard',
    items: [{ label: 'Leaderboard', href: '/en/amusement/leaderboard', icon: Trophy, requiredPermission: 'canManageSales' }],
  },
  {
    title: 'Users',
    items: [{ label: 'Employees', href: '/en/stores/users', icon: UserCog, requiredPermission: 'canManageEmployees' }],
  },
]

// Eatery has no dedicated modules built yet (see the amusement park build for the
// pattern to follow) — keep it to what already exists so it doesn't dead-end on
// retail-only routes.
const eaterySidebarItems = [
  {
    title: 'Dashboard',
    items: [{ label: 'Overview', href: '/en/eatery', icon: LayoutDashboard, requiredPermission: 'canViewReports' }],
  },
  {
    title: 'Users',
    items: [{ label: 'Employees', href: '/en/stores/users', icon: UserCog, requiredPermission: 'canManageEmployees' }],
  },
]

const sidebarItemsByAppType: Record<string, typeof retailSidebarItems> = {
  retail: retailSidebarItems,
  amusement: amusementSidebarItems,
  eatery: eaterySidebarItems,
}

export const getSidebarItems = (appType: string | undefined | null) => sidebarItemsByAppType[appType ?? 'retail'] ?? retailSidebarItems

// Retail is still the default vertical — keep this export for anything importing the flat list directly.
export const sidebarItems = retailSidebarItems
