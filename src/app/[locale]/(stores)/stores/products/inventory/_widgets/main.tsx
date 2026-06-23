'use client'

import TabTemplate from '@/components/templates/tab'
import React, { useMemo, useState } from 'react'
import { InventoryTabs } from '../_logics/data'
import ButtonTemplate from '@/components/templates/button'
import { SheetTemplate } from '@/components/templates/sheet'
import { UpdateStates } from '@/lib/functions/update-states'
import CreateProduct from './_forms/create-product'
import CreateInvoice from './_forms/create-invoice'
import CreateOperation from './_forms/create-operation'
import BulkStock from './_forms/bulk-stock'
import CreateTransfer from './_forms/create-transfer'
import DatagridTemplate from '@/components/templates/datagrid'
import { useFetchPaginated } from '@/hooks/use-fetch-paginated'
import { useFetchData } from '@/hooks/use-fetch'
import { useAxios } from '@/hooks/use-axios'
import { ProductServices, InvoiceServices, StocksServices, OperationsServices, TransferServices } from '../_logics/services'
import { StatisticsServices } from '../../../overview/_logics/services'
import { IGeneric } from '@/types/interfaces'
import { SalesServices } from '../../../pos/_logics/services'
import { AlertTriangle, Package, FileText, ShoppingCart, Boxes, ArrowLeftRight } from 'lucide-react'
import { useSession } from 'next-auth/react'

// ── Custom pagination controls ──────────────────────────────────────────────
const Pagination = ({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
  onPageSize: (s: number) => void
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, total)
  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 bg-white text-xs text-gray-500">
      <span>{total > 0 ? `${from}–${to} of ${total} records` : 'No records'}</span>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span>Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSize(Number(e.target.value))
              onPage(0)
            }}
            className="border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-endeavour"
          >
            {[100, 300, 500, 1000].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            disabled={page === 0}
            onClick={() => onPage(0)}
            className="px-1.5 py-0.5 rounded border border-gray-200 disabled:opacity-30 hover:border-endeavour transition-colors"
          >
            «
          </button>
          <button
            disabled={page === 0}
            onClick={() => onPage(page - 1)}
            className="px-1.5 py-0.5 rounded border border-gray-200 disabled:opacity-30 hover:border-endeavour transition-colors"
          >
            ‹
          </button>
          <span className="px-2 font-medium text-stone-600">
            Page {page + 1} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => onPage(page + 1)}
            className="px-1.5 py-0.5 rounded border border-gray-200 disabled:opacity-30 hover:border-endeavour transition-colors"
          >
            ›
          </button>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => onPage(totalPages - 1)}
            className="px-1.5 py-0.5 rounded border border-gray-200 disabled:opacity-30 hover:border-endeavour transition-colors"
          >
            »
          </button>
        </div>
      </div>
    </div>
  )
}

