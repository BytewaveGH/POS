// Text normalisation + fuzzy product matching.
//
// Used for manual search (in the POS and inside the scanner) and to turn the
// backend's OCR text into a useful search prefill when recognition is unsure.
// This never decides a recognition result on its own — the backend does that.

import type { Product } from '../types'

// Characters OCR commonly confuses with letters, applied only inside tokens
// that are mostly letters (so "500ml" or SKUs stay intact).
const OCR_DIGIT_TO_LETTER: Record<string, string> = { '0': 'o', '1': 'l', '|': 'l', '5': 's', '8': 'b', $: 's', '@': 'a' }

const fixOcrToken = (token: string) => {
  const letters = token.replace(/[^a-z]/g, '').length
  if (letters === 0 || letters < token.length / 2) return token
  return token.replace(/[015|8$@]/g, (ch) => OCR_DIGIT_TO_LETTER[ch] ?? ch)
}

// "HAPPY-MAN", "Happy  Man!", "HAPPY MAN." → "happy man"; "C0CA" → "coca"
export const normalizeText = (input: string | undefined | null): string => {
  if (!input) return ''
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[_\-–—/\\.,:;'"`’‘“”!?()[\]{}*+#~^=<>]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => fixOcrToken(t))
    .join(' ')
}

// Retail barcodes (EAN/UPC/ITF) are all digits, 8–14 long.
export const looksLikeBarcode = (input: string) => /^\d{8,14}$/.test(input.trim())

// "happy man" → "happyman" so "HappyMan" and "HAPPY MAN" compare equal.
export const compactText = (input: string | undefined | null) => normalizeText(input).replace(/\s+/g, '')

const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

const ratio = (a: string, b: string) => {
  const max = Math.max(a.length, b.length)
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max
}

// Similarity (0..1) between a query and one text field.
export const textSimilarity = (query: string, field: string | undefined): number => {
  const q = normalizeText(query)
  const f = normalizeText(field)
  if (!q || !f) return 0
  if (q === f) return 1
  const qc = q.replace(/\s+/g, '')
  const fc = f.replace(/\s+/g, '')
  if (qc === fc) return 0.98
  if (f.startsWith(q) || fc.startsWith(qc)) return 0.9
  if (f.includes(q) || fc.includes(qc)) return 0.8

  // Token-wise: each query token is matched to its closest field token, which
  // tolerates typos ("hapy man") and word order.
  const fTokens = f.split(' ')
  const qTokens = q.split(' ')
  const tokenScore =
    qTokens.reduce((sum, qt) => {
      const best = Math.max(...fTokens.map((ft) => (ft.startsWith(qt) && qt.length >= 2 ? 0.95 : ratio(qt, ft))))
      return sum + best
    }, 0) / qTokens.length
  // Slight preference for fields without extra words ("Happy Man" over "Happy Man Blue").
  const coverage = 0.94 + 0.06 * Math.min(1, qTokens.length / fTokens.length)
  return Math.max(tokenScore * 0.85 * coverage, ratio(qc, fc) * 0.8)
}

// Relevance (0..1) of a product for a free-text query across name, brand, SKU
// and category. SKU only counts on (near-)exact hits. Barcodes aren't in the
// product list, so barcode-looking input goes to the barcode lookup instead.
export const scoreProduct = (product: Product, query: string): number => {
  const q = query.trim()
  if (!q) return 0
  if (product.sku) {
    const qc = compactText(q)
    const cc = compactText(product.sku)
    if (cc === qc) return 1
    if (qc.length >= 4 && cc.startsWith(qc)) return 0.85
  }
  return Math.max(
    textSimilarity(q, product.name),
    textSimilarity(q, product.brand) * 0.9,
    textSimilarity(q, [product.brand, product.name].filter(Boolean).join(' ')) * 0.95,
    textSimilarity(q, product.category) * 0.6
  )
}

export const searchProducts = (products: Product[], query: string, minScore = 0.55): Product[] =>
  products
    .map((p) => ({ p, score: scoreProduct(p, query) }))
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
    .map((x) => x.p)
