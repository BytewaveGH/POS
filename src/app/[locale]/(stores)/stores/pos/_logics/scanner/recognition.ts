// Client for the recognition API (tag "Recognition" in sellix-api.yaml).
//
// The frontend only captures evidence and renders results; the backend decides
// product identity, and checkout re-reads every price. All of these routes take
// the tenant from the (tenant-bound) token.

import type { AxiosRequestConfig } from 'axios'
import { apiErrorMessage, apiStatus } from '@/lib/api-error'
import { mapApiUnit, toPricingRule, type PricingRule, type Product, type SellingUnit } from '../types'

// ── Contract types ──────────────────────────────────────────────────────────

export type RecognitionStatus = 'matched' | 'ambiguous' | 'not_found'
export type UnitResolution = 'barcode' | 'alias' | 'single_unit' | 'text' | 'ambiguous' | 'none'
export type RecognitionSignal = 'barcode' | 'name' | 'alias' | 'brand' | 'sku' | 'visual'

export interface RecognitionUnit {
  id: number // productUnitId for checkout
  unitId: number
  name: string
  price: number // display only
  wholesalePrice: number
  pricingRule: PricingRule
  baseQuantity: number
}

export interface RecognitionCandidate {
  productId: number
  name: string
  brand?: string
  image?: string
  confidence: number
  signals: RecognitionSignal[]
  matchedTerm?: string
  units: RecognitionUnit[]
}

export interface RecognitionResult {
  recognitionId?: number
  status: RecognitionStatus
  matched: boolean
  confidence: number
  product: { id: number; name: string; brand?: string; category: string; image?: string } | null
  unit: RecognitionUnit | null
  units: RecognitionUnit[]
  unitResolution: UnitResolution
  barcode?: string
  barcodeMatched: boolean
  extractedText: string[]
  candidates: RecognitionCandidate[]
  ocrProvider?: string
}

type Request = (config: AxiosRequestConfig) => Promise<any>

// ── Services ────────────────────────────────────────────────────────────────

export const RecognitionServices = {
  Recognize: (form: FormData, signal?: AbortSignal, timeout?: number): AxiosRequestConfig => ({
    method: 'POST',
    url: `/pos/products/recognize`,
    data: form,
    signal,
    timeout,
  }),
  Barcode: (code: string, signal?: AbortSignal): AxiosRequestConfig => ({
    method: 'GET',
    url: `/pos/products/barcode/${encodeURIComponent(code)}`,
    signal,
  }),
  Confirm: (recognitionId: number, payload: { productId: number; productUnitId?: number }): AxiosRequestConfig => ({
    method: 'POST',
    url: `/pos/products/recognitions/${recognitionId}/confirm`,
    data: payload,
  }),
}

// ── Parsing ─────────────────────────────────────────────────────────────────

const toUnit = (u: any): RecognitionUnit => ({
  id: Number(u?.id),
  unitId: Number(u?.unitId),
  name: String(u?.name ?? '—'),
  price: Number(u?.price ?? 0),
  wholesalePrice: Number(u?.wholesalePrice ?? 0),
  pricingRule: toPricingRule(u?.pricingRule),
  baseQuantity: Number(u?.baseQuantity) >= 1 ? Math.floor(Number(u.baseQuantity)) : 1,
})

const clamp01 = (v: unknown) => Math.max(0, Math.min(1, Number(v) || 0))

