import { contrast, ensureContrast } from '@/lib/eatery/color'
import { fixContrast, resolveTheme } from '@/lib/eatery/theme'
import { PRESETS, presetFor } from '@/lib/eatery/presets'
import { bestPromotion, choiceProblems, inWindow, itemAvailability, linePrice, openState, priceOrder } from '@/lib/eatery/menu'
import { createLocalSource, DEMO_SCOPE } from '@/lib/eatery/data-source'
import type { MenuItem, Promotion, StorefrontBundle } from '@/lib/eatery/types'

const memory = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}
// Wednesday 21 Oct 2026, local time
const at = (hh: number, mm = 0, day = 21) => new Date(2026, 9, day, hh, mm)

describe('themes stay readable', () => {
  it.each(PRESETS.map((p) => [p.key]))('preset %s passes WCAG AA as shipped', (key) => {
    const r = resolveTheme(presetFor(key).theme)
    expect(r.checks.filter((c) => !c.pass).map((c) => `${c.label} ${c.ratio.toFixed(2)}`)).toEqual([])
  })

  it('bad owner colours are corrected when rendering, and "Fix contrast" stores the fix', () => {
    const t = { ...presetFor('cafe').theme, colors: { ...presetFor('cafe').theme.colors, text: '#C9B8A8', primary: '#F2D4B0' } }
    const r = resolveTheme(t)
    expect(r.checks.find((c) => c.id === 'text')!.pass).toBe(false)
    expect(contrast(r.palette.text, r.palette.background)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(r.palette.primaryText, r.palette.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(r.palette.onPrimary, r.palette.primary)).toBeGreaterThanOrEqual(4.5)
    expect(resolveTheme(fixContrast(t)).checks.every((c) => c.pass || c.id === 'button' || c.id === 'shape')).toBe(true)
  })

  it('ensureContrast keeps a passing colour and moves a failing one', () => {
    expect(ensureContrast('#111111', '#ffffff', 4.5)).toBe('#111111')
    expect(contrast(ensureContrast('#777777', '#888888', 4.5), '#888888')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('time-based rules', () => {
  it('overnight windows belong to the day they start', () => {
    const w = { days: [5], from: '22:00', to: '02:00' } // Friday night
    expect(inWindow(w, new Date(2026, 9, 23, 23, 0))).toBe(true) // Fri 23:00
    expect(inWindow(w, new Date(2026, 9, 24, 1, 30))).toBe(true) // Sat 01:30
    expect(inWindow(w, new Date(2026, 9, 24, 23, 0))).toBe(false) // Sat 23:00
  })

  it('open state says until when, or when it opens next', () => {
    const hours = { 0: [], 1: [], 2: [], 3: [{ open: '17:00', close: '02:00' }], 4: [], 5: [], 6: [] }
    expect(openState(hours, at(18))).toEqual({ open: true, label: 'Open until 2am' })
    expect(openState(hours, at(12))).toEqual({ open: false, label: 'Opens 5pm' })
    expect(openState(hours, new Date(2026, 9, 22, 1, 0))).toMatchObject({ open: true })
  })

  const cocktail: MenuItem = {
    id: 1,
    restaurantId: 1,
    categoryId: 10,
    name: 'Mojito',
    price: 80,
    tags: [],
    status: 'available',
    position: 0,
    optionGroups: [
      {
        id: 'serve',
        name: 'Serve',
        kind: 'variant',
        min: 1,
        max: 1,
        choices: [
          { id: 's', name: 'Single', priceDelta: 0 },
          { id: 'd', name: 'Double', priceDelta: 35 },
        ],
      },
      {
        id: 'x',
        name: 'Extras',
        kind: 'addon',
        min: 0,
        max: 2,
        choices: [
          { id: 'a', name: 'Mint', priceDelta: 5 },
          { id: 'b', name: 'Shot', priceDelta: 30 },
          { id: 'c', name: 'Sugar', priceDelta: 0, soldOut: true },
        ],
      },
    ],
  }
  const happyHour: Promotion = {
    id: 1,
    restaurantId: 1,
    name: 'Happy hour',
    percentOff: 25,
    schedule: [{ days: [1, 2, 3, 4, 5], from: '17:00', to: '19:00' }],
    categoryIds: [10],
    itemIds: [],
    active: true,
  }

  it('happy hour applies only in its window and only to its sections', () => {
    expect(bestPromotion(cocktail, [happyHour], at(18))?.name).toBe('Happy hour')
    expect(bestPromotion(cocktail, [happyHour], at(20))).toBeUndefined()
    expect(bestPromotion({ ...cocktail, categoryId: 11 }, [happyHour], at(18))).toBeUndefined()
    expect(bestPromotion(cocktail, [{ ...happyHour, active: false }], at(18))).toBeUndefined()
  })

  it('price = base + choices, then the deal', () => {
    const choices = { serve: ['d'], x: ['a', 'b'] }
    expect(linePrice(cocktail, choices, undefined, [], at(12))).toMatchObject({ base: 150, unitPrice: 150, discountPerUnit: 0 })
    expect(linePrice(cocktail, choices, undefined, [happyHour], at(18))).toMatchObject({
      base: 150,
      discountPerUnit: 37.5,
      unitPrice: 112.5,
    })
  })

  it('choices are checked against min/max and sold-out options', () => {
    expect(choiceProblems(cocktail, {})).toEqual({ serve: 'Choose a serve' })
    expect(choiceProblems(cocktail, { serve: ['s'], x: ['a', 'b', 'c'] })).toEqual({})
    expect(choiceProblems({ ...cocktail, optionGroups: [{ ...cocktail.optionGroups[1], max: 1 }] }, { x: ['a', 'b'] })).toEqual({
      x: 'Choose at most 1',
    })
  })

  it('items and sections can be limited to certain times', () => {
    const breakfast = {
      id: 10,
      restaurantId: 1,
      name: 'Breakfast',
      position: 0,
      schedule: [{ days: [0, 1, 2, 3, 4, 5, 6], from: '07:00', to: '11:30' }],
    }
    expect(itemAvailability(cocktail, breakfast, at(9)).orderable).toBe(true)
    expect(itemAvailability(cocktail, breakfast, at(12))).toMatchObject({ orderable: false, reason: 'not-now', label: 'Daily 7am–11:30am' })
    expect(itemAvailability({ ...cocktail, status: 'sold-out' }, undefined, at(9))).toMatchObject({ orderable: false, reason: 'sold-out' })
  })
})

describe('orders are priced by the platform, never by the customer', () => {
  const store = async () => {
    const storage = memory()
    const pub = createLocalSource(null, storage, () => at(13))
    const bundle = (await pub.storefront('blaze-pizza-shawarma')) as StorefrontBundle
    return { storage, pub, bundle }
  }
  const pick = (b: StorefrontBundle, name: string) => b.items.find((i) => i.name === name)!

  it('the examples are there the first time anyone opens the directory', async () => {
    const pub = createLocalSource(null, memory())
    const list = await pub.directory()
    expect(list.map((r) => r.slug)).toEqual(['velvet-hour', 'blaze-pizza-shawarma', 'kofi-and-crumb'])
    expect(list.every((r) => r.ownerScope === DEMO_SCOPE)).toBe(true)
    expect(new Set(list.map((r) => r.theme.hero)).size).toBe(3)
  })

  it('prices a pizza with size, crust and toppings, plus delivery', async () => {
    const { pub, bundle } = await store()
    const pizza = pick(bundle, 'Pepperoni Feast')
    const [size, crust, toppings] = pizza.optionGroups
    const large = size.choices.find((c) => c.name.startsWith('Large'))!
    const stuffed = crust.choices.find((c) => c.name.startsWith('Cheese'))!
    const extra = toppings.choices.slice(0, 2)
    const order = await pub.placeOrder('blaze-pizza-shawarma', {
      lines: [
        {
          itemId: pizza.id,
          quantity: 2,
          choices: { [size.id]: [large.id], [crust.id]: [stuffed.id], [toppings.id]: extra.map((c) => c.id) },
        },
      ],
      customer: { name: 'Ama', phone: '0241234567' },
      fulfilment: { type: 'delivery', address: 'House 4, Lagos Ave' },
      payment: { method: 'cash' },
    })
    const unit = 85 + large.priceDelta + stuffed.priceDelta + extra[0].priceDelta + extra[1].priceDelta
    expect(order.lines[0]).toMatchObject({ unitPrice: unit, lineTotal: unit * 2 })
    expect(order.lines[0].summary).toContain('Large')
    expect(order).toMatchObject({
      subtotal: unit * 2,
      deliveryFee: 15,
      total: unit * 2 + 15,
      status: 'placed',
      payment: { status: 'unpaid' },
    })
    expect(order.code).toMatch(/^[A-Z2-9]{4}$/)
  })

  it('a combo charges the combo price plus upcharges', async () => {
    const { pub, bundle } = await store()
    const meal = pick(bundle, 'Shawarma Meal')
    const [main, side, drink] = meal.combo!.slots
    const loaded = side.choices.find((c) => c.upcharge === 12)!
    const order = await pub.placeOrder('blaze-pizza-shawarma', {
      lines: [
        {
          itemId: meal.id,
          quantity: 1,
          choices: {},
          comboPicks: { [main.id]: main.choices[0].itemId, [side.id]: loaded.itemId, [drink.id]: drink.choices[0].itemId },
        },
      ],
      customer: { name: 'Kofi', phone: '0201234567' },
      fulfilment: { type: 'pickup', pickupAt: 'asap' },
      payment: { method: 'momo', reference: 'TX123' },
    })
    expect(order.total).toBe(97)
    expect(order.payment.status).toBe('pending')
  })

  it('rejects incomplete choices, closed hours and below-minimum delivery', async () => {
    const { storage, pub, bundle } = await store()
    const pizza = pick(bundle, 'Margherita')
    const base = { customer: { name: 'A', phone: '0241234567' }, payment: { method: 'cash' as const } }
    await expect(
      pub.placeOrder('blaze-pizza-shawarma', {
        ...base,
        lines: [{ itemId: pizza.id, quantity: 1, choices: {} }],
        fulfilment: { type: 'pickup' },
      })
    ).rejects.toMatchObject({ response: { status: 422 } })
    const fries = pick(bundle, 'Fries')
    await expect(
      pub.placeOrder('blaze-pizza-shawarma', {
        ...base,
        lines: [{ itemId: fries.id, quantity: 1, choices: {} }],
        fulfilment: { type: 'delivery', address: 'x' },
      })
    ).rejects.toThrow(/minimum order/)
    const night = createLocalSource(null, storage, () => at(4))
    await expect(
      night.placeOrder('blaze-pizza-shawarma', {
        ...base,
        lines: [{ itemId: fries.id, quantity: 3, choices: {} }],
        fulfilment: { type: 'pickup' },
      })
    ).rejects.toMatchObject({ response: { status: 409 } })
  })

  it('only the device with the order key can follow it', async () => {
    const { pub, bundle } = await store()
    const fries = pick(bundle, 'Fries')
    const o = await pub.placeOrder('blaze-pizza-shawarma', {
      lines: [{ itemId: fries.id, quantity: 1, choices: {} }],
      customer: { name: 'A', phone: '0241234567' },
      fulfilment: { type: 'pickup' },
      payment: { method: 'cash' },
    })
    expect((await pub.trackOrder({ slug: 'blaze-pizza-shawarma', code: o.code, accessKey: o.accessKey }))?.code).toBe(o.code)
    expect(await pub.trackOrder({ slug: 'blaze-pizza-shawarma', code: o.code, accessKey: 'guess' })).toBeNull()
  })
})

describe('owners see only their own restaurants', () => {
  it('claiming the examples, scoping, and cascades', async () => {
    const storage = memory()
    await createLocalSource(null, storage).directory()
    const acme = createLocalSource('acme', storage)
    const other = createLocalSource('other', storage)
    expect(await acme.list('restaurants')).toEqual([])
    const mine = await acme.claimDemo!()
    expect(mine).toHaveLength(3)
    expect((await acme.list('restaurants')).length).toBe(3)
    expect(await other.list('items')).toEqual([])
    await expect(other.update('restaurants', mine[0].id, { name: 'Hijack' })).rejects.toMatchObject({ response: { status: 404 } })
    await expect(acme.create('restaurants', { ...mine[0], slug: 'kofi-and-crumb' } as never)).rejects.toMatchObject({
      response: { status: 409 },
    })

    // Deleting a section deletes its items and takes them out of combos.
    const cafe = mine.find((r) => r.slug === 'kofi-and-crumb')!
    const cats = (await acme.list('categories')).filter((c) => c.restaurantId === cafe.id)
    const pastries = cats.find((c) => c.name === 'Pastries & cakes')!
    const coffee = cats.find((c) => c.name === 'Coffee')!
    await acme.remove('categories', coffee.id)
    const items = (await acme.list('items')).filter((i) => i.restaurantId === cafe.id)
    expect(items.some((i) => i.categoryId === coffee.id)).toBe(false)
    const combo = items.find((i) => i.name === 'Coffee & Pastry')!
    expect(combo.categoryId).toBe(pastries.id)
    expect(combo.combo!.slots[0].choices).toEqual([])
  })
})
