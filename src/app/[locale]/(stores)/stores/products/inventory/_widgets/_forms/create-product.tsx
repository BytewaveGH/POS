'use client'

import * as z from 'zod'
import { useState, useRef } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@/components/ui/form'
import InputsTemplate from '@/components/templates/inputs'
import ButtonTemplate from '@/components/templates/button'
import { SelectTemplate } from '@/components/templates/select-template'
import { Plus, Minus } from 'lucide-react'
import { useAxios } from '@/hooks/use-axios'
import { ProductServices } from '../../_logics/services'
import { useFetchData } from '@/hooks/use-fetch'
import { UnitServices, WarehouseServices } from '../../../categories/_logics/services'
import { IGeneric } from '@/types/interfaces'

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  purchasePrice: z.coerce.number().min(0, 'Required'),
  minQuantity: z.coerce.number().int().optional(),
  units: z
    .array(
      z.object({
        unitId: z.coerce.number().min(1, 'Unit required'),
        retailPrice: z.coerce.number().min(0, 'Required'),
        wholesalePrice: z.coerce.number().min(0, 'Required'),
        pricingRule: z.enum(['flat', 'half-box', 'bulk-wholesale']).default('flat'),
        boxSize: z.coerce.number().int().optional(),
        boxRetailPrice: z.coerce.number().optional(),
        bulkThreshold: z.coerce.number().int().optional(),
      })
    )
    .min(1, 'At least one selling unit required'),
  stock: z
    .array(
      z.object({
        warehouseId: z.coerce.number().min(1, 'Warehouse is required'),
        quantity: z.coerce.number().min(1, 'Quantity is required'),
      })
    )
    .min(1),
})

type ProductForm = z.infer<typeof productSchema>

interface CreateProductProps {
  mode?: 'create' | 'update'
  productId?: number
  initialData?: any // accepts both ProductForm shape and raw API shape
  onSuccess?: () => void
}

const categoryOptions = [
  { text: 'Pack', value: 'packs' },
  { text: 'Box', value: 'box' },
  { text: 'Bundles', value: 'bundles' },
  { text: 'Canned', value: 'canned' },
  { text: 'Bottles', value: 'bottles' },
]

const pricingRuleOptions = [
  { text: 'Flat – fixed price', value: 'flat' },
  { text: 'Half-box – ½ price at half qty', value: 'half-box' },
  { text: 'Bulk wholesale – wholesale at qty N+', value: 'bulk-wholesale' },
]

const BOX_KEYWORDS = ['box', 'carton', 'bottle', 'pack', 'bundle']
const isBoxUnit = (name: string) => BOX_KEYWORDS.some((k) => name.toLowerCase().includes(k))

interface UnitRowProps {
  index: number
  fieldId: string
  control: any
  unitOptions: { text: string; value: string }[]
  showLabels: boolean
  canRemove: boolean
  onRemove: () => void
  pieceUnitId: string
  onAddPieceUnit: (pieceUnitId: string, piecePrice: number, boxSizeNum: number, boxRetailPrice: number) => void
}

const UnitRow = ({ index, fieldId, control, unitOptions, showLabels, canRemove, onRemove, pieceUnitId, onAddPieceUnit }: UnitRowProps) => {
  const rule = useWatch({ control, name: `units.${index}.pricingRule` })

  return (
    <div key={fieldId} className="flex flex-col gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
      {/* Main unit row */}
      <div className="grid grid-cols-4 gap-2 items-end">
        <SelectTemplate
          control={control}
          name={`units.${index}.unitId`}
          label={showLabels ? 'Unit' : undefined}
          placeholder="Unit"
          content={unitOptions}
        />
        <InputsTemplate
          control={control}
          name={`units.${index}.retailPrice`}
          label={showLabels ? 'Retail Price' : undefined}
          placeholder="0.00"
          inputType="number"
          isRequired
        />
        <InputsTemplate
          control={control}
          name={`units.${index}.wholesalePrice`}
          label={showLabels ? 'Wholesale Price' : undefined}
          placeholder="0.00"
          inputType="number"
          isRequired
        />
        <div className="flex items-end gap-1">
          <div className="flex-1">
            <SelectTemplate
              control={control}
              name={`units.${index}.pricingRule`}
              label={showLabels ? 'Pricing Rule' : undefined}
              placeholder="Rule"
              content={pricingRuleOptions}
            />
          </div>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="mb-1 p-1.5 rounded-md border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors flex-shrink-0"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Half-box fields — shown when half-box pricing rule is selected */}
      {rule === 'half-box' && (
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200 mt-1">
          <InputsTemplate
            control={control}
            name={`units.${index}.boxSize`}
            label="Pieces per full box"
            placeholder="e.g. 10"
            inputType="number"
            isRequired
          />
          <InputsTemplate
            control={control}
            name={`units.${index}.boxRetailPrice`}
            label="Full box retail price (₵)"
            placeholder="e.g. 300"
            inputType="number"
            isRequired
          />
        </div>
      )}

      {/* Wholesale threshold — only for flat / bulk-wholesale, not for half-box pieces */}
      {rule !== 'half-box' && (
        <div className="flex items-center gap-2">
          <label className="bytewave-paragraph text-xs text-gray-500 whitespace-nowrap">Wholesale from qty</label>
          <div className="w-24">
            <InputsTemplate control={control} name={`units.${index}.bulkThreshold`} placeholder="e.g. 5" inputType="number" />
          </div>
          <p className="bytewave-paragraph text-xs text-gray-400">At this qty, price switches to wholesale</p>
        </div>
      )}
    </div>
  )
}

