'use client'

/* eslint-disable @next/next/no-img-element -- catalog images come from arbitrary tenant URLs */
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAxios } from '@/hooks/use-axios'
import { usePermissions } from '@/hooks/use-permissions'
import { apiErrorMessage, apiStatus } from '@/lib/api-error'
import { RecognitionAdminServices } from '../../../products/inventory/_logics/services'
import { cartIdFor } from '../../_logics/cart'
import type { CustomerType, Product, SellingUnit } from '../../_logics/types'
import { piecesHint, unitDisplayPrice } from '../../_logics/types'
import { RECOGNITION_CONFIG } from '../../_logics/scanner/config'
import { confirmationFor, decideOutcome, type Outcome } from '../../_logics/scanner/outcome'
import {
  confirmRecognition,
  findUnit,
  recognitionUnitToSelling,
  resolveProduct,
  type RecognitionCandidate,
  type RecognitionResult,
} from '../../_logics/scanner/recognition'
import { playAddedFeedback } from '../../_logics/scanner/feedback'
import { CandidatePicker, ConfirmCard, SearchPanel, UnitChooser, type SearchBanner, type UnitChoice } from './scanner-panels'

type Prompt =
  | { kind: 'confirm'; outcome: Extract<Outcome, { kind: 'confirm' }>; result: RecognitionResult }
  | { kind: 'unit'; product: Product; result: RecognitionResult | null; linkBarcode?: string }
  | { kind: 'candidates'; result: RecognitionResult }
  | { kind: 'search'; query: string; banner?: SearchBanner; result: RecognitionResult | null }

export type CommittedItem = { cartId: string; product: Product; unit: SellingUnit }

type Options = {
  products: Product[]
  customerType: CustomerType
  onAdd: (product: Product, unit: SellingUnit) => void
  onUndo: (cartId: string) => void
  onCommitted?: (item: CommittedItem) => void
}

