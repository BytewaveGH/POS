'use client'

import React, { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useFetchData } from '@/hooks/use-fetch'
import { useAxios } from '@/hooks/use-axios'
import { ProductServices, StocksServices } from '../../_logics/services'
import { WarehouseServices } from '../../../categories/_logics/services'
import { IGeneric } from '@/types/interfaces'
import ButtonTemplate from '@/components/templates/button'

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

  const addRow = () => setRows((prev) => [...prev, { warehouseId: 0, quantity: 0 }])

  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i))

  const updateRow = (i: number, field: keyof StockRow, value: number) =>
    setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))

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
    <div className="flex flex-col gap-5 p-4">
      {/* Product selector */}
      <div className="flex flex-col gap-1.5">
        <label className="bytewave-paragraph text-xs text-gray-500 font-medium">Product</label>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value === '' ? '' : Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour"
        >
          <option value="">Select product...</option>
          {products.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Warehouse rows */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="bytewave-paragraph text-xs text-gray-500 font-medium">Warehouse Locations</p>
          <button onClick={addRow} className="flex items-center gap-1 text-xs text-endeavour hover:underline font-medium">
            <Plus className="h-3.5 w-3.5" />
            Add Row
          </button>
        </div>

        <div className="grid grid-cols-[1fr_5rem_2rem] gap-2 text-xs text-gray-400 font-medium px-1">
          <span>Warehouse</span>
          <span>Quantity</span>
          <span />
        </div>

        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_5rem_2rem] gap-2 items-center">
            <select
              value={row.warehouseId || ''}
              onChange={(e) => updateRow(i, 'warehouseId', Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour"
            >
              <option value="">Select...</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={row.quantity || ''}
              onChange={(e) => updateRow(i, 'quantity', Number(e.target.value))}
              placeholder="Qty"
              className="border border-gray-200 rounded-lg px-2 py-1.5 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour"
            />
            <button
              onClick={() => removeRow(i)}
              disabled={rows.length === 1}
              className="text-gray-300 hover:text-red-500 disabled:opacity-30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <ButtonTemplate
        classname="w-full py-2.5 bg-endeavour text-white rounded-xl bytewave-paragraph text-sm font-semibold hover:bg-veniceBlue disabled:opacity-50 transition-colors"
        isText
        text={loading ? 'Saving...' : 'Add to Warehouses'}
        handleClick={handleSubmit}
      />
    </div>
  )
}