const Main = () => {
  const request = useAxios()
  const { data: session } = useSession()
  const sessionUserId = (session?.user as any)?.id ?? 0

  const [states, setStates] = useState({
    mode: 'products',
    isModalOpen: false,
    selectedProduct: null as any | null,
  })

  const [invoiceModal, setInvoiceModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const [viewSale, setViewSale] = useState<any | null>(null)
  const [viewInvoice, setViewInvoice] = useState<any | null>(null)

  // Operations state
  const [operationModal, setOperationModal] = useState(false)
  const [selectedOperation, setSelectedOperation] = useState<any | null>(null)
  const [opPage, setOpPage] = useState(0)
  const [opPageSize, setOpPageSize] = useState(20)

  // Transfer state
  const [transferModal, setTransferModal] = useState(false)
  const [bulkStockModal, setBulkStockModal] = useState(false)
  const [confirmingTransferId, setConfirmingTransferId] = useState<number | null>(null)
  const [transferPage, setTransferPage] = useState(0)
  const [transferPageSize, setTransferPageSize] = useState(20)

  const {
    data: operations,
    total: opTotal,
    isLoading: opLoading,
    refetch: refetchOperations,
  } = useFetchPaginated('operations', OperationsServices.FetchAll() as unknown as IGeneric, opPage, opPageSize)

  const {
    data: transfers,
    total: transferTotal,
    isLoading: transfersLoading,
    refetch: refetchTransfers,
  } = useFetchPaginated('transfers', TransferServices.FetchAll() as unknown as IGeneric, transferPage, transferPageSize)

  const handleDeleteOperation = async (id: number) => {
    try {
      await request(OperationsServices.Delete(id))
      refetchOperations()
    } catch (err) {
      console.error('Delete operation failed:', err)
    }
  }

  const handleConfirmTransfer = async (id: number) => {
    setConfirmingTransferId(id)
    try {
      await request(TransferServices.Confirm(id, { confirmedBy: sessionUserId }) as any)
      refetchTransfers()
      refetchAllStock()
    } catch (err) {
      console.error('Confirm transfer failed:', err)
    } finally {
      setConfirmingTransferId(null)
    }
  }

  const handleCancelTransfer = async (id: number) => {
    try {
      await request(TransferServices.Cancel(id) as any)
      refetchTransfers()
    } catch (err) {
      console.error('Cancel transfer failed:', err)
    }
  }

  const handleDeleteSale = async (id: number) => {
    try {
      await request(SalesServices.Delete(id))
      refetchSales()
    } catch (err) {
      console.error('Delete sale failed:', err)
    }
  }

  // Restock dialog state
  const [restockTarget, setRestockTarget] = useState<{
    productId: number
    stockId: number
    productName: string
    warehouseName: string
    currentQty: number
  } | null>(null)
  const [restockAmount, setRestockAmount] = useState('')
  const [restockMode, setRestockMode] = useState<'add' | 'set'>('add')
  const [restockLog, setRestockLog] = useState<Record<number, { delta: number; at: string }>>({})
  const [isRestocking, setIsRestocking] = useState(false)

  // History modal state
  const [historyTarget, setHistoryTarget] = useState<{
    productId: number
    stockId: number
    productName: string
    warehouseName: string
  } | null>(null)

  const { data: historyRaw, isLoading: historyLoading } = useFetchData(
    historyTarget ? `stock-history-${historyTarget.stockId}` : 'stock-history-none',
    historyTarget
      ? (StocksServices.FetchHistory(historyTarget.productId, historyTarget.stockId) as unknown as IGeneric)
      : (StocksServices.FetchShortages() as unknown as IGeneric),
    !!historyTarget
  )
  const historyRecords = (historyRaw as any[]) ?? []

  const [productPage, setProductPage] = useState(0)
  const [productPageSize, setProductPageSize] = useState(20)
  const [salesPage, setSalesPage] = useState(0)
  const [salesPageSize, setSalesPageSize] = useState(20)

  const {
    data: products,
    total: productTotal,
    isLoading,
    refetch,
  } = useFetchPaginated('products', ProductServices.FetchAll({}), productPage, productPageSize)

  const {
    data: sales,
    total: salesTotal,
    isLoading: salesLoading,
    refetch: refetchSales,
  } = useFetchPaginated('sales', SalesServices.FetchAll() as unknown as IGeneric, salesPage, salesPageSize)

  const [invoicePage, setInvoicePage] = useState(0)
  const [invoicePageSize, setInvoicePageSize] = useState(20)

  const {
    data: invoices,
    total: invoiceTotal,
    isLoading: invoicesLoading,
    refetch: refetchInvoices,
  } = useFetchPaginated('invoices', InvoiceServices.FetchAll() as unknown as IGeneric, invoicePage, invoicePageSize)

  const [stockPage, setStockPage] = useState(0)
  const [stockPageSize, setStockPageSize] = useState(20)

  // Stocks tab: use the global shortages endpoint (only global stock route available)
  const {
    data: stocks,
    total: stockTotal,
    isLoading: stocksLoading,
  } = useFetchPaginated('stock-shortages', StocksServices.FetchShortages() as unknown as IGeneric, stockPage, stockPageSize)

  // All products with stock — used for the Stocks tab (flattened per warehouse)
  const { data: allProductsForStock, refetch: refetchAllStock } = useFetchData(
    'all-products-stock',
    ProductServices.FetchAll({ limit: 1000 }) as unknown as IGeneric
  )

  const stockRows = useMemo(() => {
    const list = (allProductsForStock as any[]) ?? []
    return list.flatMap((p: any) =>
      (p.stock ?? []).map((s: any) => ({
        ...s,
        productId: p.id,
        productName: p.name,
        category: p.category,
        minQuantity: p.minQuantity,
        isShortage: p.isShortage,
      }))
    )
  }, [allProductsForStock])

  const handleRestock = async () => {
    if (!restockTarget || !restockAmount) return
    const qty = Number(restockAmount)
    if (isNaN(qty) || qty === 0) return
    setIsRestocking(true)
    try {
      const payload = restockMode === 'set' ? { quantity: qty } : { quantity: qty }
      const svc =
        restockMode === 'set'
          ? StocksServices.Update(restockTarget.productId, restockTarget.stockId, payload)
          : StocksServices.Restock(restockTarget.productId, restockTarget.stockId, payload)
      await request(svc)
      // Log the restock for the session
      const delta = restockMode === 'set' ? qty - restockTarget.currentQty : qty
      setRestockLog((prev) => ({ ...prev, [restockTarget.stockId]: { delta, at: new Date().toLocaleTimeString() } }))
      setRestockTarget(null)
      setRestockAmount('')
      // Invalidate both: paginated products AND the all-products-stock query
      refetch()
      refetchAllStock()
    } catch (err) {
      console.error('Restock failed:', err)
    } finally {
      setIsRestocking(false)
    }
  }

  // Overview stats for dashboard cards
  const { data: overviewRaw } = useFetchData('inv-overview', StatisticsServices.FetchAll() as unknown as IGeneric)
  const overview = overviewRaw as any

  // Shortage products — products where isShortage = true
  const shortageProducts = useMemo(() => (products as any[]).filter((p: any) => p.isShortage), [products])

  // Pending debt — invoices not yet paid (current page)
  const pendingInvoices = useMemo(() => (invoices as any[]).filter((inv: any) => !inv.isPaid && inv.paymentStatus !== 'paid'), [invoices])

  const pendingDebt = useMemo(() => pendingInvoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount ?? 0), 0), [pendingInvoices])

  const handleMarkAsPaid = async (id: number) => {
    try {
      await request(InvoiceServices.MarkAsPaid(id))
      refetchInvoices()
    } catch (err) {
      console.error('Mark as paid failed:', err)
    }
  }

  const handleMarkAsPending = async (id: number) => {
    try {
      await request(InvoiceServices.MarkAsPending(id))
      refetchInvoices()
    } catch (err) {
      console.error('Mark as pending failed:', err)
    }
  }

  const handleDeleteProduct = async (id: number) => {
    try {
      await request(ProductServices.Delete(id))
      refetch()
    } catch (err) {
      console.error('Delete product failed:', err)
    }
  }

  const fmt = (v: any) => (v != null ? `GHC ${Number(v).toLocaleString()}` : '—')

  // Flatten: one row per unit so each gets its own columns
  const flatRows = useMemo(() => {
    const list = (products as any[]) ?? []
    return list.flatMap((p: any) => {
      if (!p.units?.length) {
        return [{ ...p, _unitId: null, unitName: '—', retailPrice: null, wholesalePrice: null, pricingRule: '—' }]
      }
      return p.units.map((u: any) => ({
        ...p,
        _unitId: u.id,
        unitName: u.unitName,
        retailPrice: u.retailPrice,
        wholesalePrice: u.wholesalePrice,
        pricingRule: u.pricingRule,
      }))
    })
  }, [products])

  const productCols = useMemo(
    () => [
      { field: 'name', headerName: 'Product Name', flex: 1, minWidth: 140 },
      { field: 'category', headerName: 'Category', width: 120 },
      {
        field: 'purchasePrice',
        headerName: 'Cost',
        width: 110,
        valueFormatter: (p: any) => fmt(p.value),
      },
      { field: 'unitName', headerName: 'Unit', width: 130 },
      {
        field: 'retailPrice',
        headerName: 'Retail Price',
        width: 130,
        valueFormatter: (p: any) => fmt(p.value),
      },
      {
        field: 'wholesalePrice',
        headerName: 'Wholesale Price',
        width: 150,
        valueFormatter: (p: any) => fmt(p.value),
      },
      { field: 'pricingRule', headerName: 'Pricing Rule', width: 130 },
      {
        field: 'stock',
        headerName: 'Stock',
        width: 170,
        sortable: false,
        filter: false,
        cellRenderer: (p: any) => {
          const stock: any[] = p.data?.stock ?? []
          return stock.map((s: any) => `${s.warehouseName}: ${Number(s.quantity).toLocaleString()}`).join(' · ') || '—'
        },
      },
      {
        field: 'actions',
        headerName: '',
        width: 100,
        pinned: 'right' as const,
        sortable: false,
        filter: false,
        cellRenderer: ({ data: row }: any) => (
          <div className="flex items-center gap-1 h-full">
            <button
              className="text-xs text-endeavour hover:underline"
              onClick={() => setStates((s) => ({ ...s, selectedProduct: row, isModalOpen: true }))}
            >
              Edit
            </button>
            <span className="text-gray-300">|</span>
            <button className="text-xs text-red-500 hover:underline" onClick={() => handleDeleteProduct(row.id)}>
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  )

  const saleCols = useMemo(
    () => [
      { field: 'id', headerName: 'Sale #', width: 90 },
      {
        field: 'createdAt',
        headerName: 'Date',
        width: 160,
        valueFormatter: (p: any) => (p.value ? new Date(p.value).toLocaleString() : '—'),
      },
      { field: 'warehouseName', headerName: 'Warehouse', width: 140 },
      {
        field: 'paymentType',
        headerName: 'Payment',
        width: 110,
        cellRenderer: ({ value }: any) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              value === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}
          >
            {value}
          </span>
        ),
      },
      {
        field: 'items',
        headerName: 'Items',
        flex: 1,
        sortable: false,
        filter: false,
        valueGetter: (p: any) => {
          const items: any[] = p.data?.items ?? []
          return items.map((i: any) => `${i.productName} (${i.unitName}) × ${i.quantity}`).join(', ') || '—'
        },
      },
      {
        field: 'totalAmount',
        headerName: 'Total',
        width: 130,
        valueFormatter: (p: any) => (p.value != null ? `GHC ${Number(p.value).toLocaleString()}` : '—'),
      },
      {
        field: 'actions',
        headerName: '',
        width: 110,
        pinned: 'right' as const,
        sortable: false,
        filter: false,
        cellRenderer: ({ data: row }: any) => (
          <div className="flex items-center gap-2 h-full">
            <button className="text-xs text-endeavour hover:underline font-medium" onClick={() => setViewSale(row)}>
              View
            </button>
            <span className="text-gray-300">|</span>
            <button className="text-xs text-red-500 hover:underline" onClick={() => handleDeleteSale(row.id)}>
              Delete
            </button>
          </div>
        ),
      },
    ],
    [handleDeleteSale]
  )

  const invoiceCols = useMemo(
    () => [
      { field: 'id', headerName: 'Invoice #', width: 100 },
      {
        field: 'date',
        headerName: 'Date',
        width: 120,
        valueFormatter: (p: any) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
      },
      { field: 'customerName', headerName: 'Customer', flex: 1 },
      { field: 'customerPhone', headerName: 'Phone', width: 130 },
      {
        field: 'paymentType',
        headerName: 'Payment',
        width: 100,
        cellRenderer: ({ value }: any) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              value === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}
          >
            {value}
          </span>
        ),
      },
      {
        field: 'items',
        headerName: 'Items',
        flex: 1,
        sortable: false,
        filter: false,
        valueGetter: (p: any) => {
          const items: any[] = p.data?.items ?? []
          return items.map((i: any) => `${i.productName} (${i.unitName}) × ${i.quantity}`).join(', ') || '—'
        },
      },
      {
        field: 'totalAmount',
        headerName: 'Total',
        width: 120,
        valueFormatter: (p: any) => (p.value != null ? `GHC ${Number(p.value).toLocaleString()}` : '—'),
      },
      {
        field: 'isPaid',
        headerName: 'Status',
        width: 100,
        cellRenderer: ({ data: row }: any) => {
          const paid = row.isPaid || row.paymentStatus === 'paid'
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
              }`}
            >
              {paid ? 'Paid' : 'Pending'}
            </span>
          )
        },
      },
      {
        field: 'actions',
        headerName: '',
        width: 220,
        pinned: 'right' as const,
        sortable: false,
        filter: false,
        cellRenderer: ({ data: row }: any) => {
          const paid = row.isPaid || row.paymentStatus === 'paid'
          return (
            <div className="flex items-center gap-2 h-full">
              <button className="text-xs text-endeavour hover:underline font-medium" onClick={() => setViewInvoice(row)}>
                View
              </button>
              <span className="text-gray-300">|</span>
              <button
                className="text-xs text-amber-600 hover:underline font-medium"
                onClick={() => {
                  setSelectedInvoice(row)
                  setInvoiceModal(true)
                }}
              >
                Edit
              </button>
              <span className="text-gray-300">|</span>
              {paid ? (
                <button className="text-xs text-orange-600 hover:underline" onClick={() => handleMarkAsPending(row.id)}>
                  Mark Pending
                </button>
              ) : (
                <button className="text-xs text-green-600 hover:underline" onClick={() => handleMarkAsPaid(row.id)}>
                  Mark Paid
                </button>
              )}
            </div>
          )
        },
      },
    ],
    [handleMarkAsPaid, handleMarkAsPending]
  )

  const stockCols = useMemo(
    () => [
      { field: 'productName', headerName: 'Product', flex: 1, minWidth: 140 },
      { field: 'category', headerName: 'Category', width: 110 },
      { field: 'warehouseName', headerName: 'Warehouse', width: 130 },
      {
        field: 'quantity',
        headerName: 'Qty',
        width: 80,
        cellStyle: (p: any) => ({
          color: p.value === 0 ? '#dc2626' : p.data?.isShortage ? '#d97706' : '#16a34a',
          fontWeight: 600,
        }),
      },
      {
        field: 'minQuantity',
        headerName: 'Min Qty',
        width: 90,
        valueFormatter: (p: any) => p.value ?? '—',
      },
      {
        field: 'isShortage',
        headerName: 'Status',
        width: 100,
        cellRenderer: ({ value }: any) =>
          value ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Low stock</span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">OK</span>
          ),
      },
      {
        field: 'id',
        headerName: 'Last Restock',
        width: 150,
        sortable: false,
        filter: false,
        cellRenderer: ({ value }: any) => {
          const log = restockLog[value]
          if (!log) return <span className="text-xs text-gray-300">—</span>
          return (
            <span className={`text-xs font-medium ${log.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {log.delta >= 0 ? `+${log.delta}` : log.delta} at {log.at}
            </span>
          )
        },
      },
      {
        field: 'actions',
        headerName: '',
        width: 185,
        pinned: 'right' as const,
        sortable: false,
        filter: false,
        cellRenderer: ({ data: row }: any) => (
          <div className="flex items-center gap-1.5 h-full">
            <button
              className="text-xs text-endeavour hover:underline font-medium"
              onClick={() => {
                setRestockTarget({
                  productId: row.productId,
                  stockId: row.id,
                  productName: row.productName,
                  warehouseName: row.warehouseName,
                  currentQty: row.quantity,
                })
                setRestockAmount('')
                setRestockMode('add')
              }}
            >
              Restock
            </button>
            <span className="text-gray-300">|</span>
            <button className="text-xs text-indigo-500 hover:underline font-medium" onClick={() => setTransferModal(true)}>
              Transfer
            </button>
            <span className="text-gray-300">|</span>
            <button
              className="text-xs text-gray-500 hover:underline"
              onClick={() =>
                setHistoryTarget({
                  productId: row.productId,
                  stockId: row.id,
                  productName: row.productName,
                  warehouseName: row.warehouseName,
                })
              }
            >
              History
            </button>
          </div>
        ),
      },
    ],
    [restockLog]
  )

  const operationCols = useMemo(
    () => [
      { field: 'name', headerName: 'Operation', flex: 1 },
      { field: 'category', headerName: 'Category', width: 130 },
      {
        field: 'amount',
        headerName: 'Amount (₵)',
        width: 130,
        valueFormatter: (p: any) => (p.value != null ? `₵ ${Number(p.value).toLocaleString()}` : '—'),
      },
      {
        field: 'date',
        headerName: 'Date',
        width: 120,
        valueFormatter: (p: any) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
      },
      { field: 'frequency', headerName: 'Frequency', width: 110 },
      { field: 'notes', headerName: 'Notes', flex: 1 },
      {
        field: 'actions',
        headerName: '',
        width: 120,
        pinned: 'right' as const,
        sortable: false,
        filter: false,
        cellRenderer: ({ data: row }: any) => (
          <div className="flex items-center gap-2 h-full">
            <button
              className="text-xs text-endeavour hover:underline"
              onClick={() => {
                setSelectedOperation(row)
                setOperationModal(true)
              }}
            >
              Edit
            </button>
            <span className="text-gray-300">|</span>
            <button className="text-xs text-red-500 hover:underline" onClick={() => handleDeleteOperation(row.id)}>
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  )

  const transferCols = useMemo(
    () => [
      { field: 'id', headerName: 'Transfer #', width: 110 },
      { field: 'fromProductName', headerName: 'Product', flex: 1, minWidth: 130, valueGetter: (p: any) => p.data?.fromProduct?.name ?? p.data?.productName ?? '—' },
      { field: 'fromWarehouse', headerName: 'From', width: 140, valueGetter: (p: any) => p.data?.fromStock?.warehouseName ?? p.data?.fromWarehouseName ?? '—' },
      { field: 'toWarehouse', headerName: 'To', width: 140, valueGetter: (p: any) => p.data?.toStock?.warehouseName ?? p.data?.toWarehouseName ?? '—' },
      { field: 'quantity', headerName: 'Qty', width: 80 },
      {
        field: 'status',
        headerName: 'Status',
        width: 110,
        cellRenderer: ({ value }: any) => {
          const map: Record<string, string> = { pending: 'bg-amber-100 text-amber-700', confirmed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-600' }
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${map[value] ?? 'bg-gray-100 text-gray-500'}`}>
              {value ?? '—'}
            </span>
          )
        },
      },
      { field: 'note', headerName: 'Note', flex: 1, valueFormatter: (p: any) => p.value ?? '—' },
      { field: 'createdAt', headerName: 'Initiated', width: 140, valueFormatter: (p: any) => (p.value ? new Date(p.value).toLocaleString() : '—') },
      { field: 'confirmedAt', headerName: 'Confirmed At', width: 140, valueFormatter: (p: any) => (p.value ? new Date(p.value).toLocaleString() : '—') },
      { field: 'confirmedByName', headerName: 'Confirmed By', width: 130, valueGetter: (p: any) => p.data?.confirmedByUser?.name ?? p.data?.confirmedByName ?? (p.data?.confirmedBy ? `#${p.data.confirmedBy}` : '—') },
      {
        field: 'actions',
        headerName: '',
        width: 140,
        pinned: 'right' as const,
        sortable: false,
        filter: false,
        cellRenderer: ({ data: row }: any) => {
          const isPending = row.status === 'pending'
          if (!isPending) return <span className="text-xs text-gray-300 italic">{row.status}</span>
          const isConfirming = confirmingTransferId === row.id
          return (
            <div className="flex items-center gap-2 h-full">
              <button
                disabled={isConfirming}
                className="text-xs text-green-600 hover:underline font-medium disabled:opacity-50"
                onClick={() => handleConfirmTransfer(row.id)}
              >
                {isConfirming ? 'Confirming...' : 'Confirm'}
              </button>
              <span className="text-gray-300">|</span>
              <button className="text-xs text-red-500 hover:underline" onClick={() => handleCancelTransfer(row.id)}>
                Cancel
              </button>
            </div>
          )
        },
      },
    ],
    [confirmingTransferId]
  )

  return (
    <div className="w-full h-full">
      <SheetTemplate
        open={states.isModalOpen}
        handleOpen={() => {
          UpdateStates(setStates, 'isModalOpen', true)
        }}
        handleClose={() => setStates((s) => ({ ...s, isModalOpen: false, selectedProduct: null }))}
        title={states.selectedProduct ? 'Edit Product' : 'Add Product'}
        contentBodyClassName="flex flex-col"
        contentClassName={'md:min-w-[40rem]'}
        content={
          <CreateProduct
            mode={states.selectedProduct ? 'update' : 'create'}
            productId={states.selectedProduct?.id}
            initialData={states.selectedProduct ?? undefined}
            onSuccess={() => {
              refetch()
              setStates((s) => ({ ...s, isModalOpen: false, selectedProduct: null }))
            }}
          />
        }
      />

      {/* Invoice sheet */}
      <SheetTemplate
        open={invoiceModal}
        handleOpen={() => setInvoiceModal(true)}
        handleClose={() => {
          setInvoiceModal(false)
          setSelectedInvoice(null)
        }}
        title={selectedInvoice ? 'Edit Invoice' : 'Add Invoice'}
        contentBodyClassName="flex flex-col"
        contentClassName="md:min-w-[40rem]"
        content={
          <CreateInvoice
            key={selectedInvoice?.id ?? 'new'}
            mode={selectedInvoice ? 'update' : 'create'}
            invoiceId={selectedInvoice?.id}
            initialData={
              selectedInvoice
                ? {
                    customerName: selectedInvoice.customerName ?? '',
                    customerPhone: selectedInvoice.customerPhone ?? '',
                    date: selectedInvoice.date?.split('T')[0] ?? selectedInvoice.date ?? '',
                    paymentType: selectedInvoice.paymentType ?? 'cash',
                    paymentStatus: selectedInvoice.paymentStatus ?? (selectedInvoice.isPaid ? 'paid' : 'pending'),
                    items: (selectedInvoice.items ?? []).map((i: any) => ({
                      productUnitId: Number(i.productUnitId ?? i.unitId ?? 0),
                      quantity: Number(i.quantity ?? 1),
                      pricingType: (i.pricingType ?? 'retail') as 'retail' | 'wholesale',
                    })),
                  }
                : undefined
            }
            onSuccess={() => {
              refetchInvoices()
              setInvoiceModal(false)
              setSelectedInvoice(null)
            }}
          />
        }
      />

      {/* ── Operation sheet ── */}
      <SheetTemplate
        open={operationModal}
        handleOpen={() => setOperationModal(true)}
        handleClose={() => {
          setOperationModal(false)
          setSelectedOperation(null)
        }}
        title={selectedOperation ? 'Edit Operation' : 'Add Operation'}
        contentBodyClassName="flex flex-col"
        contentClassName="md:min-w-[36rem]"
        content={
          <CreateOperation
            mode={selectedOperation ? 'update' : 'create'}
            operationId={selectedOperation?.id}
            initialData={selectedOperation ?? undefined}
            onSuccess={() => {
              refetchOperations()
              setOperationModal(false)
              setSelectedOperation(null)
            }}
          />
        }
      />

      {/* ── Transfer sheet ── */}
      <SheetTemplate
        open={transferModal}
        handleOpen={() => setTransferModal(true)}
        handleClose={() => setTransferModal(false)}
        title="Initiate Transfer"
        contentBodyClassName="flex flex-col"
        contentClassName="md:min-w-[36rem]"
        content={
          <CreateTransfer
            stockRows={stockRows}
            onSuccess={() => {
              refetchTransfers()
              setTransferModal(false)
            }}
          />
        }
      />

      {/* ── Bulk stock sheet ── */}
      <SheetTemplate
        open={bulkStockModal}
        handleOpen={() => setBulkStockModal(true)}
        handleClose={() => setBulkStockModal(false)}
        title="Add Product to Multiple Warehouses"
        contentBodyClassName="flex flex-col"
        contentClassName="md:min-w-[36rem]"
        content={
          <BulkStock
            onSuccess={() => {
              refetch()
              refetchAllStock()
              setBulkStockModal(false)
            }}
          />
        }
      />

      {/* ── Sale detail modal ── */}
      {viewSale && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-[540px] max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
              <div>
                <h2 className="bytewave-heading text-base">Sale #{viewSale.id}</h2>
                <p className="bytewave-paragraph text-xs text-gray-400">
                  {viewSale.createdAt ? new Date(viewSale.createdAt).toLocaleString() : '—'}
                </p>
              </div>
              <button onClick={() => setViewSale(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
                ✕
              </button>
            </div>

            {/* Meta */}
            <div className="px-5 py-3 grid grid-cols-2 gap-3 border-b border-gray-100">
              <div>
                <p className="bytewave-paragraph text-xs text-gray-400">Warehouse</p>
                <p className="bytewave-paragraph text-sm text-stone-700 font-medium">{viewSale.warehouseName ?? '—'}</p>
              </div>
              <div>
                <p className="bytewave-paragraph text-xs text-gray-400">Payment</p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    viewSale.paymentType === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {viewSale.paymentType}
                </span>
              </div>
            </div>

            {/* Items table */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-[1fr_4rem_6rem_6rem] gap-2 px-5 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
                <span>Product</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Subtotal</span>
              </div>
              {(viewSale.items ?? []).map((item: any, i: number) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_4rem_6rem_6rem] gap-2 px-5 py-2.5 border-b border-gray-50 last:border-0 items-center"
                >
                  <div>
                    <p className="bytewave-paragraph text-sm text-stone-700">{item.productName}</p>
                    <p className="bytewave-paragraph text-xs text-gray-400">{item.unitName}</p>
                  </div>
                  <span className="bytewave-paragraph text-sm text-center text-stone-700">{item.quantity}</span>
                  <span className="bytewave-paragraph text-sm text-right text-stone-700">
                    {item.unitPrice != null ? `₵${Number(item.unitPrice).toLocaleString()}` : '—'}
                  </span>
                  <span className="bytewave-paragraph text-sm font-semibold text-right text-stone-800">
                    {item.subtotal != null ? `₵${Number(item.subtotal).toLocaleString()}` : '—'}
                  </span>
                </div>
              ))}
            </div>

            {/* Total footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <span className="bytewave-paragraph text-sm text-gray-500">
                {(viewSale.items ?? []).length} item{(viewSale.items ?? []).length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-3">
                <span className="bytewave-paragraph text-sm text-gray-500">Total</span>
                <span className="bytewave-heading text-xl text-stone-800">GHC {Number(viewSale.totalAmount ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice detail modal ── */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-[560px] max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
              <div>
                <h2 className="bytewave-heading text-base">Invoice #{viewInvoice.id}</h2>
                <p className="bytewave-paragraph text-xs text-gray-400">
                  {viewInvoice.date ? new Date(viewInvoice.date).toLocaleDateString() : '—'}
                </p>
              </div>
              <button onClick={() => setViewInvoice(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
                ✕
              </button>
            </div>

            {/* Customer + payment meta */}
            <div className="px-5 py-3 grid grid-cols-3 gap-3 border-b border-gray-100">
              <div>
                <p className="bytewave-paragraph text-xs text-gray-400">Customer</p>
                <p className="bytewave-paragraph text-sm text-stone-700 font-medium">{viewInvoice.customerName ?? '—'}</p>
              </div>
              <div>
                <p className="bytewave-paragraph text-xs text-gray-400">Phone</p>
                <p className="bytewave-paragraph text-sm text-stone-700">{viewInvoice.customerPhone ?? '—'}</p>
              </div>
              <div>
                <p className="bytewave-paragraph text-xs text-gray-400">Payment</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      viewInvoice.paymentType === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {viewInvoice.paymentType}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      viewInvoice.isPaid || viewInvoice.paymentStatus === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {viewInvoice.isPaid || viewInvoice.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Items table */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-[1fr_4rem_5rem_6rem_5rem] gap-2 px-5 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
                <span>Product</span>
                <span className="text-center">Qty</span>
                <span className="text-center">Type</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Subtotal</span>
              </div>
              {(viewInvoice.items ?? []).map((item: any, i: number) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_4rem_5rem_6rem_5rem] gap-2 px-5 py-2.5 border-b border-gray-50 last:border-0 items-center"
                >
                  <div>
                    <p className="bytewave-paragraph text-sm text-stone-700">{item.productName}</p>
                    <p className="bytewave-paragraph text-xs text-gray-400">{item.unitName}</p>
                  </div>
                  <span className="bytewave-paragraph text-sm text-center text-stone-700">{item.quantity}</span>
                  <span
                    className={`text-[10px] text-center font-medium px-1.5 py-0.5 rounded w-fit mx-auto ${
                      item.pricingType === 'wholesale' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item.pricingType ?? 'retail'}
                  </span>
                  <span className="bytewave-paragraph text-sm text-right text-stone-700">
                    {item.unitPrice != null ? `₵${Number(item.unitPrice).toLocaleString()}` : '—'}
                  </span>
                  <span className="bytewave-paragraph text-sm font-semibold text-right text-stone-800">
                    {item.subtotal != null ? `₵${Number(item.subtotal).toLocaleString()}` : '—'}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <span className="bytewave-paragraph text-sm text-gray-500">
                {(viewInvoice.items ?? []).length} item{(viewInvoice.items ?? []).length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-3">
                <span className="bytewave-paragraph text-sm text-gray-500">Total</span>
                <span className="bytewave-heading text-xl text-stone-800">GHC {Number(viewInvoice.totalAmount ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Restock dialog ── */}
      {restockTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 w-full sm:max-w-[360px] flex flex-col gap-4">
            <div className="flex justify-center -mt-3 mb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div>
              <h2 className="bytewave-heading text-base">{restockTarget.productName}</h2>
              <p className="bytewave-paragraph text-xs text-gray-400">
                {restockTarget.warehouseName} · Current qty: {restockTarget.currentQty}
              </p>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(['add', 'set'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setRestockMode(m)}
                  className={`flex-1 py-1.5 bytewave-paragraph text-xs font-medium capitalize transition-colors ${
                    restockMode === m ? 'bg-endeavour text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {m === 'add' ? '+ Add qty' : 'Set qty'}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <label className="bytewave-paragraph text-xs text-gray-500">
                {restockMode === 'add' ? 'Quantity to add' : 'New quantity'}
              </label>
              <input
                type="number"
                value={restockAmount}
                onChange={(e) => setRestockAmount(e.target.value)}
                placeholder={restockMode === 'add' ? 'e.g. 50' : `e.g. ${restockTarget.currentQty}`}
                className="border border-gray-200 rounded-lg px-3 py-2 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour"
                autoFocus
              />
              {restockMode === 'add' && restockAmount && (
                <p className="bytewave-paragraph text-xs text-gray-400">
                  New total: {restockTarget.currentQty + (Number(restockAmount) || 0)}
                </p>
              )}
            </div>

            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setRestockTarget(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 bytewave-paragraph text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!restockAmount || isRestocking}
                onClick={handleRestock}
                className="flex-1 py-2 rounded-xl bg-endeavour text-white bytewave-paragraph text-sm font-semibold hover:bg-veniceBlue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRestocking ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stock History modal ── */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-[520px] max-h-[90vh] sm:max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
              <div>
                <h2 className="bytewave-heading text-base">{historyTarget.productName}</h2>
                <p className="bytewave-paragraph text-xs text-gray-400">{historyTarget.warehouseName} · Restock History</p>
              </div>
              <button onClick={() => setHistoryTarget(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none mt-0.5">
                ✕
              </button>
            </div>

            {/* History list */}
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="flex items-center justify-center h-32 bytewave-paragraph text-xs text-gray-400">Loading history...</div>
              ) : historyRecords.length === 0 ? (
                <div className="flex items-center justify-center h-32 bytewave-paragraph text-xs text-gray-400">No restock history yet</div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_5rem_5rem_5rem_5rem] gap-2 px-5 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
                    <span>Date</span>
                    <span className="text-right">Before</span>
                    <span className="text-right">Change</span>
                    <span className="text-right">After</span>
                    <span className="text-right">Type</span>
                  </div>
                  {historyRecords.map((h: any, i: number) => {
                    // Log first record to help identify exact field names from backend
                    if (i === 0) console.log('[StockHistory] record shape:', h)

                    // Resolve "before" — quantity BEFORE the change
                    const before =
                      h.previousQuantity ??
                      h.prevQuantity ??
                      h.oldQuantity ??
                      h.before ??
                      h.quantityBefore ??
                      h.beforeQuantity ??
                      h.old_quantity ??
                      h.prev_quantity ??
                      null

                    // Resolve "after" — quantity AFTER the change (new total)
                    const after =
                      h.newQuantity ??
                      h.currentQuantity ??
                      h.afterQuantity ??
                      h.after ??
                      h.quantityAfter ??
                      h.new_quantity ??
                      h.current_quantity ??
                      null

                    // Resolve "change" — the delta added/removed
                    const change = h.change ?? h.delta ?? h.quantity ?? h.quantityChange ?? h.amount ?? h.restockQuantity ?? null

                    // Derive what we can
                    const delta =
                      change !== null ? Number(change) : before !== null && after !== null ? Number(after) - Number(before) : null

                    const displayBefore = before !== null ? before : after !== null && delta !== null ? Number(after) - delta : '—'
                    const displayAfter = after !== null ? after : before !== null && delta !== null ? Number(before) + delta : '—'
                    const displayDelta = delta !== null ? delta : '—'

                    const dateVal = h.createdAt ?? h.create_time ?? h.date ?? h.timestamp ?? h.updatedAt
                    const typeVal = h.type ?? h.operation ?? h.action ?? 'restock'

                    return (
                      <div
                        key={h.id ?? i}
                        className="grid grid-cols-[1fr_5rem_5rem_5rem_5rem] gap-2 px-5 py-2.5 border-b border-gray-50 last:border-0 text-sm items-center"
                      >
                        <span className="bytewave-paragraph text-xs text-gray-500">
                          {dateVal ? new Date(dateVal).toLocaleString() : '—'}
                        </span>
                        <span className="bytewave-paragraph text-right text-stone-600">{displayBefore}</span>
                        <span
                          className={`bytewave-paragraph text-right font-semibold ${
                            typeof displayDelta === 'number' && displayDelta >= 0 ? 'text-green-600' : 'text-red-500'
                          }`}
                        >
                          {typeof displayDelta === 'number' ? (displayDelta >= 0 ? `+${displayDelta}` : displayDelta) : '—'}
                        </span>
                        <span className="bytewave-paragraph text-right font-semibold text-stone-800">{displayAfter}</span>
                        <span
                          className={`text-[10px] text-right font-medium ${
                            String(typeVal).includes('restock') ? 'text-green-600' : 'text-blue-600'
                          }`}
                        >
                          {typeVal}
                        </span>
                      </div>
                    )
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
              <p className="bytewave-paragraph text-xs text-gray-400">
                {historyRecords.length} record{historyRecords.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setHistoryTarget(null)}
                className="px-4 py-1.5 rounded-lg border border-gray-200 bytewave-paragraph text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="bytewave-heading">{'Inventory'}</h1>
          <p className="bytewave-paragraph">{'Manage your stock, units, and categories'}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <ButtonTemplate
            classname="px-3 py-2 border border-endeavour text-white rounded-md text-xs"
            isText
            text={'Bulk Add Stock'}
            handleClick={() => setBulkStockModal(true)}
          />
          <ButtonTemplate
            classname="px-3 py-2 border border-endeavour text-white rounded-md text-xs"
            isText
            text={'New Transfer'}
            handleClick={() => setTransferModal(true)}
          />
          <ButtonTemplate
            classname="px-3 py-2 border border-endeavour text-white rounded-md text-xs"
            isText
            text={'Add Operation'}
            handleClick={() => {
              setSelectedOperation(null)
              setOperationModal(true)
            }}
          />
          <ButtonTemplate
            classname="px-3 py-2 border border-endeavour text-white rounded-md text-xs"
            isText
            text={'Add Invoice'}
            handleClick={() => {
              setSelectedInvoice(null)
              setInvoiceModal(true)
            }}
          />
          <ButtonTemplate
            classname="px-3 py-2 bg-endeavour text-white rounded-md text-xs"
            isText
            text={'Add Product'}
            handleClick={() => {
              UpdateStates(setStates, 'isModalOpen', true)
            }}
          />
        </div>
      </div>

      {/* ── Dashboard summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {/* Total Products */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="bytewave-paragraph text-xs text-gray-500">Total Products</p>
            <div className="p-1.5 rounded-lg bg-endeavour">
              <Package className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <p className="bytewave-heading text-xl text-stone-800">{productTotal}</p>
          <p className="bytewave-paragraph text-xs text-gray-400">{overview?.inventory?.totalStock ?? 0} units in stock</p>
        </div>

        {/* Low Stock / Shortages */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="bytewave-paragraph text-xs text-gray-500">Low Stock</p>
            <div className={`p-1.5 rounded-lg ${shortageProducts.length > 0 ? 'bg-red-500' : 'bg-green-500'}`}>
              <AlertTriangle className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <p className="bytewave-heading text-xl text-stone-800">{shortageProducts.length}</p>
          <p className="bytewave-paragraph text-xs text-gray-400">Products below minimum qty</p>
        </div>

        {/* Shortages count */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="bytewave-paragraph text-xs text-gray-500">Shortages</p>
            <div className={`p-1.5 rounded-lg ${stockTotal > 0 ? 'bg-red-500' : 'bg-purple-500'}`}>
              <Boxes className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <p className="bytewave-heading text-xl text-stone-800">{stockTotal}</p>
          <p className="bytewave-paragraph text-xs text-gray-400">Products needing restock</p>
        </div>

        {/* Invoices — total + pending debt inline */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="bytewave-paragraph text-xs text-gray-500">Invoices</p>
            <div className={`p-1.5 rounded-lg ${pendingInvoices.length > 0 ? 'bg-orange-500' : 'bg-amber-500'}`}>
              <FileText className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <p className="bytewave-heading text-xl text-stone-800">{invoiceTotal}</p>
          <div className="flex items-center justify-between">
            <p className="bytewave-paragraph text-xs text-gray-400">Total created</p>
            {pendingInvoices.length > 0 && (
              <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                {pendingInvoices.length} pending · GHC {Number(pendingDebt).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Total Sales */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="bytewave-paragraph text-xs text-gray-500">Sales</p>
            <div className="p-1.5 rounded-lg bg-green-500">
              <ShoppingCart className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <p className="bytewave-heading text-xl text-stone-800">{overview?.sales?.total ?? salesTotal}</p>
          <p className="bytewave-paragraph text-xs text-gray-400">Total transactions</p>
        </div>
      </div>

      <section className="w-full">
        <TabTemplate
          items={InventoryTabs.map((tab) => ({
            ...tab,
            content:
              tab.key === 'Transactions' ? (
                <div className="flex flex-col">
                  <div className="overflow-x-auto">
                    <DatagridTemplate
                      columns={saleCols}
                      data={sales}
                      loadingIndicator={salesLoading}
                      enablePagination={false}
                      paginationPageSize={salesPageSize}
                      selectionType="singleRow"
                    />
                  </div>
                  <Pagination
                    page={salesPage}
                    pageSize={salesPageSize}
                    total={salesTotal}
                    onPage={setSalesPage}
                    onPageSize={setSalesPageSize}
                  />
                </div>
              ) : tab.key === 'Invoices' ? (
                <div className="flex flex-col">
                  <div className="overflow-x-auto">
                    <DatagridTemplate
                      columns={invoiceCols}
                      data={invoices}
                      loadingIndicator={invoicesLoading}
                      enablePagination={false}
                      paginationPageSize={invoicePageSize}
                      selectionType="singleRow"
                    />
                  </div>
                  <Pagination
                    page={invoicePage}
                    pageSize={invoicePageSize}
                    total={invoiceTotal}
                    onPage={setInvoicePage}
                    onPageSize={setInvoicePageSize}
                  />
                </div>
              ) : tab.key === 'Operations' ? (
                <div className="flex flex-col">
                  <div className="overflow-x-auto">
                    <DatagridTemplate
                      columns={operationCols}
                      data={operations}
                      loadingIndicator={opLoading}
                      enablePagination={false}
                      paginationPageSize={opPageSize}
                      selectionType="singleRow"
                    />
                  </div>
                  <Pagination page={opPage} pageSize={opPageSize} total={opTotal} onPage={setOpPage} onPageSize={setOpPageSize} />
                </div>
              ) : tab.key === 'Stocks' ? (
                <div className="flex flex-col">
                  <div className="overflow-x-auto">
                    <DatagridTemplate
                      columns={stockCols}
                      data={stockRows}
                      loadingIndicator={isLoading}
                      enablePagination
                      paginationPageSize={20}
                      paginationPageSizeSelector={[10, 20, 50, 100]}
                      selectionType="singleRow"
                    />
                  </div>
                </div>
              ) : tab.key === 'Transfers' ? (
                <div className="flex flex-col">
                  {/* Transfers header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4 text-endeavour" />
                      <p className="bytewave-paragraph text-sm text-stone-700 font-medium">Stock Transfers</p>
                    </div>
                    <button
                      onClick={() => setTransferModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-endeavour text-white rounded-lg text-xs font-semibold hover:bg-veniceBlue transition-colors"
                    >
                      <ArrowLeftRight className="h-3 w-3" />
                      New Transfer
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <DatagridTemplate
                      columns={transferCols}
                      data={transfers}
                      loadingIndicator={transfersLoading}
                      enablePagination={false}
                      paginationPageSize={transferPageSize}
                      selectionType="singleRow"
                    />
                  </div>
                  <Pagination
                    page={transferPage}
                    pageSize={transferPageSize}
                    total={transferTotal}
                    onPage={setTransferPage}
                    onPageSize={setTransferPageSize}
                  />
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="overflow-x-auto">
                    <DatagridTemplate
                      columns={productCols}
                      data={flatRows}
                      loadingIndicator={isLoading}
                      enablePagination={false}
                      paginationPageSize={productPageSize}
                      selectionType="singleRow"
                    />
                  </div>
                  <Pagination
                    page={productPage}
                    pageSize={productPageSize}
                    total={productTotal}
                    onPage={setProductPage}
                    onPageSize={setProductPageSize}
                  />
                </div>
              ),
          }))}
          className={'w-full'}
        />
      </section>
    </div>
  )
}

export default Main
