import { mapApiProduct } from '@/app/[locale]/(stores)/stores/pos/_logics/types'

export const PIECE = { id: 11, unitId: 1, name: 'Piece', price: 2, wholesalePrice: 1.8, pricingRule: 'flat', baseQuantity: 1 }
export const BOTTLE = { id: 21, unitId: 2, name: 'Bottle', price: 5, wholesalePrice: 4.5, pricingRule: 'flat', baseQuantity: 1 }
export const BOX = { id: 22, unitId: 3, name: 'Box', price: 55, wholesalePrice: 50, pricingRule: 'flat', baseQuantity: 12 }

// Catalog as GET /products returns it.
export const apiProducts = [
  {
    id: 3,
    name: 'Happy Man',
    brand: 'Happy Man',
    category: 'packs',
    imageUrl: 'https://img/hm.jpg',
    totalQuantity: 100,
    units: [{ id: 11, unitId: 1, unitName: 'Piece', retailPrice: 2, wholesalePrice: 1.8, pricingRule: 'flat', baseQuantity: 1 }],
  },
  {
    id: 5,
    name: 'Alomo Bitters',
    brand: 'Kasapreko',
    category: 'bottles',
    totalQuantity: 20,
    units: [
      { id: 21, unitId: 2, unitName: 'Bottle', retailPrice: 5, wholesalePrice: 4.5, pricingRule: 'flat', baseQuantity: 1 },
      { id: 22, unitId: 3, unitName: 'Box', retailPrice: 55, wholesalePrice: 50, pricingRule: 'flat', baseQuantity: 12 },
    ],
  },
]

export const catalog = apiProducts.map(mapApiProduct)

// Raw `data` of a recognition response.
export const matchedRaw = (overrides: Record<string, unknown> = {}) => ({
  recognitionId: 4294967301,
  status: 'matched',
  matched: true,
  confidence: 0.97,
  product: { id: 3, name: 'Happy Man', brand: 'Happy Man', category: 'packs', image: 'https://img/hm.jpg' },
  unit: PIECE,
  units: [PIECE],
  unitResolution: 'single_unit',
  barcodeMatched: false,
  extractedText: ['HAPPY', 'MAN'],
  candidates: [{ productId: 3, name: 'Happy Man', brand: 'Happy Man', confidence: 0.97, signals: ['name', 'brand'], units: [PIECE] }],
  ocrProvider: 'google_vision',
  ...overrides,
})

export const axiosError = (status: number, body: Record<string, unknown> = {}) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data: { status: false, ...body } } })
