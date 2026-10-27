import {
  amount,
  conversion,
  costLabels,
  fromTemplate,
  lineUnits,
  rescaleFactor,
  stockLabel,
  templatesFor,
  toLine,
  typedOf,
  INGREDIENT_TEMPLATES,
} from '@/lib/eatery/units'
import { packagingUsage, recipeWarnings } from '@/lib/eatery/costing'
import { createLocalSource } from '@/lib/eatery/data-source'
import { formatMoney } from '@/lib/eatery/menu'
import type { Ingredient, Order, StorefrontBundle } from '@/lib/eatery/types'

const money = (n: number) => formatMoney(n, 'GHS')
const tissue: Ingredient = {
  id: 1,
  restaurantId: 1,
  name: 'Tissue',
  unit: 'pcs',
  purchaseUnit: 'pack',
  perPurchase: 50,
  costPerUnit: 0.14,
  stock: 134,
  lowStockAt: 50,
}
const rice: Ingredient = {
  id: 2,
  restaurantId: 1,
  name: 'Rice',
  unit: 'kg',
  purchaseUnit: 'bag',
  perPurchase: 25,
  costPerUnit: 18,
  stock: 30,
  lowStockAt: 10,
}
const memory = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

describe('buying units vs using units', () => {
  it('a pack of 50 tissues at ₵7 is ₵0.14 a piece', () => {
    const t = INGREDIENT_TEMPLATES.find((x) => x.name === 'Tissue')!
    const i = fromTemplate(t, 1)
    expect(i).toMatchObject({ unit: 'pcs', purchaseUnit: 'pack', perPurchase: 50, costPerUnit: 0.14 })
    expect(costLabels({ ...i, id: 1 }, money)).toEqual({ use: '₵0.14 per piece', purchase: '₵7 per pack' })
  })

  it('shows stock in packs and pieces', () => {
    expect(stockLabel(tissue)).toBe('2 packs + 34 pieces')
    expect(stockLabel({ ...tissue, stock: 50 })).toBe('1 pack')
    expect(stockLabel({ ...tissue, stock: 7 })).toBe('7 pieces')
    expect(stockLabel(rice)).toBe('1 bag + 5 kg')
    expect(amount(250, 'g')).toBe('250 g')
  })

  it('converts kg↔g and l↔ml, never across kinds', () => {
    expect(conversion('g', 'kg')).toBe(0.001)
    expect(conversion('l', 'ml')).toBe(1000)
    expect(conversion('g', 'ml')).toBeNull()
    expect(conversion('pcs', 'bottle')).toBeNull()
  })

  it('recipe lines can be typed in any sensible unit and are stored in the ingredient’s own', () => {
    expect(lineUnits(rice).map((u) => u.value)).toEqual(['g', 'kg', 'purchase'])
    const line = toLine(rice, 250, 'g')
    expect(line).toEqual({ ingredientId: 2, quantity: 0.25, unit: 'g' })
    expect(typedOf(rice, line)).toEqual({ value: 250, unit: 'g' })
    expect(toLine(tissue, 2)).toEqual({ ingredientId: 1, quantity: 2, unit: undefined })
    expect(toLine(tissue, 1, 'purchase').quantity).toBe(50)
  })

  it('knows how to convert stock when the counting unit changes', () => {
    expect(rescaleFactor({ unit: 'pack' }, { unit: 'pcs', purchaseUnit: 'pack', perPurchase: 50 })).toBe(50)
    expect(rescaleFactor({ unit: 'kg' }, { unit: 'g' })).toBe(1000)
    expect(rescaleFactor({ unit: 'bottle' }, { unit: 'kg' })).toBeNull()
  })

  it('suggests items that fit the kind of place', () => {
    expect(templatesFor('cocktail-bar').some((t) => t.name === 'Gin')).toBe(true)
    expect(templatesFor('cafe').some((t) => t.name === 'Gin')).toBe(false)
    expect(templatesFor('cafe').some((t) => t.name === 'Tissue')).toBe(true)
  })
})

describe('guard rails', () => {
  it('flags a whole pack counted per plate, and suggests a pack size', () => {
    const pack: Ingredient = { ...tissue, unit: 'pack', purchaseUnit: undefined, perPurchase: undefined, costPerUnit: 7 }
    const w = recipeWarnings(12, [{ ingredientId: 1, quantity: 1 }], new Map([[1, pack]]), money)
    expect(w[0]).toMatchObject({ ingredientId: 1, fixPackSize: true })
    expect(w[0].message).toMatch(/costs ₵7 per serving — is one pack several pieces/)
    expect(recipeWarnings(12, [{ ingredientId: 1, quantity: 2 }], new Map([[1, tissue]]), money)).toEqual([])
    expect(recipeWarnings(10, [{ ingredientId: 2, quantity: 1 }], new Map([[2, rice]]), money).map((x) => x.message)).toEqual([
      'Rice alone is 180% of the price — check the quantity.',
      'This costs ₵18 to make but sells for ₵10.',
    ])
  })
})

