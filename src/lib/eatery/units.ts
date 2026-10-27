// Buying units vs using units, and the conversions between them.
//
// An ingredient is counted in its use `unit` (pieces, g, ml…). It may be bought
// in a bigger `purchaseUnit` holding `perPurchase` of them: tissue bought by
// the pack of 50 pieces, Coke by the crate of 24 bottles, rice by the 25 kg bag.
// Mass (g/kg) and volume (ml/l) convert automatically, so a kg ingredient can be
// used as "250 g" in a recipe.

import type { CategoryKey, Ingredient, IngredientUnit, RecipeLine } from './types'

type Dim = 'mass' | 'volume' | 'count'
const BASE: Record<IngredientUnit, { dim: Dim; toBase: number }> = {
  g: { dim: 'mass', toBase: 1 },
  kg: { dim: 'mass', toBase: 1000 },
  ml: { dim: 'volume', toBase: 1 },
  l: { dim: 'volume', toBase: 1000 },
  pcs: { dim: 'count', toBase: 1 },
  bottle: { dim: 'count', toBase: 1 },
  tin: { dim: 'count', toBase: 1 },
  pack: { dim: 'count', toBase: 1 },
  bag: { dim: 'count', toBase: 1 },
  crate: { dim: 'count', toBase: 1 },
  cup: { dim: 'count', toBase: 1 },
  sachet: { dim: 'count', toBase: 1 },
}

// Units recipes can be written in. Containers (pack, crate, bag) are for buying.
export const USE_UNITS: { value: IngredientUnit; label: string }[] = [
  { value: 'pcs', label: 'pieces' },
  { value: 'g', label: 'grams (g)' },
  { value: 'kg', label: 'kilograms (kg)' },
  { value: 'ml', label: 'millilitres (ml)' },
  { value: 'l', label: 'litres (l)' },
  { value: 'bottle', label: 'bottles' },
  { value: 'tin', label: 'tins' },
  { value: 'cup', label: 'cups' },
  { value: 'sachet', label: 'sachets' },
]

// What people buy things in. Free text is allowed too.
export const PURCHASE_UNITS = [
  'pack',
  'box',
  'carton',
  'crate',
  'bag',
  'sack',
  'bottle',
  'gallon',
  'tin',
  'tray',
  'dozen',
  'sleeve',
  'roll',
  'block',
  'cylinder',
  'kg',
  'litre',
  'piece',
]

const PLURAL: Record<string, string> = { pcs: 'pieces', piece: 'pieces', box: 'boxes', dozen: 'dozen', g: 'g', kg: 'kg', ml: 'ml', l: 'l' }
const SINGULAR: Record<string, string> = { pcs: 'piece' }

// "1 piece", "50 pieces", "3 packs", "250 g"
export const unitName = (unit: string, n = 2) => {
  if (['g', 'kg', 'ml', 'l'].includes(unit)) return unit
  if (n === 1) return SINGULAR[unit] ?? unit
  return PLURAL[unit] ?? (unit.endsWith('s') ? unit : `${unit}s`)
}
const num = (n: number) => String(Math.round(n * 100) / 100)
export const amount = (n: number, unit: string) =>
  ['g', 'kg', 'ml', 'l'].includes(unit) ? `${num(n)} ${unit}` : `${num(n)} ${unitName(unit, n)}`

export const conversion = (from: IngredientUnit, to: IngredientUnit): number | null => {
  const a = BASE[from]
  const b = BASE[to]
  if (!a || !b || a.dim !== b.dim) return null
  if (a.dim === 'count') return from === to ? 1 : null
  return a.toBase / b.toBase
}

export const perPurchaseOf = (i: Pick<Ingredient, 'perPurchase'>) => (i.perPurchase && i.perPurchase > 0 ? i.perPurchase : 1)
export const buysInBulk = (i: Pick<Ingredient, 'perPurchase' | 'purchaseUnit'>) => !!i.purchaseUnit && perPurchaseOf(i) !== 1

// Price of one purchase unit (e.g. ₵7 a pack), from the stored per-use-unit cost.
export const purchasePrice = (i: Ingredient) => Math.round(i.costPerUnit * perPurchaseOf(i) * 100) / 100

// Units a recipe line for this ingredient can be typed in, with the factor
// to the ingredient's own unit.
export const lineUnits = (i: Ingredient): { value: IngredientUnit | 'purchase'; label: string; factor: number }[] => {
  const own = BASE[i.unit]
  const same = (Object.keys(BASE) as IngredientUnit[])
    .filter((u) => u === i.unit || (own.dim !== 'count' && BASE[u].dim === own.dim))
    .map((u) => ({ value: u as IngredientUnit | 'purchase', label: unitName(u), factor: conversion(u, i.unit)! }))
  if (buysInBulk(i)) same.push({ value: 'purchase', label: unitName(i.purchaseUnit!), factor: perPurchaseOf(i) })
  return same
}