// Turns recognition results into cart adds / prompts. Shared by the camera
// scanner and the POS search box's barcode path.
//
// Rules (from the backend contract):
// - auto-add only on matched + unit + confidence ≥ autoAddConfidence,
// - never on ambiguous / not_found, never guess a unit,
// - corrections are reported to /recognitions/:id/confirm (fire-and-forget).
export const useRecognitionFlow = ({ products, customerType, onAdd, onUndo, onCommitted }: Options) => {
  const request = useAxios()
  const { canManageProducts } = usePermissions()
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const catalog = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  // Most recent unsuccessful recognition — a manual pick right after it is
  // reported as the correction.
  const lastFailed = useRef<RecognitionResult | null>(null)

  const toChoice = useCallback(
    (u: SellingUnit): UnitChoice => ({ id: u.unit, name: u.label, price: unitDisplayPrice(u, customerType), baseQuantity: u.baseQuantity }),
    [customerType]
  )

  const commit = (product: Product, unit: SellingUnit, result: RecognitionResult | null) => {
    onAdd(product, unit)
    const cartId = cartIdFor(product, unit)
    const conf = confirmationFor(result, Number(product.id), Number(unit.unit))
    if (conf) void confirmRecognition(request, conf.recognitionId, conf.productId, conf.productUnitId)
    if (result && result === lastFailed.current) lastFailed.current = null
    setPrompt(null)
    playAddedFeedback()
    const pcs = piecesHint(unit.baseQuantity)
    toast.success(product.name, {
      description: `${unit.label}${pcs ? ` (${pcs})` : ''} · ₵${unitDisplayPrice(unit, customerType).toFixed(2)}`,
      icon: product.imageUrl ? <img src={product.imageUrl} alt="" className="w-8 h-8 rounded-md object-cover" /> : undefined,
      action: { label: 'Undo', onClick: () => onUndo(cartId) },
      duration: 4000,
    })
    onCommitted?.({ cartId, product, unit })
  }

  const linkBarcode = async (product: Product, unit: SellingUnit, code: string) => {
    try {
      await request(RecognitionAdminServices.CreateBarcode(Number(product.id), { code, productUnitId: Number(unit.unit) }))
      toast.success(`Barcode linked to ${product.name} (${unit.label})`)
    } catch (err) {
      const status = apiStatus(err)
      toast.error(
        status === 409
          ? 'That barcode is already registered.'
          : status === 422
            ? 'That barcode can’t be linked (invalid code or unit).'
            : status === 403
              ? 'You don’t have permission to manage products.'
              : apiErrorMessage(err, 'Couldn’t link the barcode.')
      )
    }
  }

  // Product chosen by the cashier (search, candidate, or confirm alternative).
  const choose = (product: Product, result: RecognitionResult | null, unitId?: string, link?: string) => {
    const unit = findUnit(product, unitId) ?? (product.units.length === 1 ? product.units[0] : undefined)
    if (!unit) return setPrompt({ kind: 'unit', product, result, linkBarcode: link })
    if (link) void linkBarcode(product, unit, link)
    commit(product, unit, result)
  }

  const productFromCandidate = (c: RecognitionCandidate) =>
    resolveProduct(catalog, c.productId, { name: c.name, brand: c.brand, image: c.image, units: c.units })

  const handleResult = (result: RecognitionResult): Outcome['kind'] => {
    const outcome = decideOutcome(result, RECOGNITION_CONFIG.autoAddConfidence)
    lastFailed.current = result.status === 'matched' ? null : result
    switch (outcome.kind) {
      case 'auto-add': {
        const product = resolveProduct(catalog, outcome.product.id, outcome.product)
        commit(product, findUnit(product, outcome.unit.id) ?? recognitionUnitToSelling(outcome.unit), result)
        break
      }
      case 'confirm':
        setPrompt({ kind: 'confirm', outcome, result })
        break
      case 'choose-unit':
        setPrompt({ kind: 'unit', product: resolveProduct(catalog, outcome.product.id, outcome.product), result })
        break
      case 'pick-candidate':
        setPrompt({ kind: 'candidates', result })
        break
      case 'not-found':
        setPrompt({
          kind: 'search',
          query: outcome.query,
          result,
          banner:
            outcome.barcode && !result.barcodeMatched
              ? { kind: 'barcode-unknown', barcode: outcome.barcode, canLink: canManageProducts }
              : { kind: 'not-recognised', hint: outcome.hint },
        })
        break
    }
    return outcome.kind
  }

  const openSearch = (query = '') => setPrompt({ kind: 'search', query, result: lastFailed.current })
  const closePrompt = () => setPrompt(null)

  const prompts = (() => {
    if (!prompt) return null
    switch (prompt.kind) {
      case 'confirm': {
        const { outcome, result } = prompt
        const product = resolveProduct(catalog, outcome.product.id, outcome.product)
        const unit = findUnit(product, outcome.unit.id) ?? recognitionUnitToSelling(outcome.unit)
        const top = result.candidates.find((c) => c.productId === outcome.product.id)
        return (
          <ConfirmCard
            name={product.name}
            image={product.imageUrl}
            unit={toChoice(unit)}
            confidence={outcome.confidence}
            signals={top?.signals ?? []}
            alternatives={outcome.alternatives}
            dismissMs={RECOGNITION_CONFIG.confirmAutoDismissMs}
            onAdd={() => commit(product, unit, result)}
            onPickAlternative={(c) => choose(productFromCandidate(c), result)}
            onSearch={() => setPrompt({ kind: 'search', query: product.name, result })}
            onDismiss={closePrompt}
          />
        )
      }
      case 'unit': {
        const { product, result, linkBarcode: link } = prompt
        return (
          <UnitChooser
            name={product.name}
            image={product.imageUrl}
            units={product.units.map(toChoice)}
            onPick={(unitId) => choose(product, result, unitId, link)}
            onDismiss={closePrompt}
          />
        )
      }
      case 'candidates': {
        const { result } = prompt
        return (
          <CandidatePicker
            candidates={result.candidates}
            hint={result.extractedText}
            toChoices={(c) => productFromCandidate(c).units.map(toChoice)}
            onPick={(c, unitId) => choose(productFromCandidate(c), result, unitId)}
            onSearch={() => setPrompt({ kind: 'search', query: result.candidates[0]?.name ?? '', result })}
            onDismiss={closePrompt}
          />
        )
      }
      case 'search': {
        const { banner, result } = prompt
        const linking = banner?.kind === 'linking' ? banner.barcode : undefined
        return (
          <SearchPanel
            key={banner?.kind ?? 'search'}
            products={products}
            initialQuery={prompt.query}
            banner={banner}
            onStartLinking={
              banner?.kind === 'barcode-unknown'
                ? () => setPrompt({ ...prompt, query: '', banner: { kind: 'linking', barcode: banner.barcode } })
                : undefined
            }
            onPick={(p) => choose(p, result, undefined, linking)}
            onClose={closePrompt}
          />
        )
      }
    }
  })()

  return { prompt, prompts, handleResult, openSearch, closePrompt }
}