describe('packaging & extras', () => {
  const order = (type: 'pickup' | 'dine-in', qty: number) =>
    ({ fulfilment: { type }, lines: [{ quantity: qty }] }) as unknown as Pick<Order, 'fulfilment' | 'lines'>
  const rules = [
    {
      id: 1,
      restaurantId: 1,
      name: 'Bag & tissue',
      when: 'takeaway' as const,
      per: 'order' as const,
      active: true,
      ingredients: [{ ingredientId: 1, quantity: 2 }],
    },
    {
      id: 2,
      restaurantId: 1,
      name: 'Box',
      when: 'takeaway' as const,
      per: 'item' as const,
      active: true,
      ingredients: [{ ingredientId: 9, quantity: 1 }],
    },
    {
      id: 3,
      restaurantId: 1,
      name: 'Off',
      when: 'all' as const,
      per: 'order' as const,
      active: false,
      ingredients: [{ ingredientId: 1, quantity: 99 }],
    },
  ]
  it('counts per order or per item, only on matching orders', () => {
    expect(Object.fromEntries(packagingUsage(order('pickup', 3), rules))).toEqual({ 1: 2, 9: 3 })
    expect(packagingUsage(order('dine-in', 3), rules).size).toBe(0)
  })

  it('is taken out of stock and added to the order’s cost', async () => {
    const storage = memory()
    const now = () => new Date(2026, 9, 21, 13, 0)
    await createLocalSource(null, storage, now).directory()
    const owner = createLocalSource('acme', storage, now)
    const cafe = (await owner.claimDemo!()).find((r) => r.slug === 'kofi-and-crumb')!
    const bundle = (await createLocalSource(null, storage, now).storefront('kofi-and-crumb')) as StorefrontBundle
    const croissant = bundle.items.find((i) => i.name === 'Butter Croissant')!
    const napkins = () => owner.list('ingredients').then((l) => l.find((i) => i.restaurantId === cafe.id && i.name === 'Paper napkins')!)
    const take = await owner.createCounterOrder(cafe.id, {
      lines: [{ itemId: croissant.id, quantity: 2, choices: {} }],
      fulfilment: { type: 'pickup' },
      payment: { method: 'cash', paid: true },
    })
    expect((await napkins()).stock).toBe(398)
    // 2 croissants ₵12 + bag ₵0.35 + 2 napkins ₵0.24
    expect(take.costOfGoods).toBe(12.59)
    const dine = await owner.createCounterOrder(cafe.id, {
      lines: [{ itemId: croissant.id, quantity: 1, choices: {} }],
      fulfilment: { type: 'dine-in', table: '1' },
      payment: { method: 'cash', paid: true },
    })
    expect(dine.costOfGoods).toBe(6)
    expect((await napkins()).stock).toBe(398)
  })
})

describe('fixing an ingredient set up in packs', () => {
  it('switching tissue from packs to pieces converts stock and recipes', async () => {
    const owner = createLocalSource('acme', memory())
    const r = await owner.create('restaurants', { slug: 'chop', name: 'Chop', category: 'local-dishes' } as never)
    const t = await owner.create('ingredients', {
      restaurantId: r.id,
      name: 'Tissue',
      unit: 'pack',
      costPerUnit: 7,
      stock: 3,
      lowStockAt: 1,
    })
    const rec = await owner.create('recipes', {
      restaurantId: r.id,
      itemId: 99,
      ingredients: [{ ingredientId: t.id, quantity: 0.04 }],
      choices: {},
    })
    const fixed = await owner.update('ingredients', t.id, {
      unit: 'pcs',
      purchaseUnit: 'pack',
      perPurchase: 50,
      costPerUnit: 0.14,
      lowStockAt: 50,
      rescale: 50,
    } as never)
    expect(fixed).toMatchObject({ unit: 'pcs', stock: 150, costPerUnit: 0.14, lowStockAt: 50 })
    expect('rescale' in fixed).toBe(false)
    expect((await owner.list('recipes')).find((x) => x.id === rec.id)!.ingredients[0].quantity).toBe(2)
  })
})
