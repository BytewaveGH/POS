// Pure cart operations. A line is keyed by product unit (productUnitId), so one
// product can have several lines — e.g. 2 × Box and 3 × Bottle of Alomo.

import type { CartItem, Product, SellingUnit } from './types'

export const cartIdFor = (product: Product, unit: SellingUnit) => `${product.id}_${unit.unit}`

// Integer ≥ 1, or null when the input isn't a valid quantity.
export const sanitizeQty = (raw: string | number): number | null => {
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  return Number.isInteger(n) && n >= 1 ? n : null
}

export const addLine = (cart: CartItem[], product: Product, unit: SellingUnit, qty = 1): CartItem[] => {
  const existing = cart.find((i) => i.selectedUnit === unit.unit)
  if (existing) return cart.map((i) => (i === existing ? { ...i, quantity: i.quantity + qty } : i))
  return [
    ...cart,
    {
      cartId: cartIdFor(product, unit),
      productId: product.id,
      name: product.name,
      unitLabel: unit.label,
      selectedUnit: unit.unit,
      baseQuantity: unit.baseQuantity,
      retailPrice: unit.retailPrice,
      wholesalePrice: unit.wholesalePrice,
      pricingRule: unit.pricingRule,
      boxSize: unit.boxSize,
      boxRetailPrice: unit.boxRetailPrice,
      bulkThreshold: unit.bulkThreshold,
      quantity: qty,
    },
  ]
}

// Adds delta; a line that drops to 0 is removed.
export const changeQty = (cart: CartItem[], cartId: string, delta: number): CartItem[] =>
  cart.map((i) => (i.cartId === cartId ? { ...i, quantity: i.quantity + delta } : i)).filter((i) => i.quantity > 0)

export const setQty = (cart: CartItem[], cartId: string, qty: number): CartItem[] => {
  const valid = sanitizeQty(qty)
  return valid === null ? cart : cart.map((i) => (i.cartId === cartId ? { ...i, quantity: valid } : i))
}

export const removeLine = (cart: CartItem[], cartId: string): CartItem[] => cart.filter((i) => i.cartId !== cartId)

// Undo of a single scanner add.
export const undoAdd = (cart: CartItem[], cartId: string): CartItem[] => changeQty(cart, cartId, -1)

// Stock is consumed in base units: quantity × baseQuantity, summed per product.
export const baseUnitsByProduct = (cart: CartItem[]): Record<string, number> =>
  cart.reduce<Record<string, number>>((acc, i) => {
    acc[i.productId] = (acc[i.productId] ?? 0) + i.quantity * (i.baseQuantity || 1)
    return acc
  }, {})

export type StockIssue = { need: number; have: number }

// Advisory only — the server is the authority (409 on checkout).
export const stockIssues = (cart: CartItem[], stockByProduct: Record<string, number | undefined>): Record<string, StockIssue> => {
  const out: Record<string, StockIssue> = {}
  for (const [productId, need] of Object.entries(baseUnitsByProduct(cart))) {
    const have = stockByProduct[productId]
    if (have !== undefined && need > have) out[productId] = { need, have }
  }
  return out
}

// Carts persisted before baseQuantity existed, or with bad quantities.
export const normalizeStoredCart = (raw: unknown): CartItem[] =>
  Array.isArray(raw)
    ? raw
        .filter((i: any) => i && typeof i.cartId === 'string' && i.selectedUnit !== undefined)
        .map((i: any) => ({
          ...i,
          baseQuantity: i.baseQuantity >= 1 ? Math.floor(i.baseQuantity) : 1,
          quantity: sanitizeQty(i.quantity) ?? 1,
        }))
    : []
