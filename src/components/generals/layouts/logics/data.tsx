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
} from 'lucide-react'
import { ITopNavItems } from './interface'

export const topNavItems: ITopNavItems[] = [{ id: 1, label: '', content: '' }]

export const sidebarItems = [
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
