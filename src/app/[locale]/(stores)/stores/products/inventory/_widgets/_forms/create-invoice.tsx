'use client'

import * as z from 'zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@/components/ui/form'
import InputsTemplate from '@/components/templates/inputs'
import ButtonTemplate from '@/components/templates/button'
import { SelectTemplate } from '@/components/templates/select-template'
import { Plus, Minus } from 'lucide-react'
import { useAxios } from '@/hooks/use-axios'
import { useFetchData } from '@/hooks/use-fetch'
import { ProductServices, InvoiceServices } from '../../_logics/services'
import { IGeneric } from '@/types/interfaces'

const invoiceSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(1, 'Phone is required'),
  date: z.string().min(1, 'Date is required'),
  paymentType: z.enum(['cash', 'momo']),
  paymentStatus: z.enum(['paid', 'pending']),
  items: z
    .array(
      z.object({
        productUnitId: z.coerce.number().min(1, 'Product unit is required'),
        quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
        pricingType: z.enum(['retail', 'wholesale']),
      })
    )
    .min(1, 'At least one item is required'),
})

type InvoiceForm = z.infer<typeof invoiceSchema>

interface CreateInvoiceProps {
  mode?: 'create' | 'update'
  invoiceId?: number
  initialData?: Partial<InvoiceForm>
  onSuccess?: () => void
}

const paymentTypeOptions = [
  { text: 'Cash', value: 'cash' },
  { text: 'MoMo', value: 'momo' },
]

const pricingTypeOptions = [
  { text: 'Retail', value: 'retail' },
  { text: 'Wholesale', value: 'wholesale' },
]

const paymentStatusOptions = [
  { text: 'Pending', value: 'pending' },
  { text: 'Paid', value: 'paid' },
]

// ── Searchable unit picker ──────────────────────────────────────────────────

interface SearchableUnitSelectProps {
  value: string
  onChange: (v: string) => void
  options: { text: string; value: string }[]
  placeholder?: string
}

