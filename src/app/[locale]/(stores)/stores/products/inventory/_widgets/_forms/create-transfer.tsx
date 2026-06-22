'use client'

import React, { useState, useMemo } from 'react'
import { useAxios } from '@/hooks/use-axios'
import { TransferServices } from '../../_logics/services'
import ButtonTemplate from '@/components/templates/button'

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

  const fromStock = useMemo(() => stockRows.find((s) => s.id === fromStockId), [stockRows, fromStockId])
  const maxQty = fromStock?.quantity ?? 0

  const toOptions = useMemo(() => stockRows.filter((s) => s.id !== fromStockId), [stockRows, fromStockId])

  const fmtStock = (s: any) => `${s.productName} @ ${s.warehouseName} (qty: ${s.quantity})`

  const handleSubmit = async () => {
    if (!fromStockId || !toStockId) {
      setError('Select both source and destination')
      return
    }
    const qty = Number(quantity)
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
    <div className="flex flex-col gap-5 p-4">
      {/* From */}
      <div className="flex flex-col gap-1.5">
        <label className="bytewave-paragraph text-xs text-gray-500 font-medium">From (Source)</label>
        <select
          value={fromStockId}
          onChange={(e) => {
            setFromStockId(e.target.value === '' ? '' : Number(e.target.value))
            setToStockId('')
            setQuantity('')
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour"
        >
          <option value="">Select source stock...</option>
          {stockRows.map((s) => (
            <option key={s.id} value={s.id}>
              {fmtStock(s)}
            </option>
          ))}
        </select>
        {fromStock && (
          <p className="text-[11px] text-gray-400 pl-1">
            Available: <span className="font-semibold text-stone-600">{fromStock.quantity}</span> units
          </p>
        )}
      </div>

      {/* To */}
      <div className="flex flex-col gap-1.5">
        <label className="bytewave-paragraph text-xs text-gray-500 font-medium">To (Destination)</label>
        <select
          value={toStockId}
          onChange={(e) => setToStockId(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={!fromStockId}
          className="border border-gray-200 rounded-lg px-3 py-2 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Select destination stock...</option>
          {toOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {fmtStock(s)}
            </option>
          ))}
        </select>
      </div>

      {/* Quantity */}
      <div className="flex flex-col gap-1.5">
        <label className="bytewave-paragraph text-xs text-gray-500 font-medium">Quantity</label>
        <input
          type="number"
          min={1}
          max={maxQty}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={fromStock ? `1 – ${maxQty}` : 'Select source first'}
          disabled={!fromStockId}
          className="border border-gray-200 rounded-lg px-3 py-2 bytewave-paragraph text-sm focus:outline-none focus:ring-1 focus:ring-endeavour disabled:opacity-50 disabled:cursor-not-allowed"
        />
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

      {error && <p className="text-xs text-red-500">{error}</p>}

      <ButtonTemplate
        classname="w-full py-2.5 bg-endeavour text-white rounded-xl bytewave-paragraph text-sm font-semibold hover:bg-veniceBlue disabled:opacity-50 transition-colors"
        isText
        text={loading ? 'Initiating...' : 'Initiate Transfer'}
        handleClick={handleSubmit}
      />
    </div>
  )
}
