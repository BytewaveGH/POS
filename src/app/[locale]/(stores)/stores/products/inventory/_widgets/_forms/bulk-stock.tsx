'use client'

import React, { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useFetchData } from '@/hooks/use-fetch'
import { useAxios } from '@/hooks/use-axios'
import { ProductServices, StocksServices } from '../../_logics/services'
import { WarehouseServices } from '../../../categories/_logics/services'
import { IGeneric } from '@/types/interfaces'
import ButtonTemplate from '@/components/templates/button'
import SearchableSelect from './searchable-select'

interface BulkStockProps {
  onSuccess: () => void
}

interface StockRow {
  warehouseId: number
  quantity: number
}

export default function BulkStock({ onSuccess }: BulkStockProps) {
  const request = useAxios()
  const [productId, setProductId] = useState<number | ''>('')
  const [rows, setRows] = useState<StockRow[]>([{ warehouseId: 0, quantity: 0 }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: productsRaw } = useFetchData('bulk-products', ProductServices.FetchAll({ limit: 1000 }) as unknown as IGeneric)
  const { data: warehousesRaw } = useFetchData('bulk-warehouses', WarehouseServices.FetchAll() as unknown as IGeneric)

  const products = (productsRaw as any[]) ?? []
  const warehouses = (warehousesRaw as any[]) ?? []

  const productOptions = useMemo(
    () => products.map((p: any) => ({ value: p.id, label: p.name, sublabel: p.category || undefined })),
    [products]
  )

  const addRow = () => setRows((prev) => [...prev, { warehouseId: 0, quantity: 0 }])

  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i))

  const updateRow = (i: number, field: keyof StockRow, value: number) =>
    setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))

  // Warehouse options per row exclude warehouses already picked in other rows,
  // so duplicates simply can't be selected instead of failing at submit time.
  const warehouseOptionsFor = (rowIndex: number) => {
    const usedElsewhere = new Set(rows.filter((_, idx) => idx !== rowIndex).map((r) => r.warehouseId))
    return warehouses.filter((w: any) => !usedElsewhere.has(w.id)).map((w: any) => ({ value: w.id, label: w.name }))
  }

  const handleSubmit = async () => {
    if (!productId) {
      setError('Select a product')
      return
    }
    const valid = rows.filter((r) => r.warehouseId > 0 && r.quantity > 0)
    if (!valid.length) {
      setError('Add at least one warehouse with a quantity greater than 0')
      return
    }
    const ids = valid.map((r) => r.warehouseId)
    if (new Set(ids).size !== ids.length) {
      setError('Each warehouse can only appear once')
      return
    }
    setError('')
    setLoading(true)
    try {
      await request(StocksServices.BulkCreate(Number(productId), valid) as any)
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to add stock')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        {/* Product selector */}
        <div className="flex flex-col gap-1.5">
          <label className="bytewave-paragraph text-xs text-gray-500 font-medium">Product</label>
          <SearchableSelect
            value={productId}
            onChange={(v) => setProductId(Number(v))}
            options={productOptions}
            placeholder="Select product..."
            searchPlaceholder="Search products..."
            emptyMessage="No products found"
          />
        </div>

        {/* Warehouse rows */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="bytewave-paragraph text-xs text-gray-500 font-medium">Warehouse Locations</p>
            <button onClick={addRow} className="flex items-center gap-1 text-xs text-endeavour hover:underline font-medium py-1">
              <Plus className="h-3.5 w-3.5" />
              Add Row
            </button>
          </div>

          <div className="hidden sm:grid grid-cols-[1fr_6rem_2rem] gap-2 text-xs text-gray-400 font-medium px-1">
            <span>Warehouse</span>
            <span>Quantity</span>
            <span />
          </div>

          {rows.map((row, i) => (
            <div
              key={i}
              className="flex flex-col sm:grid sm:grid-cols-[1fr_6rem_2rem] gap-2 sm:items-center p-3 sm:p-0 rounded-xl bg-gray-50 sm:bg-transparent"
            >
              <SearchableSelect
                value={row.warehouseId || ''}
                onChange={(v) => updateRow(i, 'warehouseId', Number(v))}
                options={warehouseOptionsFor(i)}
                placeholder="Select warehouse..."
                searchPlaceholder="Search warehouses..."
                emptyMessage="No more warehouses available"
              />
              <div className="flex items-center gap-2 sm:contents">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={row.quantity || ''}
                  onChange={(e) => updateRow(i, 'quantity', Number(e.target.value))}
                  placeholder="Qty"
                  className="flex-1 sm:flex-none border border-gray-200 rounded-lg px-3 py-2.5 sm:py-2 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour"
                />
                <button
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  className="text-gray-300 hover:text-red-500 disabled:opacity-30 transition-colors p-2 -m-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pinned footer */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 flex flex-col gap-2">
        {error && <p className="text-xs text-red-500">{error}</p>}
        <ButtonTemplate
          classname="w-full py-2.5 bg-endeavour text-white rounded-xl bytewave-paragraph text-sm font-semibold hover:bg-veniceBlue disabled:opacity-50 transition-colors"
          isText
          isDisabled={loading}
          text={loading ? 'Saving...' : 'Add to Warehouses'}
          handleClick={handleSubmit}
        />
      </div>
    </div>
  )
}