// Typed quantity → stored line (always in the ingredient's unit).
export const toLine = (i: Ingredient, typed: number, unit: IngredientUnit | 'purchase' = i.unit): RecipeLine => {
  const f = lineUnits(i).find((u) => u.value === unit)?.factor ?? 1
  return { ingredientId: i.id, quantity: Math.round(typed * f * 1e6) / 1e6, unit: unit === i.unit ? undefined : unit }
}
// Stored line → what to show in the box.
export const typedOf = (i: Ingredient, line: RecipeLine) => {
  const u = lineUnits(i).find((x) => x.value === (line.unit ?? i.unit)) ?? { value: i.unit, factor: 1 }
  return { value: Math.round((line.quantity / u.factor) * 1e6) / 1e6, unit: u.value }
}

// "2 packs + 34 pieces", "1.5 kg", "18 bottles"
export const stockLabel = (i: Ingredient) => {
  if (!buysInBulk(i)) return amount(i.stock, i.unit)
  const per = perPurchaseOf(i)
  const neg = i.stock < 0
  const s = Math.abs(i.stock)
  const whole = Math.floor(s / per + 1e-9)
  const rest = Math.round((s - whole * per) * 100) / 100
  const parts = [whole > 0 && amount(whole, i.purchaseUnit!), (rest > 0 || whole === 0) && amount(rest, i.unit)].filter(Boolean)
  return `${neg ? '−' : ''}${parts.join(' + ')}`
}

// "₵0.14 per piece" (+ "₵7 per pack" when bought in bulk)
export const costLabels = (i: Ingredient, money: (n: number) => string) => {
  const tiny = ['g', 'ml'].includes(i.unit) && i.costPerUnit < 0.1
  const use = tiny
    ? `${money(Math.round(i.costPerUnit * 1000 * 100) / 100)} per ${i.unit === 'g' ? 'kg' : 'litre'}`
    : `${money(Math.round(i.costPerUnit * 10000) / 10000)} per ${unitName(i.unit, 1)}`
  return { use, purchase: buysInBulk(i) ? `${money(purchasePrice(i))} per ${i.purchaseUnit}` : null }
}

// When an existing ingredient's counting unit changes, everything stored in
// the old unit (stock, warning level, recipe quantities) is multiplied by
// this. Tissue counted in packs → pieces with 50 a pack: × 50. kg → g: × 1000.
// Null when it can't be known (owner should count the stock again).
export const rescaleFactor = (
  before: Pick<Ingredient, 'unit'>,
  after: Pick<Ingredient, 'unit' | 'purchaseUnit' | 'perPurchase'>
): number | null => {
  if (before.unit === after.unit) return 1
  const direct = conversion(before.unit, after.unit)
  if (direct) return direct
  if (after.purchaseUnit && (after.purchaseUnit === before.unit || unitName(after.purchaseUnit, 1) === unitName(before.unit, 1)))
    return perPurchaseOf(after)
  return null
}

// ── Ready-made setups ──

export interface IngredientTemplate {
  name: string
  unit: IngredientUnit
  purchaseUnit?: string
  perPurchase?: number
  // Typical price of one purchase unit (or one unit), GHS — the owner adjusts it.
  price: number
  kinds: (CategoryKey | 'all')[]
}

