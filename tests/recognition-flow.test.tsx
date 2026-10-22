import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { useRecognitionFlow } from '@/app/[locale]/(stores)/stores/pos/_widgets/scanner/use-recognition-flow'
import { lookupBarcode, parseRecognition, type RecognitionResult } from '@/app/[locale]/(stores)/stores/pos/_logics/scanner/recognition'
import { decideOutcome } from '@/app/[locale]/(stores)/stores/pos/_logics/scanner/outcome'
import { addLine, undoAdd } from '@/app/[locale]/(stores)/stores/pos/_logics/cart'
import { BOTTLE, BOX, PIECE, axiosError, catalog, matchedRaw } from './fixtures'

const mocks = vi.hoisted(() => ({ request: vi.fn(), canManageProducts: true }))
vi.mock('@/hooks/use-axios', () => ({ useAxios: () => mocks.request }))
vi.mock('@/hooks/use-permissions', () => ({ usePermissions: () => ({ canManageProducts: mocks.canManageProducts }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

let flow: ReturnType<typeof useRecognitionFlow>
const onAdd = vi.fn()
const onUndo = vi.fn()

const Harness = () => {
  flow = useRecognitionFlow({ products: catalog, customerType: 'retail', onAdd, onUndo })
  return <div>{flow.prompts}</div>
}

const run = (raw: Record<string, unknown>) => {
  render(<Harness />)
  act(() => {
    flow.handleResult(parseRecognition(raw))
  })
}

const added = () => onAdd.mock.calls.map(([p, u]) => `${p.id}:${u.unit}`)
const confirmCalls = () => mocks.request.mock.calls.map(([c]) => c).filter((c) => /\/confirm$/.test(c.url))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.request.mockResolvedValue({ data: { status: true } })
  mocks.canManageProducts = true
})

describe('recognition flow', () => {
  it('1. matched + unit at/above threshold auto-adds, and Undo removes it', () => {
    run(matchedRaw({ confidence: 0.97 }))
    expect(added()).toEqual(['3:11'])
    expect(screen.queryByText('Is this right?')).toBeNull()

    const [, options] = vi.mocked(toast.success).mock.calls[0] as any
    expect(options.description).toContain('Piece')
    options.action.onClick()
    expect(onUndo).toHaveBeenCalledWith('3_11')
    // A correct match is not a correction — no learning-loop call.
    expect(confirmCalls()).toHaveLength(0)

    // Undo on the cart itself removes the single added unit.
    const product = catalog[0]
    expect(undoAdd(addLine([], product, product.units[0]), '3_11')).toEqual([])
  })

  it('2. matched + unit below threshold shows a confirm card; nothing added until tapped', () => {
    run(matchedRaw({ confidence: 0.85 }))
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByText('Is this right?')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Add Piece/ }))
    expect(added()).toEqual(['3:11'])
  })

  it('3. matched + unit null shows the unit chooser and adds the chosen productUnitId', () => {
    run(
      matchedRaw({
        product: { id: 5, name: 'Alomo Bitters', category: 'bottles' },
        unit: null,
        units: [BOTTLE, BOX],
        unitResolution: 'ambiguous',
        candidates: [{ productId: 5, name: 'Alomo Bitters', confidence: 0.95, signals: ['name'], units: [BOTTLE, BOX] }],
      })
    )
    expect(screen.getByText('How are you selling this?')).toBeTruthy()
    expect(screen.getByText('= 12 pieces')).toBeTruthy()
    expect(onAdd).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Box/ }))
    expect(added()).toEqual(['5:22'])
  })

  it('4. ambiguous shows candidates; picking one adds it and confirms with the right ids', () => {
    run(
      matchedRaw({
        recognitionId: 77,
        status: 'ambiguous',
        matched: false,
        confidence: 0.6,
        product: null,
        unit: null,
        units: [],
        candidates: [
          { productId: 3, name: 'Happy Man', confidence: 0.61, signals: ['name'], units: [PIECE] },
          // Not in the loaded catalog — the candidate's own units are used.
          { productId: 4, name: 'Happy Man Blue', confidence: 0.58, signals: ['alias'], units: [{ ...PIECE, id: 12 }] },
        ],
      })
    )
    expect(onAdd).not.toHaveBeenCalled() // never auto-add on ambiguous
    expect(screen.getByText('Which product is this?')).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: /Piece/ })[1])
    expect(added()).toEqual(['4:12'])
    expect(confirmCalls()).toEqual([
      expect.objectContaining({ method: 'POST', url: '/pos/products/recognitions/77/confirm', data: { productId: 4, productUnitId: 12 } }),
    ])
  })

  it('5. not_found opens manual search pre-filled; picking a product confirms', () => {
    run(
      matchedRaw({
        recognitionId: 88,
        status: 'not_found',
        matched: false,
        confidence: 0,
        product: null,
        unit: null,
        units: [],
        candidates: [],
        extractedText: ['HAPPY', 'MAN'],
      })
    )
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByText('Product not recognised')).toBeTruthy()
    expect((screen.getByLabelText('Search products') as HTMLInputElement).value).toBe('HAPPY MAN')

    fireEvent.click(screen.getByText('Happy Man'))
    expect(added()).toEqual(['3:11'])
    expect(confirmCalls()).toEqual([
      expect.objectContaining({ url: '/pos/products/recognitions/88/confirm', data: { productId: 3, productUnitId: 11 } }),
    ])
  })

  it('6a. barcode 200 with a unit adds that unit', async () => {
    mocks.request.mockResolvedValueOnce({
      data: {
        status: true,
        data: matchedRaw({
          confidence: 0.99,
          product: { id: 5, name: 'Alomo Bitters', category: 'bottles' },
          unit: BOX,
          units: [BOTTLE, BOX],
          unitResolution: 'barcode',
          barcode: '6001234567899',
          barcodeMatched: true,
          candidates: [{ productId: 5, name: 'Alomo Bitters', confidence: 0.99, signals: ['barcode'], units: [BOTTLE, BOX] }],
        }),
      },
    })
    const result = await lookupBarcode(mocks.request, '6001234567899')
    expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ method: 'GET', url: '/pos/products/barcode/6001234567899' }))
    expect(decideOutcome(result, 0.9).kind).toBe('auto-add')

    render(<Harness />)
    act(() => {
      flow.handleResult(result)
    })
    expect(added()).toEqual(['5:22'])
  })

  it('6b. barcode 404 offers linking (product managers) and manual search', async () => {
    mocks.request.mockRejectedValueOnce(axiosError(404, { data: { status: 'not_found', barcode: '123456789012' } }))
    const result: RecognitionResult = await lookupBarcode(mocks.request, '123456789012')
    expect(result.status).toBe('not_found')
    expect(result.barcode).toBe('123456789012')

    const { unmount } = render(<Harness />)
    act(() => {
      flow.handleResult(result)
    })
    expect(screen.getByText('Barcode not in your catalog')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Link to a product/ })).toBeTruthy()
    expect(screen.getByLabelText('Search products')).toBeTruthy()
    unmount()

    mocks.canManageProducts = false
    render(<Harness />)
    act(() => {
      flow.handleResult(result)
    })
    expect(screen.queryByRole('button', { name: /Link to a product/ })).toBeNull()
  })
})
