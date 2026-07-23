'use client'

import React, { useState, useMemo } from 'react'
import { ArrowDown, Minus, Plus } from 'lucide-react'
import { useAxios } from '@/hooks/use-axios'
import { TransferServices } from '../../_logics/services'
import ButtonTemplate from '@/components/templates/button'
import SearchableSelect from './searchable-select'

interface CreateTransferProps {
  stockRows: any[]
  onSuccess: () => void
}

export default function CreateTransfer({ stockRows, onSuccess }: CreateTransferProps) {
  const request = useAxios()
  const [fromStockId, setFromStockId] = useState<number | ''>('')
  const [toStockId, setToStockId] = useState<number | ''>('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Only stock with quantity to give makes sense as a source
  const fromOptions = useMemo(() => stockRows.filter((s) => s.quantity > 0), [stockRows])

  const fromStock = useMemo(() => stockRows.find((s) => s.id === fromStockId), [stockRows, fromStockId])
  const maxQty = fromStock?.quantity ?? 0

  const toOptions = useMemo(() => stockRows.filter((s) => s.id !== fromStockId), [stockRows, fromStockId])

  const toStockOption = (s: any) => ({
    value: s.id,
    label: s.productName,
    sublabel: `${s.warehouseName} · qty: ${s.quantity}`,
  })

  const fromSelectOptions = useMemo(() => fromOptions.map(toStockOption), [fromOptions])
  const toSelectOptions = useMemo(() => toOptions.map(toStockOption), [toOptions])

  const qty = Number(quantity) || 0

  const adjustQty = (delta: number) => {
    const next = Math.min(Math.max(qty + delta, 1), maxQty || 1)
    setQuantity(String(next))
  }

  const handleSubmit = async () => {
    if (!fromStockId || !toStockId) {
      setError('Select both source and destination')
      return
    }
    if (!qty || qty <= 0) {
      setError('Enter a valid quantity greater than 0')
      return
    }
    if (qty > maxQty) {
      setError(`Cannot transfer more than available stock (${maxQty})`)
      return
    }
    setError('')
    setLoading(true)
    try {
      await request(
        TransferServices.Create({
          fromStockId: Number(fromStockId),
          toStockId: Number(toStockId),
          quantity: qty,
          ...(note.trim() ? { note: note.trim() } : {}),
        }) as any
      )
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to initiate transfer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {/* From */}
        <div className="flex flex-col gap-1.5">
          <label className="bytewave-paragraph text-xs text-gray-500 font-medium">From (Source)</label>
          <SearchableSelect
            value={fromStockId}
            onChange={(v) => {
              setFromStockId(Number(v))
              setToStockId('')
              setQuantity('')
            }}
            options={fromSelectOptions}
            placeholder="Select source stock..."
            searchPlaceholder="Search product or warehouse..."
            emptyMessage="No stock available to transfer from"
          />
          {fromStock && (
            <p className="text-[11px] text-gray-400 pl-1">
              Available: <span className="font-semibold text-stone-600">{fromStock.quantity}</span> units
            </p>
          )}
        </div>

        {/* Direction indicator */}
        <div className="flex justify-center -my-1">
          <div className="p-1.5 rounded-full bg-gray-100">
            <ArrowDown className="h-3.5 w-3.5 text-gray-400" />
          </div>
        </div>

        {/* To */}
        <div className="flex flex-col gap-1.5">
          <label className="bytewave-paragraph text-xs text-gray-500 font-medium">To (Destination)</label>
          <SearchableSelect
            value={toStockId}
            onChange={(v) => setToStockId(Number(v))}
            options={toSelectOptions}
            placeholder={fromStockId ? 'Select destination stock...' : 'Select source first'}
            searchPlaceholder="Search product or warehouse..."
            emptyMessage="No destination available"
            disabled={!fromStockId}
          />
        </div>

        {/* Quantity */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="bytewave-paragraph text-xs text-gray-500 font-medium">Quantity</label>
            {fromStockId && (
              <button
                type="button"
                onClick={() => setQuantity(String(maxQty))}
                className="text-xs text-endeavour hover:underline font-medium"
              >
                Use max ({maxQty})
              </button>
            )}
          </div>
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => adjustQty(-1)}
              disabled={!fromStockId || qty <= 1}
              className="w-11 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex-shrink-0"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={maxQty}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={fromStock ? `1 – ${maxQty}` : 'Select source first'}
              disabled={!fromStockId}
              className="flex-1 min-w-0 text-center border border-gray-200 rounded-lg px-3 py-2.5 sm:py-2 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => adjustQty(1)}
              disabled={!fromStockId || qty >= maxQty}
              className="w-11 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Note */}
        <div className="flex flex-col gap-1.5">
          <label className="bytewave-paragraph text-xs text-gray-500 font-medium">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Moving stock from main store to branch"
            rows={2}
            className="border border-gray-200 rounded-lg px-3 py-2 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour resize-none"
          />
        </div>
      </div>

      {/* Pinned footer */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 flex flex-col gap-2">
        {error && <p className="text-xs text-red-500">{error}</p>}
        <ButtonTemplate
          classname="w-full py-2.5 bg-endeavour text-white rounded-xl bytewave-paragraph text-sm font-semibold hover:bg-veniceBlue disabled:opacity-50 transition-colors"
          isText
          isDisabled={loading}
          text={loading ? 'Initiating...' : 'Initiate Transfer'}
          handleClick={handleSubmit}
        />
      </div>
    </div>
  )
}