export const INGREDIENT_TEMPLATES: IngredientTemplate[] = [
  // Packaging & table
  { name: 'Tissue', unit: 'pcs', purchaseUnit: 'pack', perPurchase: 50, price: 7, kinds: ['all'] },
  { name: 'Paper napkins', unit: 'pcs', purchaseUnit: 'pack', perPurchase: 100, price: 12, kinds: ['all'] },
  { name: 'Takeaway box', unit: 'pcs', purchaseUnit: 'pack', perPurchase: 50, price: 60, kinds: ['all'] },
  { name: 'Takeaway bag', unit: 'pcs', purchaseUnit: 'pack', perPurchase: 100, price: 35, kinds: ['all'] },
  {
    name: 'Straws',
    unit: 'pcs',
    purchaseUnit: 'pack',
    perPurchase: 100,
    price: 15,
    kinds: ['cocktail-bar', 'juice-bar', 'cafe', 'fast-food'],
  },
  { name: 'Paper cup 12 oz', unit: 'pcs', purchaseUnit: 'sleeve', perPurchase: 50, price: 45, kinds: ['cafe', 'juice-bar'] },
  { name: 'Pizza box', unit: 'pcs', purchaseUnit: 'pack', perPurchase: 50, price: 150, kinds: ['fast-food'] },
  { name: 'Shawarma foil wrap', unit: 'pcs', purchaseUnit: 'roll', perPurchase: 100, price: 40, kinds: ['fast-food'] },
  // Drinks
  { name: 'Coca-Cola 350 ml', unit: 'bottle', purchaseUnit: 'crate', perPurchase: 24, price: 170, kinds: ['all'] },
  { name: 'Malta Guinness', unit: 'bottle', purchaseUnit: 'crate', perPurchase: 24, price: 230, kinds: ['all'] },
  { name: 'Bottled water 500 ml', unit: 'bottle', purchaseUnit: 'pack', perPurchase: 12, price: 30, kinds: ['all'] },
  { name: 'Club Lager', unit: 'bottle', purchaseUnit: 'crate', perPurchase: 12, price: 140, kinds: ['cocktail-bar', 'grill'] },
  { name: 'Gin', unit: 'ml', purchaseUnit: 'bottle', perPurchase: 750, price: 260, kinds: ['cocktail-bar'] },
  { name: 'White rum', unit: 'ml', purchaseUnit: 'bottle', perPurchase: 750, price: 190, kinds: ['cocktail-bar'] },
  { name: 'Vodka', unit: 'ml', purchaseUnit: 'bottle', perPurchase: 750, price: 220, kinds: ['cocktail-bar'] },
  { name: 'Limes', unit: 'pcs', purchaseUnit: 'bag', perPurchase: 50, price: 50, kinds: ['cocktail-bar', 'juice-bar'] },
  { name: 'Ice', unit: 'kg', purchaseUnit: 'bag', perPurchase: 2, price: 5, kinds: ['cocktail-bar', 'juice-bar', 'cafe'] },
  // Café
  { name: 'Coffee beans', unit: 'g', purchaseUnit: 'bag', perPurchase: 1000, price: 250, kinds: ['cafe'] },
  { name: 'Fresh milk', unit: 'ml', purchaseUnit: 'carton', perPurchase: 12000, price: 180, kinds: ['cafe', 'bakery', 'juice-bar'] },
  { name: 'Sugar', unit: 'g', purchaseUnit: 'bag', perPurchase: 1000, price: 14, kinds: ['all'] },
  { name: 'Eggs', unit: 'pcs', purchaseUnit: 'crate', perPurchase: 30, price: 65, kinds: ['cafe', 'bakery', 'local-dishes', 'general'] },
  { name: 'Bread loaf', unit: 'pcs', price: 15, kinds: ['cafe', 'general'] },
  // Kitchen
  { name: 'Rice', unit: 'kg', purchaseUnit: 'bag', perPurchase: 25, price: 450, kinds: ['local-dishes', 'grill', 'general', 'fast-food'] },
  { name: 'Cooking oil', unit: 'l', purchaseUnit: 'gallon', perPurchase: 5, price: 140, kinds: ['all'] },
  { name: 'Flour', unit: 'kg', purchaseUnit: 'bag', perPurchase: 50, price: 700, kinds: ['fast-food', 'bakery'] },
  {
    name: 'Tomato paste',
    unit: 'tin',
    purchaseUnit: 'carton',
    perPurchase: 48,
    price: 260,
    kinds: ['local-dishes', 'fast-food', 'general'],
  },
  {
    name: 'Chicken',
    unit: 'kg',
    purchaseUnit: 'box',
    perPurchase: 10,
    price: 550,
    kinds: ['fast-food', 'grill', 'local-dishes', 'general'],
  },
  { name: 'Beef', unit: 'kg', price: 95, kinds: ['fast-food', 'grill', 'local-dishes', 'general'] },
  { name: 'Mozzarella', unit: 'g', purchaseUnit: 'block', perPurchase: 2000, price: 190, kinds: ['fast-food'] },
  { name: 'Pita bread', unit: 'pcs', purchaseUnit: 'pack', perPurchase: 10, price: 25, kinds: ['fast-food'] },
  { name: 'Onions', unit: 'kg', purchaseUnit: 'bag', perPurchase: 10, price: 120, kinds: ['all'] },
  { name: 'Cooking gas', unit: 'kg', purchaseUnit: 'cylinder', perPurchase: 14.5, price: 230, kinds: ['all'] },
  { name: 'Charcoal', unit: 'kg', purchaseUnit: 'sack', perPurchase: 25, price: 120, kinds: ['grill'] },
]

export const templatesFor = (kind: CategoryKey) => INGREDIENT_TEMPLATES.filter((t) => t.kinds.includes('all') || t.kinds.includes(kind))

// A new ingredient from a template (price per purchase unit → cost per use unit).
export const fromTemplate = (t: IngredientTemplate, restaurantId: number): Omit<Ingredient, 'id'> => ({
  restaurantId,
  name: t.name,
  unit: t.unit,
  purchaseUnit: t.purchaseUnit,
  perPurchase: t.perPurchase,
  costPerUnit: Math.round((t.price / (t.perPurchase ?? 1)) * 1e6) / 1e6,
  stock: 0,
  lowStockAt: 0,
})
