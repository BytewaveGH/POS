// Profit for the store dashboards (overview + analytics).
//
// The backend costs every sale line itself: /stats/overview returns `cogs`,
// `operationsCost` and `profit` (revenue − cogs − operations), and
// /stats/products/top returns `cogs` and `profit` per product. Those are the
// numbers to show. The catalogue estimate (purchase price vs retail price) is
// only a fallback for a backend that doesn't send `cogs` yet.
//
// Values are never clamped to 0: a loss, or a cost of goods above sales
// (usually a box with no pieces-per-box set, so a piece is costed as a whole box), must be
// visible to the owner, not hidden as "0".

export interface ProductStat {
  productId: number
  productName: string
  quantitySold: number
  revenue: number
  cogs?: number
  profit?: number
}

export interface CostedProduct extends Omit<ProductStat, 'profit'> {
  // null: the product has no purchase price, so its profit is unknown.
  profit: number | null
  margin: number | null
  costIssue?: 'no-cost' | 'cost-above-price'
}

export interface Catalogue {
  purchasePrice: Record<number, number>
  // The retail price that the purchase price corresponds to (see `catalogueOf`).
  refRetail: Record<number, number>
}

// Purchase price and reference retail per product from GET /products.
export const catalogueOf = (products: any[]): Catalogue => {
  const purchasePrice: Record<number, number> = {}
  const refRetail: Record<number, number> = {}
  for (const p of products) {
    purchasePrice[p.id] = Number(p.purchasePrice) || 0
    const units: any[] = p.units ?? []
    const halfBox = units.find((u) => u.pricingRule === 'half-box' && u.boxRetailPrice > 0)
    if (halfBox) {
      refRetail[p.id] = halfBox.boxRetailPrice
      continue
    }
    const prices = units.map((u) => Number(u.retailPrice) || 0).filter((v) => v > 0)
    if (prices.length) refRetail[p.id] = Math.max(...prices)
  }
  return { purchasePrice, refRetail }
}

// Estimated cost of `revenue` worth of a product, or null when it can't be estimated.
const estimatedCogs = (revenue: number, productId: number, c: Catalogue) => {
  const pp = c.purchasePrice[productId] ?? 0
  const rr = c.refRetail[productId] ?? 0
  return pp > 0 && rr > 0 ? revenue * (pp / rr) : null
}

const round2 = (n: number) => Math.round(n * 100) / 100

export const costProduct = (p: ProductStat, c: Catalogue): CostedProduct => {
  const revenue = Number(p.revenue) || 0
  const backendCogs = Number(p.cogs) || 0
  const cogs = backendCogs > 0 ? backendCogs : p.cogs === undefined ? estimatedCogs(revenue, p.productId, c) : null
  if (cogs === null) return { ...p, revenue, profit: null, margin: null, costIssue: 'no-cost' }
  const profit = round2(backendCogs > 0 && p.profit !== undefined ? Number(p.profit) : revenue - cogs)
  return {
    ...p,
    revenue,
    cogs: round2(cogs),
    profit,
    margin: revenue > 0 ? profit / revenue : null,
    ...(cogs > revenue ? { costIssue: 'cost-above-price' as const } : {}),
  }
}

export interface ProfitSummary {
  revenue: number
  cogs: number
  operationsCost: number
  grossProfit: number
  netProfit: number
  // Gross and net profit as a share of revenue (0–1, can be negative).
  grossMargin: number
  netMargin: number
  // Sales of products without a purchase price: their cost is unknown, so
  // profit is overstated by up to this much.
  uncostedRevenue: number
  uncostedProducts: string[]
  // Products whose cost of goods is above what they sold for.
  costAbovePrice: string[]
  estimated: boolean
}

export const profitSummary = (overview: any, sold: ProductStat[], c: Catalogue): ProfitSummary => {
  const revenue = Number(overview?.revenue?.total) || 0
  const operationsCost = Number(overview?.operationsCost) || 0
  const costed = sold.map((p) => costProduct(p, c))
  const estimated = typeof overview?.cogs !== 'number'
  const cogs = estimated ? costed.reduce((s, p) => s + (p.profit === null ? 0 : (p.cogs ?? 0)), 0) : overview.cogs
  const grossProfit = round2(revenue - cogs)
  const netProfit = round2(typeof overview?.profit === 'number' ? overview.profit : grossProfit - operationsCost)
  const uncosted = costed.filter((p) => p.costIssue === 'no-cost' && p.revenue > 0)
  return {
    revenue,
    cogs: round2(cogs),
    operationsCost,
    grossProfit,
    netProfit,
    grossMargin: revenue > 0 ? grossProfit / revenue : 0,
    netMargin: revenue > 0 ? netProfit / revenue : 0,
    uncostedRevenue: round2(uncosted.reduce((s, p) => s + p.revenue, 0)),
    uncostedProducts: uncosted.map((p) => p.productName),
    costAbovePrice: costed.filter((p) => p.costIssue === 'cost-above-price').map((p) => p.productName),
    estimated,
  }
}

// One line explaining why profit may be off, or null when the numbers are sound.
export const profitWarning = (s: ProfitSummary, fmt: (n: number) => string): string | null => {
  const list = (names: string[]) => `${names.slice(0, 3).join(', ')}${names.length > 3 ? ` and ${names.length - 3} more` : ''}`
  if (s.costAbovePrice.length)
    return `Cost of goods is higher than the selling price for ${list(s.costAbovePrice)}. Check the purchase price is the cost of one box and the box's Base quantity (pieces per box) is set.`
  if (s.uncostedProducts.length)
    return `${fmt(s.uncostedRevenue)} of sales (${list(s.uncostedProducts)}) have no purchase price, so their profit can't be worked out. Add purchase prices to include them.`
  return null
}
