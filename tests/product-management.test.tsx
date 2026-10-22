import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProductRecognition from '@/app/[locale]/(stores)/stores/products/inventory/_widgets/_forms/product-recognition'
import {
  buildCreateProductPayload,
  buildUnitPayload,
  buildUpdateProductPayload,
  isDuplicateSkuError,
  productSaveErrorMessage,
  type ProductFormValues,
} from '@/app/[locale]/(stores)/stores/products/inventory/_logics/product-payload'
import { axiosError } from './fixtures'

const mocks = vi.hoisted(() => ({ request: vi.fn(), canManageProducts: true }))
vi.mock('@/hooks/use-axios', () => ({ useAxios: () => mocks.request }))
vi.mock('@/hooks/use-permissions', () => ({ usePermissions: () => ({ canManageProducts: mocks.canManageProducts }) }))

const form: ProductFormValues = {
  name: 'Alomo Bitters',
  category: 'bottles',
  purchasePrice: 3,
  brand: ' Kasapreko ',
  sku: 'ALOMO-200',
  imageUrl: 'https://img/alomo.jpg',
  aliases: ['Alomo', ' Alomo Sachet ', 'Alomo', ''],
  units: [
    { unitId: 2, retailPrice: 5, wholesalePrice: 4.5, pricingRule: 'flat', baseQuantity: 1, barcodes: ['6001234567899'] },
    { unitId: 3, retailPrice: 55, wholesalePrice: 50, pricingRule: 'flat', baseQuantity: 12, barcodes: [] },
  ],
  stock: [{ warehouseId: 1, quantity: 240 }],
}

describe('13. product form payloads', () => {
  it('create sends brand/sku/imageUrl/aliases and per-unit baseQuantity/barcodes', () => {
    const body = buildCreateProductPayload(form)
    expect(body).toMatchObject({
      brand: 'Kasapreko',
      sku: 'ALOMO-200',
      imageUrl: 'https://img/alomo.jpg',
      aliases: ['Alomo', 'Alomo Sachet'],
    })
    expect(body.units[0]).toMatchObject({ unitId: 2, baseQuantity: 1, barcodes: ['6001234567899'] })
    expect(body.units[1]).toMatchObject({ unitId: 3, baseQuantity: 12 })
    expect(body.units[1]).not.toHaveProperty('barcodes')
  })

  it('update omits untouched brand/sku/imageUrl, sends changed ones, and "" to clear the SKU', () => {
    const initial = { brand: 'Kasapreko', sku: 'ALOMO-200', imageUrl: 'https://img/alomo.jpg' }

    const untouched = buildUpdateProductPayload(form, initial)
    expect(untouched).not.toHaveProperty('brand')
    expect(untouched).not.toHaveProperty('sku')
    expect(untouched).not.toHaveProperty('imageUrl')

    const changed = buildUpdateProductPayload({ ...form, brand: 'Kasapreko Ltd', sku: '  ' }, initial)
    expect(changed).toMatchObject({ brand: 'Kasapreko Ltd', sku: '' })
    expect(changed).not.toHaveProperty('imageUrl')

    // Never aliases/barcodes on update — they have their own endpoints.
    expect(changed).not.toHaveProperty('aliases')
    expect(JSON.stringify(changed)).not.toMatch(/barcodes/)
    expect(buildUnitPayload({ ...form.units[1], baseQuantity: undefined })).toMatchObject({ baseQuantity: 1 })
  })

  it('duplicate SKU is recognised from the planned 409 and from the current 500 constraint error', () => {
    expect(isDuplicateSkuError(axiosError(409, { error: 'SKU already in use' }))).toBe(true)
    expect(
      isDuplicateSkuError(axiosError(500, { error: 'duplicate key value violates unique constraint "products_tenant_sku_key"' }))
    ).toBe(true)
    expect(isDuplicateSkuError(axiosError(500, { error: 'boom' }))).toBe(false)
    expect(isDuplicateSkuError(axiosError(422, { error: 'sku too long' }))).toBe(false)
    expect(productSaveErrorMessage(axiosError(500, { error: 'boom' }))).toBe('boom')
  })
})

// ── Recognition data management panel ───────────────────────────────────────

const units = [
  { id: 21, name: 'Bottle' },
  { id: 22, name: 'Box' },
]

type Route = { method: string; url: RegExp; reply: () => unknown }
let routes: Route[] = []
const on = (method: string, url: RegExp, reply: () => unknown) => routes.push({ method, url, reply })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.canManageProducts = true
  routes = []
  on('GET', /\/aliases$/, () => [{ id: 1, alias: 'Alomo', source: 'manual', productUnitId: null }])
  on('GET', /\/alias-suggestions$/, () => [{ text: 'ALOMO BITTERS 200ML', occurrences: 4, similarity: 0.52 }])
  on('GET', /\/barcodes$/, () => [{ id: 7, code: '6001234567899', productUnitId: 21 }])
  mocks.request.mockImplementation(async (cfg: any) => {
    const route = routes.find((r) => r.method === cfg.method && r.url.test(cfg.url))
    if (!route) return { data: { status: true } }
    const data = route.reply()
    if (data instanceof Error) throw data
    return { data: { status: true, data } }
  })
})

