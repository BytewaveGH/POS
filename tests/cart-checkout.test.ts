import { addLine, changeQty, normalizeStoredCart, sanitizeQty, setQty, stockIssues } from '@/app/[locale]/(stores)/stores/pos/_logics/cart'
import { buildSalePayload, parseInsufficientStock, submitSale } from '@/app/[locale]/(stores)/stores/pos/_logics/checkout'
import { axiosError, catalog } from './fixtures'

const [happyMan, alomo] = catalog
const bottle = alomo.units.find((u) => u.label === 'Bottle')!
const box = alomo.units.find((u) => u.label === 'Box')!

describe('cart', () => {
  it('keys lines by product unit: Box and Bottle of one product are separate lines, repeats merge', () => {
    let cart = addLine([], alomo, box)
    cart = addLine(cart, alomo, bottle)
    cart = addLine(cart, alomo, box)
    expect(cart.map((i) => [i.selectedUnit, i.quantity])).toEqual([
      ['22', 2],
      ['21', 1],
    ])
  })

  it('quantities are integers ≥ 1', () => {
    expect(sanitizeQty('3')).toBe(3)
    for (const bad of ['0', '-1', '1.5', 'abc', '']) expect(sanitizeQty(bad)).toBeNull()
    const cart = addLine([], happyMan, happyMan.units[0])
    expect(setQty(cart, cart[0].cartId, 2.5)).toBe(cart) // rejected, unchanged
    expect(setQty(cart, cart[0].cartId, 4)[0].quantity).toBe(4)
    expect(changeQty(cart, cart[0].cartId, -1)).toEqual([])
  })

  it('10. advisory stock check counts quantity × baseQuantity across Box + Bottle lines', () => {
    let cart = addLine([], alomo, box, 2) // 24 base units
    cart = addLine(cart, alomo, bottle, 3) // + 3 = 27
    expect(stockIssues(cart, { '5': 30 })).toEqual({})
    expect(stockIssues(cart, { '5': 20 })).toEqual({ '5': { need: 27, have: 20 } })
  })

  it('carts saved before baseQuantity existed are upgraded on load', () => {
    const [line] = normalizeStoredCart([{ cartId: '5_22', selectedUnit: '22', productId: '5', quantity: 2 }])
    expect(line.baseQuantity).toBe(1)
    expect(normalizeStoredCart('garbage')).toEqual([])
  })
})

const ADMIN = { accountType: 'admin', userId: 1 }
const EMPLOYEE = { accountType: 'employee', userId: 42 }

describe('checkout', () => {
  const cart = addLine(addLine([], alomo, box, 2), alomo, bottle, 3)

  it('12. the sale payload carries no price fields', () => {
    const payload = buildSalePayload(cart, { paymentType: 'cash', warehouseId: 1, customerType: 'retail', user: ADMIN })
    expect(payload).toEqual({
      paymentType: 'cash',
      warehouseId: 1,
      items: [
        { productUnitId: 22, quantity: 2, pricingType: 'retail' },
        { productUnitId: 21, quantity: 3, pricingType: 'retail' },
      ],
    })
    expect(JSON.stringify(payload)).not.toMatch(/price"|unitPrice|subtotal|totalAmount/i)
  })

  it('employeeId: sent for an employee session, absent for an admin session', () => {
    const opts = { paymentType: 'cash' as const, warehouseId: 1, customerType: 'retail' as const }
    expect(buildSalePayload(cart, { ...opts, user: EMPLOYEE }).employeeId).toBe(42)
    expect(buildSalePayload(cart, { ...opts, user: ADMIN })).not.toHaveProperty('employeeId')
    expect(buildSalePayload(cart, { ...opts, user: null })).not.toHaveProperty('employeeId')
    // Malformed employee session → no attribution rather than a bogus id.
    expect(buildSalePayload(cart, { ...opts, user: { accountType: 'employee' } })).not.toHaveProperty('employeeId')
  })

  it('11a. success returns the server totals for the receipt', async () => {
    const request = vi.fn().mockResolvedValue({
      data: {
        status: true,
        data: {
          id: 9,
          paymentType: 'cash',
          totalAmount: 125,
          items: [
            { productUnitId: 22, productName: 'Alomo Bitters', unitName: 'Box', quantity: 2, unitPrice: 55, subtotal: 110 },
            { productUnitId: 21, productName: 'Alomo Bitters', unitName: 'Bottle', quantity: 3, unitPrice: 5, subtotal: 15 },
          ],
        },
      },
    })
    const result = await submitSale(
      request,
      buildSalePayload(cart, { paymentType: 'cash', warehouseId: 1, customerType: 'retail', user: ADMIN })
    )
    expect(result).toMatchObject({
      ok: true,
      receipt: {
        totalAmount: 125,
        items: [
          { unitPrice: 55, subtotal: 110 },
          { unitPrice: 5, subtotal: 15 },
        ],
      },
    })
  })

  it('11b. 409 insufficient stock identifies the product to highlight', async () => {
    const request = vi.fn().mockRejectedValue(axiosError(409, { error: 'insufficient stock for product 5: have 20, need 27 base units' }))
    const result = await submitSale(
      request,
      buildSalePayload(cart, { paymentType: 'cash', warehouseId: 1, customerType: 'retail', user: ADMIN })
    )
    expect(result).toMatchObject({ ok: false, kind: 'stock', productId: '5' })
    expect(parseInsufficientStock('insufficient stock for product 12: have 20, need 27 base units')).toEqual({
      productId: '12',
      have: 20,
      need: 27,
    })
  })

  it('11c. 422 is reported as an invalid cart', async () => {
    const request = vi.fn().mockRejectedValue(axiosError(422, { error: 'unknown productUnitId 999' }))
    const result = await submitSale(
      request,
      buildSalePayload(cart, { paymentType: 'cash', warehouseId: 1, customerType: 'retail', user: ADMIN })
    )
    expect(result).toMatchObject({ ok: false, kind: 'invalid', message: expect.stringContaining('unknown productUnitId 999') })
  })
})
