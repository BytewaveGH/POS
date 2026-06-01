'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Search, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PopoverTemplate } from '@/components/templates/popover'
import { useFetchData } from '@/hooks/use-fetch'
import { useAxios } from '@/hooks/use-axios'
import { ProductServices } from '../../products/inventory/_logics/services'
import { SalesServices } from '../_logics/services'
import { WarehouseServices } from '../../products/categories/_logics/services'
import { IGeneric } from '@/types/interfaces'

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * flat         – always retail price per piece, no thresholds
 * half-box     – at qty >= boxSize/2, total becomes boxPrice/2 (e.g. medicine, butter)
 * bulk-wholesale – at qty >= bulkThreshold, price switches to wholesale (e.g. drinks)
 */
type PricingRule = 'flat' | 'half-box' | 'bulk-wholesale'

type SellingUnit = {
    unit: string
    label: string
    retailPrice: number
    wholesalePrice: number
    pricingRule: PricingRule
    // half-box fields
    boxSize?: number          // pieces per full box
    boxRetailPrice?: number   // full box retail price
    // bulk-wholesale field
    bulkThreshold?: number    // qty at which wholesale kicks in (default 5)
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

// const TAX_RATE = 0.075

// ── Pricing helpers ─────────────────────────────────────────────────────────

/**
 * half-box:       qty >= floor(boxSize/2)  → halfBoxRetail/2 + extras×retailPrice
 *                 qty >= bulkThreshold     → wholesalePrice×qty (overrides half-box)
 *                 otherwise               → retailPrice×qty
 * bulk-wholesale: qty >= threshold  → wholesalePrice×qty
 * flat (box):     follows customer type toggle (retail/wholesale)
 */
// Computes the correct LINE TOTAL (not per-unit) to avoid floating-point issues
const computeLineTotal = (item: CartItem, customerType: 'retail' | 'wholesale'): number => {
    switch (item.pricingRule) {
        case 'half-box': {
            // Pieces only: half-box flat price at >= halfQty; beyond that add per-piece rate
            const halfQty = Math.floor((item.boxSize ?? 0) / 2)
            if (halfQty > 0 && item.quantity >= halfQty) {
                const halfBoxTotal = (item.boxRetailPrice ?? 0) / 2
                const extra = item.quantity - halfQty
                return halfBoxTotal + extra * item.retailPrice
            }
            return item.retailPrice * item.quantity
        }
        case 'bulk-wholesale':
            return (item.quantity >= (item.bulkThreshold ?? 5)
                ? item.wholesalePrice
                : item.retailPrice) * item.quantity
        default: // flat — customer type toggle applies (boxes, cartons)
            return (customerType === 'retail' ? item.retailPrice : item.wholesalePrice) * item.quantity
    }
}

// True when half-box pricing is active for piece units
const isPieceAtHalfBox = (item: CartItem) =>
    item.pricingRule === 'half-box' &&
    item.boxSize != null &&
    item.quantity >= Math.floor(item.boxSize / 2)

// True when bulk-wholesale pricing is active — only for box/carton units with bulk-wholesale rule
const isPieceAtBulkWholesale = (item: CartItem) =>
    item.pricingRule === 'bulk-wholesale' &&
    !!item.bulkThreshold &&
    item.quantity >= item.bulkThreshold

// ── Component ───────────────────────────────────────────────────────────────

const Main = () => {
    const request = useAxios()

    // ── Persistent cart ──────────────────────────────────────────────────────
    const [cart, setCart] = useState<CartItem[]>(() => {
        try {
            const saved = localStorage.getItem('bytewave-pos-cart')
            return saved ? JSON.parse(saved) : []
        } catch { return [] }
    })

    useEffect(() => {
        try { localStorage.setItem('bytewave-pos-cart', JSON.stringify(cart)) }
        catch { /* storage full or unavailable */ }
    }, [cart])

    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState('All')
    const [customerType, setCustomerType] = useState<'retail' | 'wholesale'>('retail')
    const [openPopover, setOpenPopover] = useState<string | null>(null)
    const [warehouseId, setWarehouseId] = useState<number>(0)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { data: warehousesData } = useFetchData('warehouses', WarehouseServices.FetchAll() as unknown as IGeneric)
    const warehouses = (warehousesData as any[] | undefined) ?? []

    const { data: rawProducts, isLoading } = useFetchData('pos-products', ProductServices.FetchAll())

    const products: Product[] = useMemo(() => {
        const list = (rawProducts as any[] | undefined) ?? []
        return list.map((p: any): Product => ({
            id: String(p.id),
            name: p.name,
            category: p.category ?? 'Other',
            units: (p.units ?? []).map((u: any): SellingUnit => ({
                unit: String(u.id),
                label: u.unitName ?? '—',
                retailPrice: u.retailPrice ?? 0,
                wholesalePrice: u.wholesalePrice ?? 0,
                pricingRule: u.pricingRule ?? 'flat',
                boxSize: u.boxSize ?? undefined,
                boxRetailPrice: u.boxRetailPrice ?? undefined,
                bulkThreshold: u.bulkThreshold ?? undefined,
            })),
        }))
    }, [rawProducts])

    // ── Stock availability map: productId → totalQuantity ───────────────────
    const stockMap = useMemo(() => {
        const map: Record<string, number> = {}
        ;(rawProducts as any[] | undefined ?? []).forEach((p: any) => {
            map[String(p.id)] = p.totalQuantity ?? 0
        })
        return map
    }, [rawProducts])

    const getAvailableStock = (productId: string) => stockMap[productId] ?? Infinity
    const isOverStock = (productId: string, qty: number) => qty > getAvailableStock(productId)

    const categories = useMemo(
        () => ['All', ...Array.from(new Set(products.map(p => p.category)))],
        [products]
    )

    const filtered = useMemo(() => products.filter((p: Product) => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = activeCategory === 'All' || p.category === activeCategory
        return matchesSearch && matchesCategory
    }), [products, search, activeCategory])

    const addToCart = (product: Product, unit: SellingUnit) => {
        const cartId = `${product.id}_${unit.unit}`
        console.log({ product, unit, cartId })
        setCart(prev => {
            const existing = prev.find(i => i.cartId === cartId)
            if (existing) return prev.map(i => i.cartId === cartId ? { ...i, quantity: i.quantity + 1 } : i)
            return [...prev, {
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
            }]
        })
        setOpenPopover(null)
    }

    const updateQty = (cartId: string, delta: number) => {
        setCart(prev =>
            prev.map(i => i.cartId === cartId ? { ...i, quantity: i.quantity + delta } : i)
                .filter(i => i.quantity > 0)
        )
    }

    const removeFromCart = (cartId: string) => setCart(prev => prev.filter(i => i.cartId !== cartId))
    const clearCart = () => {
        setCart([])
        try { localStorage.removeItem('bytewave-pos-cart') } catch { /* ignore */ }
    }

    const getLineTotal = (item: CartItem) => computeLineTotal(item, customerType)

    const subtotal = cart.reduce((sum, i) => sum + getLineTotal(i), 0)
    // const tax = subtotal * TAX_RATE
    // const total = subtotal + tax
    const total = subtotal // tax excluded for now

    const cartUnitsForProduct = (productId: string) => cart.filter(i => i.productId === productId)

    const handleCharge = async (paymentType: 'momo' | 'cash') => {
        if (cart.length === 0 || !warehouseId || isSubmitting) return
        setIsSubmitting(true)
        console.log({cart, warehouseId, paymentType})
        try {
            await request(SalesServices.Create({
                paymentType,
                warehouseId,
                items: cart.map(i => ({
                    productUnitId: Number(i.selectedUnit),
                    quantity: i.quantity,
                })),
            }))
            clearCart()
        } catch (err: any) {
            console.error('Sale failed:', err)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full h-[calc(100vh-5rem)] flex gap-3 overflow-hidden">

            {/* ── LEFT: Product panel ── */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Search */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search products..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg bytewave-paragraph text-stone-600 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-endeavour"
                    />
                </div>

                {/* Category filters */}
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                    {categories.map((cat: string) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                                'px-3 py-1.5 rounded-full bytewave-paragraph whitespace-nowrap border transition-colors',
                                activeCategory === cat
                                    ? 'bg-endeavour text-white border-endeavour'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-endeavour hover:text-endeavour'
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Product grid */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40 text-gray-400 bytewave-paragraph">
                            Loading products...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400 bytewave-paragraph">
                            No products found
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-2">
                            {filtered.map((product: Product) => {
                                const inCartUnits = cartUnitsForProduct(product.id)
                                const totalInCart = inCartUnits.reduce((s, i) => s + i.quantity, 0)
                                const isMultiUnit = product.units.length > 1
                                const primaryUnit = product.units[0]
                                const displayPrice = primaryUnit.pricingRule === 'flat'
                                    ? (customerType === 'retail' ? primaryUnit.retailPrice : primaryUnit.wholesalePrice)
                                    : primaryUnit.retailPrice

                                const cardContent = (
                                    <div className={cn(
                                        'relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all cursor-pointer',
                                        'bg-white hover:border-endeavour hover:shadow-sm active:scale-[0.98]',
                                        totalInCart > 0 ? 'border-endeavour ring-1 ring-endeavour/20' : 'border-gray-200'
                                    )}>
                                        {totalInCart > 0 && (
                                            <span className="absolute top-2 right-2 bg-endeavour text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                                {totalInCart}
                                            </span>
                                        )}
                                        {isMultiUnit && (
                                            <span className="absolute top-2 left-2 bg-gray-100 text-gray-500 text-[9px] rounded px-1 py-0.5">
                                                {product.units.length} units
                                            </span>
                                        )}
                                        <div className="w-full aspect-square rounded-lg bg-gray-100 mb-2 flex items-center justify-center text-2xl">
                                            🛒
                                        </div>
                                        <div>
                                            <p className="bytewave-paragraph text-stone-700 font-medium leading-tight line-clamp-2">
                                                {product.name}
                                            </p>
                                            <p className="bytewave-paragraph text-endeavour font-semibold mt-1">
                                                ₵{displayPrice.toFixed(2)}
                                                {isMultiUnit && (
                                                    <span className="text-gray-400 font-normal text-[10px] ml-1">
                                                        / {primaryUnit.label}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )

                                if (!isMultiUnit) {
                                    return (
                                        <div key={product.id} onClick={() => addToCart(product, primaryUnit)}>
                                            {cardContent}
                                        </div>
                                    )
                                }

                                return (
                                    <PopoverTemplate
                                        key={product.id}
                                        open={openPopover === product.id}
                                        onOpenChange={open => setOpenPopover(open ? product.id : null)}
                                        contentClassName="w-60 p-3"
                                        trigger={<div>{cardContent}</div>}
                                        content={
                                            <div className="flex flex-col gap-1">
                                                <p className="bytewave-paragraph text-stone-600 font-medium text-sm mb-1">{product.name}</p>
                                                <p className="bytewave-paragraph text-gray-400 text-xs mb-2">Choose how to sell:</p>
                                                {product.units.map((unit: SellingUnit) => {
                                                    const price = unit.pricingRule === 'flat'
                                                        ? (customerType === 'retail' ? unit.retailPrice : unit.wholesalePrice)
                                                        : unit.retailPrice
                                                    const unitInCart = cart.find(i => i.cartId === `${product.id}_${unit.unit}`)

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
                                                                'flex items-center justify-between w-full px-3 py-2.5 rounded-lg border transition-colors text-left',
                                                                unitInCart
                                                                    ? 'border-endeavour bg-endeavour/5'
                                                                    : 'border-gray-200 hover:border-endeavour hover:bg-gray-50'
                                                            )}
                                                        >
                                                            <div>
                                                                <span className="bytewave-paragraph text-sm font-medium text-stone-700">
                                                                    {unit.label}
                                                                    {unitInCart && (
                                                                        <span className="ml-2 bg-endeavour text-white text-[9px] rounded-full px-1.5 py-0.5">
                                                                            {unitInCart.quantity}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                {hint && <p className="text-[9px] text-gray-400 mt-0.5">{hint}</p>}
                                                            </div>
                                                            <span className="bytewave-paragraph text-sm font-semibold text-endeavour">
                                                                ₵{price.toFixed(2)}
                                                            </span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        }
                                    />
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── RIGHT: Order panel ── */}
            <div className="w-[340px] flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden flex-shrink-0">

                {/* Header + customer type toggle */}
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-endeavour" />
                            <span className="bytewave-paragraph font-semibold text-stone-700">Current Order</span>
                        </div>
                        {cart.length > 0 && (
                            <button onClick={clearCart} className="bytewave-paragraph text-xs text-gray-400 hover:text-red-500 transition-colors">
                                Clear all
                            </button>
                        )}
                    </div>
                    {/* Warehouse selector */}
                    <select
                        value={warehouseId}
                        onChange={e => setWarehouseId(Number(e.target.value))}
                        className="w-full mb-2 px-2 py-1.5 border border-gray-200 rounded-lg bytewave-paragraph text-xs text-stone-600 focus:outline-none focus:ring-1 focus:ring-endeavour"
                    >
                        <option value={0} disabled>Select warehouse</option>
                        {warehouses.map((w: any) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>

                    {/* Toggle applies to box/carton only; pieces use their own rules */}
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                        {(['retail', 'wholesale'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setCustomerType(type)}
                                className={cn(
                                    'flex-1 py-1.5 bytewave-paragraph text-xs font-medium capitalize transition-colors',
                                    customerType === type ? 'bg-endeavour text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                                )}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1">Box & carton pricing only · Pieces priced by quantity rules</p>
                </div>

                {/* Cart items */}
                <div className="flex-1 overflow-y-auto px-4 py-2">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300">
                            <ShoppingCart className="h-10 w-10" />
                            <p className="bytewave-paragraph text-sm">No items added yet</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1 py-1">
                            {cart.map(item => {
                                const lineTotal = getLineTotal(item)
                                const atHalfBox = isPieceAtHalfBox(item)
                                const atBulkWholesale = isPieceAtBulkWholesale(item)
                                const available = getAvailableStock(item.productId)
                                const overStock = isOverStock(item.productId, item.quantity)

                                return (
                                    <div key={item.cartId} className={cn(
                                        'flex items-center gap-2 py-2 border-b border-gray-50 last:border-0',
                                        overStock && 'bg-red-50 rounded-lg px-1'
                                    )}>
                                        {/* Name + unit + badge */}
                                        <div className="flex-1 min-w-0">
                                            <p className="bytewave-paragraph text-stone-700 text-sm truncate">{item.name}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                <p className="bytewave-paragraph text-gray-400 text-xs">{item.unitLabel}</p>
                                                {atHalfBox && (
                                                    <span className="text-[9px] bg-blue-100 text-blue-600 rounded px-1 py-0.5 font-medium whitespace-nowrap">
                                                        {'½'} box{item.quantity > Math.floor(item.boxSize! / 2) ? ` + ${item.quantity - Math.floor(item.boxSize! / 2)}pc` : ''}
                                                    </span>
                                                )}
                                                {atBulkWholesale && (
                                                    <span className="text-[9px] bg-amber-100 text-amber-600 rounded px-1 py-0.5 font-medium">
                                                        wholesale
                                                    </span>
                                                )}
                                                {item.pricingRule === 'flat' && customerType === 'wholesale' && (
                                                    <span className="text-[9px] bg-amber-100 text-amber-600 rounded px-1 py-0.5 font-medium">
                                                        wholesale
                                                    </span>
                                                )}
                                                {overStock && (
                                                    <span className="text-[9px] bg-red-100 text-red-600 rounded px-1 py-0.5 font-medium whitespace-nowrap">
                                                        ⚠ only {available} in stock
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Qty controls */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => updateQty(item.cartId, -1)}
                                                className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-endeavour hover:text-endeavour transition-colors"
                                            >
                                                <Minus className="h-3 w-3" />
                                            </button>
                                            <span className="bytewave-paragraph text-stone-700 w-5 text-center text-sm font-medium">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQty(item.cartId, +1)}
                                                className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-endeavour hover:text-endeavour transition-colors"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>

                                        {/* Line total */}
                                        <p className="bytewave-paragraph text-stone-700 text-sm font-semibold w-16 text-right">
                                            ₵{lineTotal.toFixed(2)}
                                        </p>

                                        {/* Remove */}
                                        <button onClick={() => removeFromCart(item.cartId)} className="text-gray-300 hover:text-red-400 transition-colors ml-1">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Totals + checkout */}
                <div className="border-t border-gray-100 px-4 py-4 flex flex-col gap-2">
                    {cart.some(i => isOverStock(i.productId, i.quantity)) && (
                        <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-red-50 border border-red-200 mb-1">
                            <span className="text-red-500 text-xs mt-0.5">⚠</span>
                            <p className="bytewave-paragraph text-xs text-red-600">
                                Some items exceed available stock. Please adjust quantities before charging.
                            </p>
                        </div>
                    )}
                    <div className="flex justify-between bytewave-paragraph text-sm text-gray-500">
                        <span>Subtotal</span>
                        <span>₵{subtotal.toFixed(2)}</span>
                    </div>
                    {/* <div className="flex justify-between bytewave-paragraph text-sm text-gray-500">
                        <span>Tax ({(TAX_RATE * 100).toFixed(1)}%)</span>
                        <span>₵{tax.toFixed(2)}</span>
                    </div> */}
                    <div className="flex justify-between bytewave-paragraph font-semibold text-stone-700 text-base border-t border-gray-100 pt-2 mt-1">
                        <span>Total</span>
                        <span>₵{total.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                        <button
                            disabled={cart.length === 0 || !warehouseId || isSubmitting}
                            onClick={() => handleCharge('momo')}
                            className={cn(
                                'flex-1 py-3 rounded-xl bytewave-paragraph font-semibold text-sm transition-all',
                                cart.length === 0 || !warehouseId || isSubmitting
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-endeavour text-white hover:bg-veniceBlue active:scale-[0.98]'
                            )}
                        >
                            {isSubmitting ? 'Processing...' : `MoMo · ₵${total.toFixed(2)}`}
                        </button>
                        <button
                            disabled={cart.length === 0 || !warehouseId || isSubmitting}
                            onClick={() => handleCharge('cash')}
                            className={cn(
                                'flex-1 py-3 rounded-xl bytewave-paragraph font-semibold text-sm transition-all',
                                cart.length === 0 || !warehouseId || isSubmitting
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]'
                            )}
                        >
                            {isSubmitting ? 'Processing...' : `Cash · ₵${total.toFixed(2)}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Main