export const parseRecognition = (raw: any): RecognitionResult => {
  const d = raw ?? {}
  const status: RecognitionStatus = d.status === 'matched' || d.status === 'ambiguous' ? d.status : 'not_found'
  const units = Array.isArray(d.units) ? d.units.map(toUnit) : []
  return {
    recognitionId: d.recognitionId === undefined || d.recognitionId === null ? undefined : Number(d.recognitionId),
    status,
    matched: status === 'matched',
    confidence: clamp01(d.confidence),
    // product/unit are only meaningful on "matched" — never trust them otherwise.
    product: status === 'matched' && d.product ? { ...d.product, id: Number(d.product.id) } : null,
    unit: status === 'matched' && d.unit ? toUnit(d.unit) : null,
    units,
    unitResolution: d.unitResolution ?? 'none',
    barcode: d.barcode || undefined,
    barcodeMatched: !!d.barcodeMatched,
    extractedText: Array.isArray(d.extractedText) ? d.extractedText.map(String).filter(Boolean) : [],
    candidates: (Array.isArray(d.candidates) ? d.candidates : []).map(
      (c: any): RecognitionCandidate => ({
        productId: Number(c.productId),
        name: String(c.name ?? ''),
        brand: c.brand || undefined,
        image: c.image || undefined,
        confidence: clamp01(c.confidence),
        signals: Array.isArray(c.signals) ? c.signals : [],
        matchedTerm: c.matchedTerm || undefined,
        units: Array.isArray(c.units) ? c.units.map(toUnit) : [],
      })
    ),
    ocrProvider: d.ocrProvider || undefined,
  }
}

// ── Errors ──────────────────────────────────────────────────────────────────

export type RecognitionErrorKind =
  | 'bad-request'
  | 'auth'
  | 'too-large'
  | 'unsupported-type'
  | 'unreadable'
  | 'rate-limited'
  | 'unavailable'
  | 'timeout'
  | 'network'
  | 'server'

export class RecognitionError extends Error {
  constructor(
    readonly kind: RecognitionErrorKind,
    message: string,
    readonly status?: number
  ) {
    super(message)
    this.name = 'RecognitionError'
  }
}

