import { averageCost, lineUsage, profitReport, usageCost } from '@/lib/eatery/costing'
import { createLocalSource } from '@/lib/eatery/data-source'
import type { Ingredient, Order, Recipe, StorefrontBundle } from '@/lib/eatery/types'

const memory = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}
// Wednesday 21 Oct 2026, 13:00 — Blaze is open.
const NOW = () => new Date(2026, 9, 21, 13, 0)

const setup = async () => {
  const storage = memory()
  await createLocalSource(null, storage, NOW).directory()
  const owner = createLocalSource('acme', storage, NOW)
  const restaurants = await owner.claimDemo!()
  const blaze = restaurants.find((r) => r.slug === 'blaze-pizza-shawarma')!
  const pub = createLocalSource(null, storage, NOW)
  const bundle = (await pub.storefront('blaze-pizza-shawarma')) as StorefrontBundle
  const ing = async (name: string) => (await owner.list('ingredients')).find((i) => i.restaurantId === blaze.id && i.name === name)!
  const item = (name: string) => bundle.items.find((i) => i.name === name)!
  return { storage, owner, pub, blaze, bundle, ing, item }
}

describe('ingredient maths', () => {
  it('weighted average cost on purchase', () => {
    expect(averageCost({ stock: 1000, costPerUnit: 0.1 }, 1000, 200)).toBe(0.15)
    expect(averageCost({ stock: -50, costPerUnit: 0.1 }, 1000, 200)).toBe(0.2) // negative stock counts as none
  })

  it('a line uses the item recipe, its options and its combo picks', () => {
    const recipes = new Map<number, Recipe>([
      [
        1,
        {
          id: 1,
          restaurantId: 1,
          itemId: 1,
          ingredients: [{ ingredientId: 10, quantity: 200 }],
          choices: { large: [{ ingredientId: 10, quantity: 100 }], cheese: [{ ingredientId: 11, quantity: 50 }] },
        },
      ],
      [2, { id: 2, restaurantId: 1, itemId: 2, ingredients: [{ ingredientId: 12, quantity: 1 }], choices: {} }],
    ])
    const u = lineUsage({ itemId: 1, quantity: 2, choices: { size: ['large'], extras: ['cheese'] }, comboPicks: { drink: 2 } }, recipes)
    expect(Object.fromEntries(u)).toEqual({ 10: 600, 11: 100, 12: 2 })
    const ings = new Map<number, Ingredient>([
      [10, { id: 10, restaurantId: 1, name: 'Dough', unit: 'g', costPerUnit: 0.02, stock: 0, lowStockAt: 0 }],
      [11, { id: 11, restaurantId: 1, name: 'Cheese', unit: 'g', costPerUnit: 0.12, stock: 0, lowStockAt: 0 }],
      [12, { id: 12, restaurantId: 1, name: 'Coke', unit: 'bottle', costPerUnit: 8, stock: 0, lowStockAt: 0 }],
    ])
    expect(usageCost(u, ings)).toBe(12 + 12 + 16)
  })

  it('profit = sales − ingredients used − waste − running costs', () => {
    const order = (total: number, cost: number | undefined, at: string, status: Order['status'] = 'completed') =>
      ({
        id: Math.random(),
        total,
        costOfGoods: cost,
        createdAt: at,
        status,
        lines: [{ itemId: 1, quantity: 1, choices: {}, name: 'x', summary: '', unitPrice: total, discountPerUnit: 0, lineTotal: total }],
      }) as unknown as Order
    const rep = profitReport(
      {
        orders: [
          order(100, 30, '2026-10-20T12:00:00'),
          order(50, undefined, '2026-10-21T12:00:00'),
          order(999, 1, '2026-10-21T12:00:00', 'cancelled'),
          order(70, 20, '2026-09-01T12:00:00'),
        ],
        stockMoves: [
          { id: 1, restaurantId: 1, ingredientId: 1, type: 'waste', quantity: -10, totalCost: 5, date: '2026-10-05' },
          { id: 2, restaurantId: 1, ingredientId: 1, type: 'purchase', quantity: 100, totalCost: 400, date: '2026-10-05' },
        ],
        expenses: [{ id: 1, restaurantId: 1, category: 'gas', amount: 20, date: '2026-10-02' }],
        recipes: [],
      },
      new Date(2026, 9, 1),
      new Date(2026, 10, 1)
    )
    expect(rep).toMatchObject({
      sales: 150,
      orders: 2,
      costOfGoods: 30,
      waste: 5,
      expenses: 20,
      spentOnStock: 400,
      grossProfit: 120,
      netProfit: 95,
      uncostedLines: 2,
    })
  })
})