const posts = (url: RegExp) => mocks.request.mock.calls.map(([c]) => c).filter((c: any) => c.method === 'POST' && url.test(c.url))

describe('14. aliases', () => {
  it('adds an alias tied to a unit, and deletes one', async () => {
    render(<ProductRecognition productId={5} units={units} />)
    await screen.findByText('Alomo')

    fireEvent.change(screen.getByLabelText('New alias'), { target: { value: 'Alomo Box' } })
    fireEvent.change(screen.getByLabelText('This name means a specific unit'), { target: { value: '22' } })
    fireEvent.click(screen.getAllByRole('button', { name: /Add$/ })[0])
    await waitFor(() => expect(posts(/\/products\/5\/aliases$/)).toHaveLength(1))
    expect(posts(/\/aliases$/)[0].data).toEqual({ alias: 'Alomo Box', source: 'manual', productUnitId: 22 })

    fireEvent.click(screen.getByRole('button', { name: 'Delete alias Alomo' }))
    await waitFor(() =>
      expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ method: 'DELETE', url: '/products/5/aliases/1' }))
    )
  })

  it('shows a clear message on 409 duplicate', async () => {
    on('POST', /\/aliases$/, () => axiosError(409, { error: 'alias exists' }))
    routes.unshift(routes.pop()!) // take precedence
    render(<ProductRecognition productId={5} units={units} />)
    await screen.findByText('Alomo')
    fireEvent.change(screen.getByLabelText('New alias'), { target: { value: 'alomo' } })
    fireEvent.click(screen.getAllByRole('button', { name: /Add$/ })[0])
    expect(await screen.findByText('“alomo” is already an alias for this product.')).toBeTruthy()
  })

  it('"Add as alias" on a suggestion sends source: "recognition" (never automatic)', async () => {
    render(<ProductRecognition productId={5} units={units} />)
    await screen.findByText('ALOMO BITTERS 200ML')
    expect(posts(/\/aliases$/)).toHaveLength(0) // nothing promoted on load
    fireEvent.click(screen.getByRole('button', { name: 'Add as alias' }))
    await waitFor(() => expect(posts(/\/aliases$/)).toHaveLength(1))
    expect(posts(/\/aliases$/)[0].data).toEqual({ alias: 'ALOMO BITTERS 200ML', source: 'recognition' })
  })
})

describe('15. barcodes', () => {
  it('adds a barcode bound to a unit', async () => {
    render(<ProductRecognition productId={5} units={units} />)
    await screen.findByText('6001234567899')
    fireEvent.change(screen.getByLabelText('New barcode'), { target: { value: '6001234567882' } })
    fireEvent.change(screen.getByLabelText('Unit the barcode is printed on'), { target: { value: '22' } })
    fireEvent.click(screen.getAllByRole('button', { name: /Add$/ })[1])
    await waitFor(() => expect(posts(/\/barcodes$/)).toHaveLength(1))
    expect(posts(/\/barcodes$/)[0]).toMatchObject({ url: '/products/5/barcodes', data: { code: '6001234567882', productUnitId: 22 } })
  })

  it.each([
    [409, 'That barcode is already registered (to this or another product).'],
    [422, 'Invalid barcode, or the unit belongs to another product.'],
  ])('handles %i', async (status, message) => {
    on('POST', /\/barcodes$/, () => axiosError(status, { error: 'x' }))
    routes.unshift(routes.pop()!)
    render(<ProductRecognition productId={5} units={units} />)
    await screen.findByText('6001234567899')
    fireEvent.change(screen.getByLabelText('New barcode'), { target: { value: '123' } })
    fireEvent.click(screen.getAllByRole('button', { name: /Add$/ })[1])
    expect(await screen.findByText(message)).toBeTruthy()
  })

  it('rejects invalid codes before calling the server', async () => {
    render(<ProductRecognition productId={5} units={units} />)
    await screen.findByText('6001234567899')
    fireEvent.change(screen.getByLabelText('New barcode'), { target: { value: 'has space' } })
    fireEvent.click(screen.getAllByRole('button', { name: /Add$/ })[1])
    expect(await screen.findByText(/1–64 printable characters/)).toBeTruthy()
    expect(posts(/\/barcodes$/)).toHaveLength(0)
  })
})

describe('16. permissions', () => {
  it('is hidden (and loads nothing) for employees without canManageProducts', () => {
    mocks.canManageProducts = false
    const { container } = render(<ProductRecognition productId={5} units={units} />)
    expect(container.innerHTML).toBe('')
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('still handles a 403 from the server gracefully', async () => {
    routes = []
    on('GET', /./, () => axiosError(403, { message: 'forbidden' }))
    render(<ProductRecognition productId={5} units={units} />)
    expect((await screen.findAllByText('You don’t have permission to manage products.')).length).toBeGreaterThan(0)
  })
})