const CreateProduct = ({ mode = 'create', productId, initialData, onSuccess }: CreateProductProps) => {
  const request = useAxios()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Store ProductUnit record IDs (from API) mapped by form array index
  // Used in update mode to call PUT /products/:id/units/:recordId
  const unitRecordIds = useRef<Record<number, number>>({})
  if (mode === 'update' && initialData?.units) {
    ;(initialData.units as any[]).forEach((u: any, i: number) => {
      if (u.id) unitRecordIds.current[i] = u.id
    })
  }

  const { data: unitsData } = useFetchData('units', UnitServices.FetchAll() as unknown as IGeneric)
  const unitOptions = ((unitsData as any[] | undefined) ?? []).map((u: any) => ({ text: u.name, value: String(u.id) }))

  // Auto-detect the "Piece" unit type by name
  const pieceUnit = ((unitsData as any[] | undefined) ?? []).find((u: any) => u.name.toLowerCase().includes('piece'))
  const pieceUnitId = pieceUnit ? String(pieceUnit.id) : ''

  const { data: warehousesData } = useFetchData('warehouses', WarehouseServices.FetchAll() as unknown as IGeneric)
  const warehouseOptions = ((warehousesData as any[] | undefined) ?? []).map((w: any) => ({ text: w.name, value: String(w.id) }))

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      category: initialData?.category ?? '',
      purchasePrice: initialData?.purchasePrice ?? 0,
      minQuantity: initialData?.minQuantity ?? undefined,
      // Map API units (which have id, unitId, unitName, ...) to form units
      units: (initialData?.units as any[] | undefined)?.map((u: any) => ({
        unitId: u.unitId ?? u.unit_id ?? 0,
        retailPrice: u.retailPrice ?? 0,
        wholesalePrice: u.wholesalePrice ?? 0,
        pricingRule: u.pricingRule ?? 'flat',
        boxSize: u.boxSize ?? undefined,
        boxRetailPrice: u.boxRetailPrice ?? undefined,
        bulkThreshold: u.bulkThreshold ?? undefined,
      })) ?? [{ unitId: 0, retailPrice: 0, wholesalePrice: 0, pricingRule: 'flat' }],
      stock: initialData?.stock ?? [{ warehouseId: 0, quantity: 0 }],
    },
  })

  const { fields: unitFields, append: appendUnit, remove: removeUnit } = useFieldArray({ control: form.control, name: 'units' })

  const { fields: stockFields, append: appendStock, remove: removeStock } = useFieldArray({ control: form.control, name: 'stock' })

  const handleAddPieceUnit = (detectedPieceUnitId: string, piecePrice: number, boxSizeNum: number, boxRetailPrice: number) => {
    appendUnit({
      unitId: detectedPieceUnitId ? Number(detectedPieceUnitId) : 0,
      retailPrice: piecePrice,
      wholesalePrice: piecePrice,
      pricingRule: 'half-box',
      boxSize: boxSizeNum,
      boxRetailPrice,
      // pieces never have a wholesale threshold — half-box rule only
    })
  }

  const resolveRule = (u: ProductForm['units'][number]) =>
    u.pricingRule !== 'flat' ? u.pricingRule : u.bulkThreshold && u.bulkThreshold > 0 ? ('bulk-wholesale' as const) : ('flat' as const)

  const onSubmit = async (data: ProductForm) => {
    setSubmitError('')
    setIsSubmitting(true)
    try {
      if (mode === 'update' && productId) {
        // 1. Update product fields only (UpdateProductRequest — no units/stock)
        await request(
          ProductServices.Update(productId, {
            name: data.name,
            description: data.description,
            category: data.category,
            purchasePrice: data.purchasePrice,
            minQuantity: data.minQuantity,
          })
        )

        // 2. Update each existing unit's pricing
        for (let i = 0; i < data.units.length; i++) {
          const u = data.units[i]
          const recordId = unitRecordIds.current[i]
          const unitPayload = {
            unitId: u.unitId,
            retailPrice: u.retailPrice,
            wholesalePrice: u.wholesalePrice,
            pricingRule: resolveRule(u),
            boxSize: u.boxSize,
            boxRetailPrice: u.boxRetailPrice,
            bulkThreshold: u.bulkThreshold,
          }
          if (recordId) {
            // Existing unit — update
            await request(ProductServices.UpdateUnit(productId, recordId, unitPayload))
          } else {
            // New unit added during edit — create
            await request(ProductServices.AddUnit(productId, unitPayload))
          }
        }
      } else {
        // Create — send full payload including units and stock
        const processed = {
          ...data,
          units: data.units.map((u) => ({ ...u, pricingRule: resolveRule(u) })),
        }
        await request(ProductServices.Create(processed))
      }
      form.reset()
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
          {/* ── Product details ── */}
          <InputsTemplate control={form.control} name="name" label="Product Name" placeholder="e.g. Coca-Cola 330ml" isRequired />
          <InputsTemplate
            control={form.control}
            name="description"
            label="Description"
            placeholder="Brief description..."
            isTextarea
            rowsHeight={2}
          />
          <div className="grid grid-cols-3 gap-4">
            <SelectTemplate
              control={form.control}
              name="category"
              label="Category"
              placeholder="Select category"
              content={categoryOptions}
            />
            <InputsTemplate
              control={form.control}
              name="purchasePrice"
              label="Purchase Price (Cost per piece)"
              placeholder="0.00"
              inputType="number"
              isRequired
            />
            <InputsTemplate
              control={form.control}
              name="minQuantity"
              label="Min Qty (stock alert)"
              placeholder="e.g. 10"
              inputType="number"
            />
          </div>

          {/* ── Selling units ── */}
          <div className="flex flex-col gap-2">
            <p className="bytewave-paragraph text-endeavour font-mulish-regular">Selling Units</p>

            {unitFields.map((field, index) => (
              <UnitRow
                key={field.id}
                fieldId={field.id}
                index={index}
                control={form.control}
                unitOptions={unitOptions}
                showLabels={index === 0}
                canRemove={unitFields.length > 1}
                onRemove={() => removeUnit(index)}
                pieceUnitId={pieceUnitId}
                onAddPieceUnit={handleAddPieceUnit}
              />
            ))}

            <button
              type="button"
              onClick={() => appendUnit({ unitId: 0, retailPrice: 0, wholesalePrice: 0, pricingRule: 'flat' })}
              className="flex items-center gap-1.5 text-sm text-endeavour bytewave-paragraph hover:underline w-fit mt-1"
            >
              <Plus className="h-4 w-4" />
              Add selling unit
            </button>
          </div>

          {/* ── Stock locations — only on create; managed via Stocks tab on edit ── */}
          {mode === 'create' && (
            <div className="flex flex-col gap-2">
              <p className="bytewave-paragraph text-endeavour font-mulish-regular">Stock Locations</p>
              {stockFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2">
                  <div className="flex-1">
                    <SelectTemplate
                      control={form.control}
                      name={`stock.${index}.warehouseId`}
                      label={index === 0 ? 'Warehouse' : undefined}
                      placeholder="Select warehouse"
                      content={warehouseOptions}
                    />
                  </div>
                  <div className="w-28">
                    <InputsTemplate
                      control={form.control}
                      name={`stock.${index}.quantity`}
                      label={index === 0 ? 'Quantity' : undefined}
                      placeholder="0"
                      inputType="number"
                      isRequired
                    />
                  </div>
                  {stockFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStock(index)}
                      className="mb-2 p-1.5 rounded-md border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => appendStock({ warehouseId: 0, quantity: 0 })}
                className="flex items-center gap-1.5 text-sm text-endeavour bytewave-paragraph hover:underline w-fit mt-1"
              >
                <Plus className="h-4 w-4" />
                Add location
              </button>
            </div>
          )}
        </div>

        <div className="mt-auto border-t border-gray-200 pt-4 pb-2 flex flex-col gap-2">
          {submitError && <p className="text-sm text-red-500">{submitError}</p>}
          <ButtonTemplate
            isText
            text={isSubmitting ? 'Saving...' : mode === 'update' ? 'Update Product' : 'Save Product'}
            type="submit"
            isDisabled={isSubmitting}
          />
        </div>
      </form>
    </Form>
  )
}

export default CreateProduct
