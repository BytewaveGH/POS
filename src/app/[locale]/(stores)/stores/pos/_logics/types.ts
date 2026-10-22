// Shared POS types — used by the product grid/cart (main.tsx) and the camera scanner.

export type PricingRule = 'flat' | 'half-box' | 'bulk-wholesale'

export type SellingUnit = {
  // Product unit id (ProductUnit.id) — what POST /sales calls productUnitId.
  unit: string
  label: string
  retailPrice: number
  wholesalePrice: number
  pricingRule: PricingRule
  // Stock (base) units one of this unit consumes: Bottle = 1, Box = 12.
  baseQuantity: number
  boxSize?: number
  boxRetailPrice?: number
  bulkThreshold?: number
}

export type Product = {
  id: string
  name: string
  category: string
  brand?: string
  sku?: string
  imageUrl?: string
  units: SellingUnit[]
}

export type CartItem = {
  cartId: string
  productId: string
  name: string
  unitLabel: string
  // productUnitId
  selectedUnit: string
  baseQuantity: number
  retailPrice: number
  wholesalePrice: number
  pricingRule: PricingRule
  boxSize?: number
  boxRetailPrice?: number
  bulkThreshold?: number
  quantity: number
}

export type CustomerType = 'retail' | 'wholesale'

// Display-only price for a unit (the sale endpoint prices the order itself).
export const unitDisplayPrice = (unit: SellingUnit, customerType: CustomerType) =>
  unit.pricingRule === 'flat' ? (customerType === 'retail' ? unit.retailPrice : unit.wholesalePrice) : unit.retailPrice

const PRICING_RULES: PricingRule[] = ['flat', 'half-box', 'bulk-wholesale']
export const toPricingRule = (v: unknown): PricingRule => (PRICING_RULES.includes(v as PricingRule) ? (v as PricingRule) : 'flat')

const toBaseQuantity = (v: unknown) => {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n >= 1 ? n : 1
}

export const mapApiUnit = (u: any): SellingUnit => ({
  unit: String(u.id),
  label: u.unitName ?? u.name ?? '—',
  retailPrice: u.retailPrice ?? u.price ?? 0,
  wholesalePrice: u.wholesalePrice ?? 0,
  pricingRule: toPricingRule(u.pricingRule),
  baseQuantity: toBaseQuantity(u.baseQuantity),
  boxSize: u.boxSize ?? undefined,
  boxRetailPrice: u.boxRetailPrice ?? undefined,
  bulkThreshold: u.bulkThreshold ?? undefined,
})

// Maps a raw /products/ record onto the POS Product shape.
export const mapApiProduct = (p: any): Product => ({
  id: String(p.id),
  name: p.name,
  category: p.category ?? 'Other',
  brand: p.brand || undefined,
  sku: p.sku || undefined,
  imageUrl: p.imageUrl || p.image || undefined,
  units: (p.units ?? []).map(mapApiUnit),
})

// "Box (12 pcs)" style suffix for multi-piece units.
export const piecesHint = (baseQuantity: number | undefined) => (baseQuantity && baseQuantity > 1 ? `${baseQuantity} pcs` : '')