describe('stock follows purchases, waste, counts and orders', () => {
  it('purchase raises stock and averages the cost; waste and counts adjust it', async () => {
    const { owner, blaze, ing } = await setup()
    const cheese = await ing('Mozzarella') // 8000 g at ₵0.12
    await owner.create('stockMoves', {
      restaurantId: blaze.id,
      ingredientId: cheese.id,
      type: 'purchase',
      quantity: 2000,
      totalCost: 320,
      date: '2026-10-21',
    })
    expect(await ing('Mozzarella')).toMatchObject({ stock: 10000, costPerUnit: 0.128 })
    await owner.create('stockMoves', {
      restaurantId: blaze.id,
      ingredientId: cheese.id,
      type: 'waste',
      quantity: 500,
      totalCost: 0,
      date: '2026-10-21',
      note: 'dropped',
    })
    expect((await ing('Mozzarella')).stock).toBe(9500)
    const waste = (await owner.list('stockMoves')).find((m) => m.type === 'waste')!
    expect(waste).toMatchObject({ quantity: -500, totalCost: 64 })
    await owner.create('stockMoves', {
      restaurantId: blaze.id,
      ingredientId: cheese.id,
      type: 'count',
      quantity: 9000,
      totalCost: 0,
      date: '2026-10-21',
    })
    expect((await ing('Mozzarella')).stock).toBe(9000)
    await expect(owner.remove('stockMoves', waste.id)).rejects.toMatchObject({ response: { status: 422 } })
  })

  it('accepting an online order takes its ingredients out of stock and costs it; cancelling puts them back', async () => {
    const { owner, pub, item, ing } = await setup()
    const pizza = item('Pepperoni Feast')
    const [size, crust, toppings] = pizza.optionGroups
    const large = size.choices.find((c) => c.name.startsWith('Large'))!
    const extra = toppings.choices.find((c) => c.name === 'Extra cheese')!
    const o = await pub.placeOrder('blaze-pizza-shawarma', {
      lines: [
        { itemId: pizza.id, quantity: 2, choices: { [size.id]: [large.id], [crust.id]: [crust.choices[0].id], [toppings.id]: [extra.id] } },
      ],
      customer: { name: 'Ama', phone: '0241234567' },
      fulfilment: { type: 'pickup' },
      payment: { method: 'cash' },
    })
    // Not yet: a placed order hasn't been accepted.
    expect((await ing('Mozzarella')).stock).toBe(8000)
    const accepted = await owner.update('orders', o.id, { status: 'accepted' })
    // One large with extra cheese: 110 + 120 + 60 = 290 g mozzarella, × 2.
    expect((await ing('Mozzarella')).stock).toBe(8000 - 580)
    expect((await ing('Pizza box')).stock).toBe(78)
    // 2 × (dough 450×0.02 + cheese 290×0.12 + sauce 70×0.03 + pepperoni 180×0.15 + box 3) = 2 × 75.9
    expect(accepted.lines[0].unitCost).toBe(75.9)
    expect(accepted).toMatchObject({ stockDeducted: true, costOfGoods: 151.8 })
    await owner.update('orders', o.id, { status: 'preparing' })
    expect((await ing('Mozzarella')).stock).toBe(7420) // only once
    await owner.update('orders', o.id, { status: 'cancelled' })
    expect((await ing('Mozzarella')).stock).toBe(8000)
  })

  it('a shawarma with beef swaps the chicken for beef', async () => {
    const { owner, pub, item, ing } = await setup()
    const sh = item('Classic Shawarma')
    const protein = sh.optionGroups.find((g) => g.name === 'Protein')!
    const beef = protein.choices.find((c) => c.name === 'Beef')!
    const pepper = sh.optionGroups.find((g) => g.name === 'Pepper')!
    const o = await pub.placeOrder('blaze-pizza-shawarma', {
      lines: [{ itemId: sh.id, quantity: 1, choices: { [protein.id]: [beef.id], [pepper.id]: [pepper.choices[0].id] } }],
      customer: { name: 'Kofi', phone: '0201234567' },
      fulfilment: { type: 'pickup' },
      payment: { method: 'cash' },
    })
    await owner.update('orders', o.id, { status: 'accepted' })
    expect((await ing('Chicken')).stock).toBe(9000)
    expect((await ing('Beef')).stock).toBe(5850)
    expect((await ing('Pita bread')).stock).toBe(119)
  })

  it('a counter order is priced, accepted, paid and taken out of stock at once', async () => {
    const { owner, blaze, item, ing } = await setup()
    const coke = item('Coca-Cola')
    const fries = item('Fries')
    const o = await owner.createCounterOrder(blaze.id, {
      lines: [
        { itemId: coke.id, quantity: 2, choices: {} },
        { itemId: fries.id, quantity: 1, choices: {} },
      ],
      fulfilment: { type: 'pickup' },
      payment: { method: 'cash', paid: true, tendered: 100 },
    })
    expect(o).toMatchObject({
      channel: 'counter',
      status: 'accepted',
      total: 55,
      tendered: 100,
      payment: { method: 'cash', status: 'paid' },
      customer: { name: 'Walk-in' },
      stockDeducted: true,
    })
    expect(o.costOfGoods).toBe(16 + 3.75 + 1.2)
    expect((await ing('Coca-Cola 350ml')).stock).toBe(46)
    expect(o.accessKey).toHaveLength(16)
  })

  it('an ingredient used in a recipe can’t be deleted', async () => {
    const { owner, ing } = await setup()
    await expect(owner.remove('ingredients', (await ing('Mozzarella')).id)).rejects.toMatchObject({ response: { status: 409 } })
  })

  it('recipes and costs never reach the public menu', async () => {
    const { bundle } = await setup()
    expect(JSON.stringify(bundle)).not.toMatch(/costPerUnit|ingredientId|costOfGoods/)
  })
})