export const classifyRecognitionError = (err: any): RecognitionError => {
  if (err instanceof RecognitionError) return err
  const status = apiStatus(err)
  if (err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT') return new RecognitionError('timeout', 'Took too long, try again.')
  if (!status) return new RecognitionError('network', 'Could not reach the server. Check your connection.')
  switch (status) {
    case 400:
      return new RecognitionError('bad-request', 'Nothing was sent to recognise.', status)
    case 401:
    case 403:
      // The axios interceptor logs the user out for these.
      return new RecognitionError('auth', 'Your session has ended. Please sign in again.', status)
    case 413:
      return new RecognitionError('too-large', 'Photo too large.', status)
    case 415:
      return new RecognitionError('unsupported-type', 'Use a JPEG/PNG photo.', status)
    case 422:
      return new RecognitionError('unreadable', 'Couldn’t read that photo, try again.', status)
    case 429:
      return new RecognitionError('rate-limited', 'Slow down — too many scans. Wait a few seconds.', status)
    case 503:
      return new RecognitionError('unavailable', 'Recognition unavailable, use barcode or search.', status)
    case 504:
      return new RecognitionError('timeout', 'Took too long, try again.', status)
    default:
      return new RecognitionError('server', apiErrorMessage(err, 'Recognition failed, try again.'), status)
  }
}

// ── Calls ───────────────────────────────────────────────────────────────────

export type RecognizeInput = {
  image?: Blob
  barcode?: string
  // On-device OCR lines.
  text?: string[]
}

const buildForm = ({ image, barcode, text }: RecognizeInput) => {
  const form = new FormData()
  if (image) form.append('image', image, image.type === 'image/png' ? 'item.png' : 'item.jpg')
  if (barcode) form.append('barcode', barcode)
  const joined = (text ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000)
  if (joined) form.append('text', joined)
  return form
}

type RecognizeOptions = {
  signal?: AbortSignal
  timeout?: number
  // Called once on 413 to produce a smaller image for a single retry.
  recompress?: (image: Blob) => Promise<Blob | null>
  // Called once on 503 (server OCR down) when no text was sent: reads the
  // photo on the phone so the request can be retried with `text`.
  onDeviceText?: (image: Blob) => Promise<string[]>
  // Told when the server reported its OCR as unavailable.
  onServerOcrDown?: () => void
}

export const recognize = async (request: Request, input: RecognizeInput, opts: RecognizeOptions = {}): Promise<RecognitionResult> => {
  if (!input.image && !input.barcode && !input.text?.length) throw new RecognitionError('bad-request', 'Nothing to recognise.')
  const send = async (payload: RecognizeInput) =>
    parseRecognition((await request(RecognitionServices.Recognize(buildForm(payload), opts.signal, opts.timeout)))?.data?.data)

  let payload = input
  let recompressed = false
  let triedText = false
  for (;;) {
    try {
      return await send(payload)
    } catch (err) {
      const e = classifyRecognitionError(err)
      if (opts.signal?.aborted || !payload.image) throw e
      if (e.kind === 'too-large' && !recompressed && opts.recompress) {
        recompressed = true
        const smaller = await opts.recompress(payload.image)
        if (smaller) {
          payload = { ...payload, image: smaller }
          continue
        }
      }
      if (e.kind === 'unavailable') {
        opts.onServerOcrDown?.()
        if (!triedText && !payload.text?.length && opts.onDeviceText) {
          triedText = true
          const text = await opts.onDeviceText(payload.image)
          if (text.length > 0 && !opts.signal?.aborted) {
            // Keep the image: the server still decodes barcodes from it.
            payload = { ...payload, text }
            continue
          }
        }
      }
      throw e
    }
  }
}

// Barcode-only lookup. A 404 still carries a not_found result in the body.
export const lookupBarcode = async (request: Request, code: string, signal?: AbortSignal): Promise<RecognitionResult> => {
  try {
    return parseRecognition((await request(RecognitionServices.Barcode(code, signal)))?.data?.data)
  } catch (err: any) {
    if (apiStatus(err) === 404) {
      const body = err?.response?.data?.data
      return { ...parseRecognition(body ?? { status: 'not_found' }), status: 'not_found', matched: false, barcode: body?.barcode ?? code }
    }
    throw classifyRecognitionError(err)
  }
}

// Learning loop — fire-and-forget, never blocks the sale. A 422 means the unit
// doesn't belong to the product, so retry once without it; 404 is ignored.
export const confirmRecognition = async (
  request: Request,
  recognitionId: number,
  productId: number,
  productUnitId?: number
): Promise<void> => {
  try {
    await request(RecognitionServices.Confirm(recognitionId, productUnitId ? { productId, productUnitId } : { productId }))
  } catch (err) {
    if (apiStatus(err) === 422 && productUnitId) {
      await request(RecognitionServices.Confirm(recognitionId, { productId })).catch(() => {})
    }
  }
}

// ── Mapping to POS shapes ───────────────────────────────────────────────────

export const recognitionUnitToSelling = (u: RecognitionUnit): SellingUnit =>
  mapApiUnit({
    id: u.id,
    unitName: u.name,
    retailPrice: u.price,
    wholesalePrice: u.wholesalePrice,
    pricingRule: u.pricingRule,
    baseQuantity: u.baseQuantity,
  })

// Prefer the catalog record (full pricing rules for the cart estimate); fall
// back to what the recognition response carried if the catalog page didn't
// include the product.
export const resolveProduct = (
  catalog: Map<string, Product>,
  productId: number,
  fallback: { name: string; brand?: string; category?: string; image?: string; units: RecognitionUnit[] }
): Product =>
  catalog.get(String(productId)) ?? {
    id: String(productId),
    name: fallback.name,
    brand: fallback.brand,
    category: fallback.category ?? 'Other',
    imageUrl: fallback.image,
    units: fallback.units.map(recognitionUnitToSelling),
  }

export const findUnit = (product: Product, productUnitId: number | string | undefined | null): SellingUnit | undefined =>
  productUnitId === undefined || productUnitId === null ? undefined : product.units.find((u) => u.unit === String(productUnitId))
