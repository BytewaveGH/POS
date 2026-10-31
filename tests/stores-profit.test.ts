import { describe, expect, it } from 'vitest'
import { unitCosts } from '@/app/[locale]/(stores)/stores/products/inventory/_logics/product-payload'
import { catalogueOf, costProduct, profitSummary, profitWarning } from '@/app/[locale]/(stores)/stores/overview/_logics/profit'
import { endOfDayIso, rangeParams, startOfDayIso } from '@/app/[locale]/(stores)/stores/overview/_logics/range'
import { periodBounds, shiftPeriod } from '@/app/[locale]/(stores)/stores/overview/_widgets/payments'

const fmt = (n: number) => `₵${n}`
const catalogue = catalogueOf([
  { id: 1, purchasePrice: 4, units: [{ retailPrice: 5, pricingRule: 'flat' }] },
  { id: 2, purchasePrice: 0, units: [{ retailPrice: 10, pricingRule: 'flat' }] },
])

describe('store profit', () => {
  it('uses the backend cost of goods and profit for each product', () => {
    const row = costProduct({ productId: 9, productName: 'Milo', quantitySold: 10, revenue: 100, cogs: 70, profit: 30 }, catalogue)
    expect(row).toMatchObject({ profit: 30, margin: 0.3 })
  })

  it('marks products with no purchase price instead of showing ₵0 or full revenue as profit', () => {
    const row = costProduct({ productId: 2, productName: 'Rice', quantitySold: 3, revenue: 30, cogs: 0, profit: 30 }, catalogue)
    expect(row).toMatchObject({ profit: null, costIssue: 'no-cost' })
  })

  it('estimates from the catalogue only when the backend sends no cost', () => {
    expect(costProduct({ productId: 1, productName: 'Soap', quantitySold: 20, revenue: 100 }, catalogue)).toMatchObject({
      cogs: 80,
      profit: 20,
    })
  })

  it('shows losses rather than clamping to 0, and says why', () => {
    const overview = { revenue: { total: 500 }, cogs: 800, operationsCost: 50, profit: -350 }
    const sold = [{ productId: 1, productName: 'Malt', quantitySold: 50, revenue: 500, cogs: 800, profit: -300 }]
    const s = profitSummary(overview, sold, catalogue)
    expect(s).toMatchObject({ grossProfit: -300, netProfit: -350, grossMargin: -0.6, costAbovePrice: ['Malt'] })
    expect(profitWarning(s, fmt)).toMatch(/higher than the selling price for Malt/)
  })

  it('net profit is gross profit less expenses; margins share the revenue', () => {
    const overview = { revenue: { total: 1000 }, cogs: 600, operationsCost: 100, profit: 300 }
    const s = profitSummary(overview, [], catalogue)
    expect(s).toMatchObject({ grossProfit: 400, netProfit: 300, grossMargin: 0.4, netMargin: 0.3, estimated: false })
    expect(profitWarning(s, fmt)).toBeNull()
  })

  it('reports sales with no purchase price', () => {
    const sold = [{ productId: 2, productName: 'Rice', quantitySold: 3, revenue: 30, cogs: 0, profit: 30 }]
    const s = profitSummary({ revenue: { total: 30 }, cogs: 0, operationsCost: 0, profit: 30 }, sold, catalogue)
    expect(profitWarning(s, fmt)).toMatch(/₵30 of sales \(Rice\) have no purchase price/)
  })
})

describe('stats date ranges', () => {
  it('sends whole days, so the last day is included', () => {
    expect(new Date(startOfDayIso('2026-10-31')).getHours()).toBe(0)
    const end = new Date(endOfDayIso('2026-10-31'))
    expect([end.getDate(), end.getHours(), end.getMinutes()]).toEqual([31, 23, 59])
    expect(rangeParams('', '2026-10-31')).not.toHaveProperty('from')
  })

  it('cash & MoMo periods cover one day or a whole month', () => {
    expect(periodBounds('day', '2026-10-31')).toEqual({ from: '2026-10-31', to: '2026-10-31' })
    expect(periodBounds('month', '2026-02-01')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(shiftPeriod('day', '2026-11-01', -1)).toBe('2026-10-31')
    expect(shiftPeriod('month', '2026-01-01', -1)).toBe('2025-12')
  })
})

describe('cost of each selling unit (purchase price = one box)', () => {
  const flat = (baseQuantity: number, retailPrice = 0) => ({ pricingRule: 'flat' as const, baseQuantity, retailPrice })

  it('splits the box cost by base quantity', () => {
    const units = [flat(20, 250), flat(5, 60), flat(1, 12)]
    expect(unitCosts(200, units).costs.map((c) => c.cost)).toEqual([200, 50, 10])
    expect(unitCosts(200, units).unknownSplit).toBe(false)
  })

  it('a half-box piece costs the box ÷ pieces per full box', () => {
    const units = [flat(1, 250), { pricingRule: 'half-box' as const, baseQuantity: 1, boxSize: 20, retailPrice: 12 }]
    expect(unitCosts(200, units).costs.map((c) => c.cost)).toEqual([200, 10])
  })

  it('flags units that would sell at a loss and boxes with no size', () => {
    const r = unitCosts(200, [flat(1, 250), flat(1, 12)])
    expect(r.unknownSplit).toBe(true)
    expect(r.costs[1]).toEqual({ cost: 200, loss: true })
    expect(unitCosts(200, [flat(1, 250)]).unknownSplit).toBe(false)
  })
})