const SearchableUnitSelect = ({ value, onChange, options, placeholder = 'Select product' }: SearchableUnitSelectProps) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(
    () => (query.trim() ? options.filter((o) => o.text.toLowerCase().includes(query.toLowerCase())) : options),
    [options, query]
  )

  const selectedLabel = options.find((o) => o.value === String(value))?.text ?? ''

  const handleOpen = () => {
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSelect = (v: string) => {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  // Close on outside click
  const handleBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full h-9 px-3 flex items-center justify-between rounded-md border border-input bg-white bytewave-paragraph text-sm text-left truncate hover:border-endeavour focus:outline-none focus:ring-1 focus:ring-endeavour transition-colors"
      >
        <span className={selectedLabel ? 'text-stone-700 truncate' : 'text-gray-400'}>{selectedLabel || placeholder}</span>
        <svg className="ml-1 h-3.5 w-3.5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[260px] rounded-md border border-gray-200 bg-white shadow-lg">
          {/* Search input */}
          <div className="px-2 pt-2 pb-1 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product..."
              className="w-full px-2 py-1.5 text-xs bytewave-paragraph border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-endeavour"
            />
          </div>
          {/* Options list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 bytewave-paragraph text-xs text-gray-400">No products found</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(opt.value)
                  }}
                  className={`w-full text-left px-3 py-1.5 bytewave-paragraph text-sm truncate hover:bg-gray-50 transition-colors ${
                    opt.value === String(value) ? 'text-endeavour font-medium' : 'text-stone-700'
                  }`}
                >
                  {opt.text}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main form ───────────────────────────────────────────────────────────────

const CreateInvoice = ({ mode = 'create', invoiceId, initialData, onSuccess }: CreateInvoiceProps) => {
  const request = useAxios()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const { data: productsData } = useFetchData('products', ProductServices.FetchAll({ limit: 1000, offset: 0 }) as unknown as IGeneric)

  const unitOptions = useMemo(
    () =>
      ((productsData as any[]) ?? []).flatMap((p: any) =>
        (p.units ?? []).map((u: any) => ({
          text: `${p.name} – ${u.unitName ?? '—'}`,
          value: String(u.id),
        }))
      ),
    [productsData]
  )

  const unitPriceMap = useMemo(() => {
    const map: Record<number, { retail: number; wholesale: number }> = {}
    ;((productsData as any[]) ?? []).forEach((p: any) => {
      ;(p.units ?? []).forEach((u: any) => {
        map[Number(u.id)] = {
          retail: u.retailPrice ?? 0,
          wholesale: u.wholesalePrice ?? 0,
        }
      })
    })
    return map
  }, [productsData])

  const today = new Date().toISOString().split('T')[0]

  const form = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerName: initialData?.customerName ?? '',
      customerPhone: initialData?.customerPhone ?? '',
      date: initialData?.date ?? today,
      paymentType: initialData?.paymentType ?? 'cash',
      paymentStatus: initialData?.paymentStatus ?? 'pending',
      items: initialData?.items?.length ? initialData.items : [{ productUnitId: 0, quantity: 1, pricingType: 'retail' }],
    },
  })

  useEffect(() => {
    if (!initialData) return
    form.reset({
      customerName: initialData.customerName ?? '',
      customerPhone: initialData.customerPhone ?? '',
      date: initialData.date ?? today,
      paymentType: initialData.paymentType ?? 'cash',
      paymentStatus: initialData.paymentStatus ?? 'pending',
      items: initialData.items?.length ? initialData.items : [{ productUnitId: 0, quantity: 1, pricingType: 'retail' }],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId])

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })
  const watchedItems = (useWatch({ control: form.control, name: 'items' }) ?? []) as any[]

  const getPrice = (unitId: number, pricingType: string): number => {
    const u = unitPriceMap[unitId]
    if (!u || !unitId) return 0
    return pricingType === 'wholesale' ? u.wholesale : u.retail
  }

  const grandTotal = watchedItems.reduce((sum, item) => {
    const qty = Math.max(0, Number(item?.quantity) || 0)
    const price = getPrice(Number(item?.productUnitId), item?.pricingType ?? 'retail')
    return sum + price * qty
  }, 0)

  const onSubmit = async (data: InvoiceForm) => {
    setSubmitError('')
    setIsSubmitting(true)
    try {
      if (mode === 'update' && invoiceId) {
        await request(InvoiceServices.Update(invoiceId, data))
      } else {
        await request(InvoiceServices.Create(data))
      }
      form.reset({
        customerName: '',
        customerPhone: '',
        date: today,
        paymentType: 'cash',
        paymentStatus: 'pending',
        items: [{ productUnitId: 0, quantity: 1, pricingType: 'retail' }],
      })
      onSuccess?.()
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error ?? 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <div className="flex flex-col gap-4 py-2 flex-1">
          {/* Customer info */}
          <div className="grid grid-cols-2 gap-3">
            <InputsTemplate control={form.control} name="customerName" label="Customer Name" placeholder="e.g. John Mensah" isRequired />
            <InputsTemplate control={form.control} name="customerPhone" label="Phone" placeholder="e.g. 0557356616" isRequired />
          </div>

          {/* Date + Payment type + Payment status */}
          <div className="grid grid-cols-3 gap-3">
            <InputsTemplate control={form.control} name="date" label="Invoice Date" placeholder="YYYY-MM-DD" inputType="date" isRequired />
            <SelectTemplate
              control={form.control}
              name="paymentType"
              label="Payment Type"
              placeholder="Select payment"
              content={paymentTypeOptions}
            />
            <SelectTemplate
              control={form.control}
              name="paymentStatus"
              label="Payment Status"
              placeholder="Select status"
              content={paymentStatusOptions}
            />
          </div>

          {/* Items table */}
          <div className="flex flex-col gap-2">
            <p className="bytewave-paragraph text-endeavour font-mulish-regular">Items</p>

            <div className="rounded-lg border border-gray-200">
              {/* Header */}
              <div className="grid grid-cols-[minmax(0,1fr)_3rem_6rem_5rem_6rem_2rem] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
                <span className="bytewave-paragraph text-xs text-gray-500 font-medium">Product / Unit</span>
                <span className="bytewave-paragraph text-xs text-gray-500 font-medium">Qty</span>
                <span className="bytewave-paragraph text-xs text-gray-500 font-medium">Type</span>
                <span className="bytewave-paragraph text-xs text-gray-500 font-medium">Price</span>
                <span className="bytewave-paragraph text-xs text-gray-500 font-medium text-right">Total</span>
                <span />
              </div>

              {/* Rows */}
              {fields.map((field, index) => {
                const item = watchedItems[index] ?? {}
                const qty = Math.max(0, Number(item.quantity) || 0)
                const pricing = item.pricingType ?? 'retail'
                const price = getPrice(Number(item.productUnitId), pricing)
                const lineTotal = price * qty

                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-[minmax(0,1fr)_3rem_6rem_5rem_6rem_2rem] gap-2 px-3 py-2 items-center border-b border-gray-100 last:border-0 bg-white"
                  >
                    <Controller
                      control={form.control}
                      name={`items.${index}.productUnitId`}
                      render={({ field }) => (
                        <SearchableUnitSelect
                          value={String(field.value ?? '')}
                          onChange={(v) => field.onChange(Number(v))}
                          options={unitOptions}
                          placeholder="Select product"
                        />
                      )}
                    />
                    <InputsTemplate control={form.control} name={`items.${index}.quantity`} placeholder="1" inputType="number" isRequired />
                    <SelectTemplate
                      control={form.control}
                      name={`items.${index}.pricingType`}
                      placeholder="Type"
                      content={pricingTypeOptions}
                    />
                    {/* Unit price */}
                    <span className="bytewave-paragraph text-sm text-stone-700">{price > 0 ? `₵${price.toFixed(2)}` : '—'}</span>
                    {/* Line total */}
                    <span className="bytewave-paragraph text-sm font-semibold text-stone-700 text-right">
                      {lineTotal > 0 ? `₵${lineTotal.toFixed(2)}` : '—'}
                    </span>
                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => {
                        if (fields.length > 1) remove(index)
                      }}
                      disabled={fields.length <= 1}
                      className="flex items-center justify-center p-1 rounded text-gray-300 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => append({ productUnitId: 0, quantity: 1, pricingType: 'retail' })}
              className="flex items-center gap-1.5 text-sm text-endeavour bytewave-paragraph hover:underline w-fit mt-1"
            >
              <Plus className="h-4 w-4" />
              Add item
            </button>
          </div>
        </div>

        <div className="mt-auto border-t border-gray-200 pt-4 pb-2 flex flex-col gap-2">
          {grandTotal > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 mb-1">
              <span className="bytewave-paragraph font-semibold text-stone-700">Total</span>
              <span className="bytewave-heading text-xl text-stone-800">₵{grandTotal.toFixed(2)}</span>
            </div>
          )}
          {submitError && <p className="text-sm text-red-500">{submitError}</p>}
          <ButtonTemplate
            isText
            text={isSubmitting ? 'Saving...' : mode === 'update' ? 'Update Invoice' : 'Save Invoice'}
            type="submit"
            isDisabled={isSubmitting}
          />
        </div>
      </form>
    </Form>
  )
}

export default CreateInvoice
