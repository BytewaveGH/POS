'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Search, Plus, Minus, Trash2, ShoppingCart, Package, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PopoverTemplate } from '@/components/templates/popover'
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet' // SheetClose used by unit picker
import { useFetchData } from '@/hooks/use-fetch'
import { useAxios } from '@/hooks/use-axios'
import { ProductServices } from '../../products/inventory/_logics/services'
import { SalesServices } from '../_logics/services'
import { WarehouseServices } from '../../products/categories/_logics/services'
import { IGeneric } from '@/types/interfaces'

// ── Types ──────────────────────────────────────────────────────────────────

type PricingRule = 'flat' | 'half-box' | 'bulk-wholesale'

type SellingUnit = {
  unit: string
  label: string
  retailPrice: number
  wholesalePrice: number
  pricingRule: PricingRule
  boxSize?: number
  boxRetailPrice?: number
  bulkThreshold?: number
}

type Product = {
  id: string
  name: string
  category: string
  units: SellingUnit[]
}

type CartItem = {
  cartId: string
  productId: string
  name: string
  unitLabel: string
  selectedUnit: string
  retailPrice: number
  wholesalePrice: number
  pricingRule: PricingRule
  boxSize?: number
  boxRetailPrice?: number
  bulkThreshold?: number
  quantity: number
}

// ── Pricing helpers ─────────────────────────────────────────────────────────

const computeLineTotal = (item: CartItem, customerType: 'retail' | 'wholesale'): number => {
  switch (item.pricingRule) {
    case 'half-box': {
      const halfQty = Math.floor((item.boxSize ?? 0) / 2)
      if (halfQty > 0 && item.quantity >= halfQty) {
        const halfBoxTotal = (item.boxRetailPrice ?? 0) / 2
        const extra = item.quantity - halfQty
        return halfBoxTotal + extra * item.retailPrice
      }
      return item.retailPrice * item.quantity
    }
    case 'bulk-wholesale':
      return (item.quantity >= (item.bulkThreshold ?? 5) ? item.wholesalePrice : item.retailPrice) * item.quantity
    default:
      return (customerType === 'retail' ? item.retailPrice : item.wholesalePrice) * item.quantity
  }
}

const isPieceAtHalfBox = (item: CartItem) =>
  item.pricingRule === 'half-box' && item.boxSize != null && item.quantity >= Math.floor(item.boxSize / 2)

const isPieceAtBulkWholesale = (item: CartItem) =>
  item.pricingRule === 'bulk-wholesale' && !!item.bulkThreshold && item.quantity >= item.bulkThreshold

// ── Component ───────────────────────────────────────────────────────────────

