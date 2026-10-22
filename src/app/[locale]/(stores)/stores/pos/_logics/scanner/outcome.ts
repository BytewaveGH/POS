// What the scanner should do with a recognition result. Pure, so the rules
// ("never auto-add on ambiguous/not_found", "never guess a unit") are testable.

import type { RecognitionCandidate, RecognitionResult, RecognitionUnit } from './recognition'

export type ProductInfo = { id: number; name: string; brand?: string; category?: string; image?: string; units: RecognitionUnit[] }

export type Outcome =
  // matched + unit + confidence ≥ threshold
  | { kind: 'auto-add'; product: ProductInfo; unit: RecognitionUnit; confidence: number }
  // matched + unit, but below the auto-add threshold — one tap to add
  | { kind: 'confirm'; product: ProductInfo; unit: RecognitionUnit; confidence: number; alternatives: RecognitionCandidate[] }
  // matched, unit uncertain — "How are you selling this?"
  | { kind: 'choose-unit'; product: ProductInfo; confidence: number }
  // several plausible products
  | { kind: 'pick-candidate'; candidates: RecognitionCandidate[] }
  | { kind: 'not-found'; hint: string[]; query: string; barcode?: string }

// Best search prefill from OCR lines: the line with the most letters. When the
// OCR split a name into one-word lines (["HAPPY", "MAN"]), join the first few.
export const prominentLine = (lines: string[]): string => {
  const clean = lines.map((l) => l.trim()).filter((l) => /[a-z]/i.test(l))
  if (clean.length === 0) return ''
  const letters = (s: string) => s.replace(/[^a-z]/gi, '').length
  const best = clean.reduce((a, b) => (letters(b) > letters(a) ? b : a))
  if (!best.includes(' ') && clean.length > 1 && clean.slice(0, 3).every((l) => !l.includes(' '))) return clean.slice(0, 3).join(' ')
  return best
}

export const decideOutcome = (result: RecognitionResult, autoAddConfidence: number): Outcome => {
  if (result.status === 'matched' && result.product) {
    const top = result.candidates.find((c) => c.productId === result.product!.id)
    const product: ProductInfo = {
      ...result.product,
      image: result.product.image ?? top?.image,
      units: result.units.length > 0 ? result.units : (top?.units ?? []),
    }
    if (!result.unit) return { kind: 'choose-unit', product, confidence: result.confidence }
    if (result.confidence >= autoAddConfidence) return { kind: 'auto-add', product, unit: result.unit, confidence: result.confidence }
    return {
      kind: 'confirm',
      product,
      unit: result.unit,
      confidence: result.confidence,
      alternatives: result.candidates.filter((c) => c.productId !== product.id).slice(0, 2),
    }
  }
  if (result.status === 'ambiguous' && result.candidates.length > 0) return { kind: 'pick-candidate', candidates: result.candidates }
  return { kind: 'not-found', hint: result.extractedText, query: prominentLine(result.extractedText), barcode: result.barcode }
}

export type Confirmation = { recognitionId: number; productId: number; productUnitId?: number }

// The learning loop only wants corrections: a pick after ambiguous/not_found,
// or a different product than the one the server matched.
export const confirmationFor = (
  result: Pick<RecognitionResult, 'recognitionId' | 'status' | 'product'> | null | undefined,
  productId: number,
  productUnitId?: number
): Confirmation | null => {
  if (!result || result.recognitionId === undefined) return null
  const correction = result.status !== 'matched' || !result.product || result.product.id !== productId
  return correction ? { recognitionId: result.recognitionId, productId, productUnitId } : null
}