const Main = () => {
  const request = useAxios()

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('bytewave-pos-cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('bytewave-pos-cart', JSON.stringify(cart))
    } catch {}
  }, [cart])

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [customerType, setCustomerType] = useState<'retail' | 'wholesale'>('retail')
  const [openPopover, setOpenPopover] = useState<string | null>(null)
  const [warehouseId, setWarehouseId] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cartSheetOpen, setCartSheetOpen] = useState(false)
  const [unitPickerProduct, setUnitPickerProduct] = useState<Product | null>(null)

  // ── Draggable cart sheet ────────────────────────────────────────────────
  const [cartHeight, setCartHeight] = useState(56)   // dvh
  const [dragging, setDragging] = useState(false)
  const dragStartY = useRef(0)
  const dragStartH = useRef(56)
  const liveH = useRef(56)                           // tracks height without re-renders

  const closeCartSheet = () => {
    setCartSheetOpen(false)
    setTimeout(() => { setCartHeight(56); liveH.current = 56 }, 50)
  }

  const onHandleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    dragStartH.current = liveH.current
    setDragging(true)
  }

  const onHandleTouchMove = (e: React.TouchEvent) => {
    const dy = dragStartY.current - e.touches[0].clientY
    const newH = Math.min(97, Math.max(12, dragStartH.current + (dy / window.innerHeight) * 100))
    liveH.current = newH
    setCartHeight(newH)
  }

  const onHandleTouchEnd = () => {
    setDragging(false)
    const h = liveH.current
    if (h < 25) {
      closeCartSheet()
    } else if (h > 72) {
      setCartHeight(95); liveH.current = 95
    } else {
      setCartHeight(56); liveH.current = 56
    }
  }

  const { data: warehousesData } = useFetchData('warehouses', WarehouseServices.FetchAll() as unknown as IGeneric)
  const warehouses = (warehousesData as any[] | undefined) ?? []

  const { data: rawProducts, isLoading } = useFetchData('pos-products', ProductServices.FetchAll())

  const products: Product[] = useMemo(() => {
    const list = (rawProducts as any[] | undefined) ?? []
    return list.map(
      (p: any): Product => ({
        id: String(p.id),
        name: p.name,
        category: p.category ?? 'Other',
        units: (p.units ?? []).map(
          (u: any): SellingUnit => ({
            unit: String(u.id),
            label: u.unitName ?? '—',
            retailPrice: u.retailPrice ?? 0,
            wholesalePrice: u.wholesalePrice ?? 0,
            pricingRule: u.pricingRule ?? 'flat',
            boxSize: u.boxSize ?? undefined,
            boxRetailPrice: u.boxRetailPrice ?? undefined,
            bulkThreshold: u.bulkThreshold ?? undefined,
          })
        ),
      })
    )
  }, [rawProducts])

  const stockMap = useMemo(() => {
    const map: Record<string, number> = {}
    ;((rawProducts as any[] | undefined) ?? []).forEach((p: any) => {
      map[String(p.id)] = p.totalQuantity ?? 0
    })
    return map
  }, [rawProducts])

  const getAvailableStock = (productId: string) => stockMap[productId] ?? Infinity
  const isOverStock = (productId: string, qty: number) => qty > getAvailableStock(productId)

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((p) => p.category)))], [products])

  const filtered = useMemo(
    () =>
      products.filter((p: Product) => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = activeCategory === 'All' || p.category === activeCategory
        return matchesSearch && matchesCategory
      }),
    [products, search, activeCategory]
  )

  const addToCart = (product: Product, unit: SellingUnit) => {
    const cartId = `${product.id}_${unit.unit}`
    setCart((prev) => {
      const existing = prev.find((i) => i.cartId === cartId)
      if (existing) return prev.map((i) => (i.cartId === cartId ? { ...i, quantity: i.quantity + 1 } : i))
      return [
        ...prev,
        {
          cartId,
          productId: product.id,
          name: product.name,
          unitLabel: unit.label,
          selectedUnit: unit.unit,
          retailPrice: unit.retailPrice,
          wholesalePrice: unit.wholesalePrice,
          pricingRule: unit.pricingRule,
          boxSize: unit.boxSize,
          boxRetailPrice: unit.boxRetailPrice,
          bulkThreshold: unit.bulkThreshold,
          quantity: 1,
        },
      ]
    })
    setOpenPopover(null)
    setUnitPickerProduct(null)
  }

  const updateQty = (cartId: string, delta: number) => {
    setCart((prev) => prev.map((i) => (i.cartId === cartId ? { ...i, quantity: i.quantity + delta } : i)).filter((i) => i.quantity > 0))
  }

  const removeFromCart = (cartId: string) => setCart((prev) => prev.filter((i) => i.cartId !== cartId))

  const clearCart = () => {
    setCart([])
    try {
      localStorage.removeItem('bytewave-pos-cart')
    } catch {}
  }

  const getLineTotal = (item: CartItem) => computeLineTotal(item, customerType)
  const subtotal = cart.reduce((sum, i) => sum + getLineTotal(i), 0)
  const total = subtotal
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const hasOverStock = cart.some((i) => isOverStock(i.productId, i.quantity))
  const canCharge = cart.length > 0 && !!warehouseId && !isSubmitting && !hasOverStock

  const cartUnitsForProduct = (productId: string) => cart.filter((i) => i.productId === productId)

  const handleCharge = async (paymentType: 'momo' | 'cash') => {
    if (!canCharge) return
    setIsSubmitting(true)
    try {
      await request(
        SalesServices.Create({
          paymentType,
          warehouseId,
          items: cart.map((i) => ({
            productUnitId: Number(i.selectedUnit),
            quantity: i.quantity,
          })),
        })
      )
      clearCart()
      setCartSheetOpen(false)
    } catch (err: any) {
      console.error('Sale failed:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Reusable unit picker list ────────────────────────────────────────────
  const UnitList = ({ product }: { product: Product }) => (
    <div className="flex flex-col gap-2.5">
      {product.units.map((unit: SellingUnit) => {
        const price = unit.pricingRule === 'flat' ? (customerType === 'retail' ? unit.retailPrice : unit.wholesalePrice) : unit.retailPrice
        const unitInCart = cart.find((i) => i.cartId === `${product.id}_${unit.unit}`)
        let hint: string | null = null
        if (unit.pricingRule === 'half-box' && unit.boxSize && unit.boxRetailPrice) {
          hint = `₵${(unit.boxRetailPrice / 2).toFixed(2)} flat at ${unit.boxSize / 2}+`
        } else if (unit.pricingRule === 'bulk-wholesale') {
          hint = `₵${unit.wholesalePrice.toFixed(2)} at ${unit.bulkThreshold ?? 5}+`
        }
        return (
          <button
            key={unit.unit}
            onClick={() => addToCart(product, unit)}
            className={cn(
              'flex items-center justify-between w-full px-4 py-3.5 rounded-2xl border transition-all text-left active:scale-[0.98]',
              unitInCart ? 'border-endeavour bg-endeavour/5' : 'border-gray-200 hover:border-endeavour/60'
            )}
          >
            <div>
              <span className="text-sm font-semibold text-stone-700">
                {unit.label}
                {unitInCart && (
                  <span className="ml-2 bg-endeavour text-white text-[10px] rounded-full px-2 py-0.5">{unitInCart.quantity} in cart</span>
                )}
              </span>
              {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
            </div>
            <span className="text-sm font-bold text-endeavour ml-4 flex-shrink-0">₵{price.toFixed(2)}</span>
          </button>
        )
      })}
    </div>
  )

  // ── Reusable cart controls (warehouse + customer type) ───────────────────
  const CartControls = () => (
    <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
      <select
        value={warehouseId}
        onChange={(e) => setWarehouseId(Number(e.target.value))}
        className="w-full mb-2.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-stone-600 focus:outline-none focus:ring-1 focus:ring-endeavour bg-white"
      >
        <option value={0} disabled>
          Select warehouse
        </option>
        {warehouses.map((w: any) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
      <div className="flex rounded-xl border border-gray-200 overflow-hidden">
        {(['retail', 'wholesale'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setCustomerType(type)}
            className={cn(
              'flex-1 py-2 text-xs font-bold capitalize transition-colors',
              customerType === type ? 'bg-endeavour text-white' : 'bg-white text-gray-500'
            )}
          >
            {type}
          </button>
        ))}
      </div>
      <p className="text-[9px] text-gray-400 mt-1.5 text-center">Box & carton pricing only · Pieces priced by quantity rules</p>
    </div>
  )

  // ── Reusable cart items + totals ─────────────────────────────────────────
  const CartBody = () => (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-300 py-10">
            <ShoppingCart className="h-12 w-12 opacity-40" />
            <p className="text-sm">No items added yet</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50">
            {cart.map((item) => {
              const lineTotal = getLineTotal(item)
              const atHalfBox = isPieceAtHalfBox(item)
              const atBulkWholesale = isPieceAtBulkWholesale(item)
              const available = getAvailableStock(item.productId)
              const overStock = isOverStock(item.productId, item.quantity)
              return (
                <div key={item.cartId} className={cn('flex items-center gap-2.5 py-3', overStock && 'bg-red-50 -mx-2 px-2 rounded-xl')}>
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-700 text-sm font-semibold truncate">{item.name}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <p className="text-gray-400 text-xs">{item.unitLabel}</p>
                      {atHalfBox && (
                        <span className="text-[9px] bg-blue-100 text-blue-600 rounded-md px-1.5 py-0.5 font-medium whitespace-nowrap">
                          ½ box
                          {item.quantity > Math.floor(item.boxSize! / 2) ? ` + ${item.quantity - Math.floor(item.boxSize! / 2)}pc` : ''}
                        </span>
                      )}
                      {(atBulkWholesale || (item.pricingRule === 'flat' && customerType === 'wholesale')) && (
                        <span className="text-[9px] bg-amber-100 text-amber-600 rounded-md px-1.5 py-0.5 font-medium">wholesale</span>
                      )}
                      {overStock && (
                        <span className="text-[9px] bg-red-100 text-red-600 rounded-md px-1.5 py-0.5 font-medium whitespace-nowrap">
                          ⚠ only {available} left
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => updateQty(item.cartId, -1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-endeavour hover:text-endeavour active:scale-90 transition-all"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-stone-700 w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.cartId, +1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-endeavour hover:text-endeavour active:scale-90 transition-all"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-stone-700 text-sm font-bold w-16 text-right flex-shrink-0">₵{lineTotal.toFixed(2)}</p>
                  <button
                    onClick={() => removeFromCart(item.cartId)}
                    className="text-gray-300 hover:text-red-400 active:scale-90 transition-all flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 px-4 py-4 flex flex-col gap-2 flex-shrink-0">
        {hasOverStock && (
          <div className="flex items-start gap-1.5 px-3 py-2 rounded-xl bg-red-50 border border-red-200 mb-1">
            <span className="text-red-500 text-xs">⚠</span>
            <p className="text-xs text-red-600">Some items exceed available stock. Adjust quantities before charging.</p>
          </div>
        )}
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotal</span>
          <span>₵{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-stone-700 text-base border-t border-gray-100 pt-2">
          <span>Total</span>
          <span>₵{total.toFixed(2)}</span>
        </div>
        <div className="flex gap-2 mt-1">
          <button
            disabled={!canCharge}
            onClick={() => handleCharge('momo')}
            className={cn(
              'flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all flex flex-col items-center gap-0.5',
              !canCharge
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-endeavour text-white hover:bg-veniceBlue active:scale-[0.97]'
            )}
          >
            <span>{isSubmitting ? 'Processing...' : 'MoMo'}</span>
            {!isSubmitting && <span className="text-[10px] font-normal opacity-75">₵{total.toFixed(2)}</span>}
          </button>
          <button
            disabled={!canCharge}
            onClick={() => handleCharge('cash')}
            className={cn(
              'flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all flex flex-col items-center gap-0.5',
              !canCharge ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.97]'
            )}
          >
            <span>{isSubmitting ? 'Processing...' : 'Cash'}</span>
            {!isSubmitting && <span className="text-[10px] font-normal opacity-75">₵{total.toFixed(2)}</span>}
          </button>
        </div>
      </div>
    </>
  )

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-[calc(100vh-5rem)] flex flex-col overflow-hidden">
      {/* ── Main area: products + desktop cart ── */}
      <div className="flex-1 flex overflow-hidden min-h-0 gap-3">
        {/* ── Products panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Search + category bar */}
          <div className="flex-shrink-0 pb-3 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-stone-600 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-endeavour bg-white"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((cat: string) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'px-4 py-1.5 rounded-full whitespace-nowrap border transition-colors text-xs font-semibold flex-shrink-0',
                    activeCategory === cat
                      ? 'bg-endeavour text-white border-endeavour'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-endeavour hover:text-endeavour'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid — pb-24 leaves room for the fixed cart bar on mobile */}
          <div className="flex-1 overflow-y-auto pb-24 md:pb-2">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 animate-pulse" style={{ aspectRatio: '3/4' }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
                <Package className="h-8 w-8 opacity-40" />
                <p className="text-sm">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-4">
                {filtered.map((product: Product) => {
                  const inCartUnits = cartUnitsForProduct(product.id)
                  const totalInCart = inCartUnits.reduce((s, i) => s + i.quantity, 0)
                  const isMultiUnit = product.units.length > 1
                  const primaryUnit = product.units[0]
                  const displayPrice =
                    primaryUnit?.pricingRule === 'flat'
                      ? customerType === 'retail'
                        ? primaryUnit.retailPrice
                        : primaryUnit.wholesalePrice
                      : (primaryUnit?.retailPrice ?? 0)

                  const cardClassName = cn(
                    'relative flex flex-col justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer select-none',
                    'bg-white active:scale-[0.96]',
                    totalInCart > 0
                      ? 'border-endeavour shadow-sm shadow-endeavour/10'
                      : 'border-gray-200 hover:border-endeavour/50 hover:shadow-sm'
                  )

                  const cardInner = (
                    <>
                      {totalInCart > 0 && (
                        <span className="absolute top-2 right-2 bg-endeavour text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center z-10">
                          {totalInCart}
                        </span>
                      )}
                      {isMultiUnit && (
                        <span className="absolute top-2 left-2 bg-gray-100 text-gray-500 text-[9px] rounded-md px-1.5 py-0.5 font-medium">
                          {product.units.length} units
                        </span>
                      )}
                      <div className="w-full aspect-square rounded-xl bg-gray-50 mb-2.5 flex items-center justify-center text-2xl">🛒</div>
                      <div>
                        <p className="text-stone-700 font-semibold leading-tight line-clamp-2 text-xs">{product.name}</p>
                        <p className="text-endeavour font-bold mt-1 text-sm">
                          ₵{displayPrice.toFixed(2)}
                          {isMultiUnit && primaryUnit && (
                            <span className="text-gray-400 font-normal text-[10px] ml-1">/ {primaryUnit.label}</span>
                          )}
                        </p>
                      </div>
                    </>
                  )

                  return (
                    <div key={product.id}>
                      {/* Mobile: tap opens bottom sheet for multi-unit, adds directly for single */}
                      <div
                        className={cn(cardClassName, 'md:hidden')}
                        onClick={() => (isMultiUnit ? setUnitPickerProduct(product) : addToCart(product, primaryUnit))}
                      >
                        {cardInner}
                      </div>

                      {/* Desktop: popover for multi-unit, direct click for single */}
                      {isMultiUnit ? (
                        <PopoverTemplate
                          open={openPopover === product.id}
                          onOpenChange={(open) => setOpenPopover(open ? product.id : null)}
                          contentClassName="w-64 p-3"
                          trigger={<div className={cn(cardClassName, 'hidden md:flex flex-col')}>{cardInner}</div>}
                          content={
                            <div className="flex flex-col gap-2">
                              <p className="text-stone-600 font-semibold text-sm">{product.name}</p>
                              <p className="text-gray-400 text-xs -mt-1">Choose how to sell:</p>
                              <UnitList product={product} />
                            </div>
                          }
                        />
                      ) : (
                        <div className={cn(cardClassName, 'hidden md:flex flex-col')} onClick={() => addToCart(product, primaryUnit)}>
                          {cardInner}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Desktop: persistent cart panel ── */}
        <div className="hidden md:flex w-[340px] flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden flex-shrink-0">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-endeavour" />
              <span className="font-semibold text-stone-700 text-sm">Current Order</span>
              {cartCount > 0 && (
                <span className="bg-endeavour text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                Clear all
              </button>
            )}
          </div>
          <CartControls />
          <CartBody />
        </div>
      </div>

      {/* ── Mobile: fixed floating cart bar ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-4 pt-2">
        <button
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all shadow-lg shadow-black/10',
            cartCount > 0 ? 'bg-endeavour text-white active:bg-veniceBlue' : 'bg-gray-100 text-gray-400 cursor-default'
          )}
          onClick={() => { if (cartCount > 0) setCartSheetOpen(true) }}
        >
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', cartCount > 0 ? 'bg-white/20' : 'bg-gray-200')}>
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold leading-tight">
                {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? 's' : ''} in cart` : 'Cart is empty'}
              </p>
              {cartCount > 0 && <p className="text-xs opacity-75">Tap to view & checkout</p>}
            </div>
          </div>
          {cartCount > 0 && <span className="font-bold text-base">₵{total.toFixed(2)}</span>}
        </button>
      </div>

      {/* ── Mobile: draggable cart overlay ── */}
      {cartSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 animate-in fade-in-0 duration-200"
            onClick={closeCartSheet}
          />
          {/* Sheet — height controlled by drag */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-[100%] duration-300"
            style={{
              height: `${cartHeight}dvh`,
              transition: dragging ? 'none' : 'height 0.3s cubic-bezier(0.32,0.72,0,1)',
            }}
          >
            {/* Drag handle — touch target */}
            <div
              className="flex justify-center pt-3 pb-2 flex-shrink-0 touch-none"
              onTouchStart={onHandleTouchStart}
              onTouchMove={onHandleTouchMove}
              onTouchEnd={onHandleTouchEnd}
            >
              <div className={cn('w-12 h-1.5 rounded-full transition-colors', dragging ? 'bg-gray-400' : 'bg-gray-200')} />
            </div>
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-endeavour" />
                <span className="font-semibold text-stone-700 text-sm">Current Order</span>
                {cartCount > 0 && (
                  <span className="bg-endeavour text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                    Clear all
                  </button>
                )}
                <button
                  onClick={closeCartSheet}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <CartControls />
            <CartBody />
          </div>
        </div>
      )}

      {/* ── Mobile: unit picker bottom sheet ── */}
      <Sheet
        open={!!unitPickerProduct}
        onOpenChange={(open) => {
          if (!open) setUnitPickerProduct(null)
        }}
      >
        <SheetContent side="bottom" className="p-0 gap-0 rounded-t-3xl">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          {/* Header */}
          <div className="px-4 pb-3 pt-2 flex items-start justify-between">
            <div>
              <h3 className="font-bold text-stone-800 text-base leading-tight">{unitPickerProduct?.name}</h3>
              <p className="text-gray-400 text-xs mt-0.5">Choose how to sell</p>
            </div>
            <SheetClose asChild>
              <button className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0 mt-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </SheetClose>
          </div>
          {/* Unit list */}
          <div className="px-4 pb-8">{unitPickerProduct && <UnitList product={unitPickerProduct} />}</div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default Main
