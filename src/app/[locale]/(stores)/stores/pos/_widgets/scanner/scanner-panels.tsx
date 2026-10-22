'use client'

/* eslint-disable @next/next/no-img-element -- catalog images come from arbitrary tenant URLs */
import React, { useEffect, useMemo, useState } from 'react'
import { CameraOff, Check, ChevronLeft, Link2, Package, RotateCcw, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Product } from '../../_logics/types'
import type { RecognitionCandidate, RecognitionSignal } from '../../_logics/scanner/recognition'
import { searchProducts } from '../../_logics/scanner/text-match'

// A unit as shown to the cashier. Prices are display-only.
export type UnitChoice = { id: string; name: string; price: number; baseQuantity: number }

// ── Small building blocks ───────────────────────────────────────────────────

export const ProductThumb = ({ src, name, className }: { src?: string; name: string; className?: string }) => {
  const [failed, setFailed] = useState(false)
  return (
    <div className={cn('rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0', className)}>
      {src && !failed ? (
        <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setFailed(true)} loading="lazy" />
      ) : (
        <Package className="w-1/2 h-1/2 text-gray-300" />
      )}
    </div>
  )
}

export const ConfidenceBar = ({ value }: { value: number }) => (
  <div className="flex items-center gap-1.5" aria-label={`${Math.round(value * 100)}% match`}>
    <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
      <div
        className={cn('h-full rounded-full', value >= 0.9 ? 'bg-green-500' : value >= 0.7 ? 'bg-blue-500' : 'bg-amber-400')}
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
    <span className="text-[11px] text-gray-400 tabular-nums">{Math.round(value * 100)}%</span>
  </div>
)

const SIGNAL_LABELS: Record<RecognitionSignal, string> = {
  barcode: 'via barcode',
  name: 'name',
  alias: 'alias',
  brand: 'brand',
  sku: 'SKU',
  visual: 'looks like',
}

export const SignalBadges = ({ signals }: { signals: RecognitionSignal[] }) =>
  signals.length === 0 ? null : (
    <div className="flex flex-wrap gap-1">
      {signals.slice(0, 3).map((s) => (
        <span key={s} className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
          {SIGNAL_LABELS[s] ?? s}
        </span>
      ))}
    </div>
  )

export const unitCaption = (u: UnitChoice) => (u.baseQuantity > 1 ? `= ${u.baseQuantity} pieces` : '')

const PanelShell = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div
    className={cn(
      'absolute inset-x-0 bottom-0 z-30 bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-10 fade-in-0 duration-200',
      'px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[85%] flex flex-col',
      className
    )}
  >
    {children}
  </div>
)

const CloseButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0"
  >
    <X className="h-4 w-4" />
  </button>
)

const UnitButton = ({ unit, onPick, compact }: { unit: UnitChoice; onPick: () => void; compact?: boolean }) => (
  <button
    onClick={onPick}
    className={cn(
      'flex flex-col items-start justify-center rounded-2xl border border-gray-200 text-left active:scale-[0.97] active:bg-endeavour/5 transition-all',
      compact ? 'px-3 py-2 min-h-[48px]' : 'px-4 py-3 min-h-[72px]'
    )}
  >
    <span className={cn('font-bold text-stone-700', compact ? 'text-sm' : 'text-base')}>{unit.name}</span>
    <span className="text-sm font-semibold text-endeavour">₵{unit.price.toFixed(2)}</span>
    {unit.baseQuantity > 1 && <span className="text-[11px] text-gray-400">{unitCaption(unit)}</span>}
  </button>
)

// ── matched + unit, below the auto-add threshold ────────────────────────────

type ConfirmCardProps = {
  name: string
  image?: string
  unit: UnitChoice
  confidence: number
  signals: RecognitionSignal[]
  alternatives: RecognitionCandidate[]
  dismissMs: number
  onAdd: () => void
  onPickAlternative: (c: RecognitionCandidate) => void
  onSearch: () => void
  onDismiss: () => void
}

export const ConfirmCard = ({
  name,
  image,
  unit,
  confidence,
  signals,
  alternatives,
  dismissMs,
  onAdd,
  onPickAlternative,
  onSearch,
  onDismiss,
}: ConfirmCardProps) => {
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setStarted(true))
    const t = setTimeout(onDismiss, dismissMs)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
    // Restart the countdown only when a different item is being confirmed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, unit.id, dismissMs])

  return (
    <PanelShell>
      <div className="h-1 -mt-4 -mx-4 mb-3 rounded-t-3xl overflow-hidden bg-gray-100">
        <div className="h-full bg-endeavour" style={{ width: started ? '0%' : '100%', transition: `width ${dismissMs}ms linear` }} />
      </div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Is this right?</p>
      <div className="flex items-center gap-3">
        <ProductThumb src={image} name={name} className="w-14 h-14" />
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-stone-800 truncate">{name}</p>
          <p className="text-xs text-gray-500">
            {unit.name} · ₵{unit.price.toFixed(2)}
            {unit.baseQuantity > 1 ? ` · ${unitCaption(unit)}` : ''}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <ConfidenceBar value={confidence} />
            <SignalBadges signals={signals} />
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onAdd}
          className="flex-1 h-12 rounded-2xl bg-endeavour text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Check className="h-4 w-4" /> Add {unit.name}
        </button>
        <button
          onClick={onDismiss}
          className="h-12 px-4 rounded-2xl border border-gray-200 text-gray-500 text-sm font-semibold active:scale-[0.98]"
        >
          Skip
        </button>
      </div>
      {alternatives.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 overflow-y-auto min-h-0">
          <p className="text-xs text-gray-400">Not it? Other matches</p>
          {alternatives.map((c) => (
            <button
              key={c.productId}
              onClick={() => onPickAlternative(c)}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-2xl border border-gray-200 text-left active:bg-gray-50 min-h-[52px]"
            >
              <ProductThumb src={c.image} name={c.name} className="w-10 h-10" />
              <span className="flex-1 min-w-0 text-sm font-semibold text-stone-700 truncate">{c.name}</span>
              <ConfidenceBar value={c.confidence} />
            </button>
          ))}
        </div>
      )}
      <button onClick={onSearch} className="mt-2 h-11 text-sm font-semibold text-endeavour flex items-center justify-center gap-2">
        <Search className="h-4 w-4" /> Search manually
      </button>
    </PanelShell>
  )
}

// ── matched, unit uncertain ─────────────────────────────────────────────────

type UnitChooserProps = { name: string; image?: string; units: UnitChoice[]; onPick: (unitId: string) => void; onDismiss: () => void }

export const UnitChooser = ({ name, image, units, onPick, onDismiss }: UnitChooserProps) => (
  <PanelShell>
    <div className="flex items-center gap-3 mb-3">
      <ProductThumb src={image} name={name} className="w-12 h-12" />
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-stone-800 truncate">{name}</p>
        <p className="text-sm text-gray-500">How are you selling this?</p>
      </div>
      <CloseButton onClick={onDismiss} label="Cancel" />
    </div>
    {units.length === 0 ? (
      <p className="text-sm text-red-500 py-4 text-center">This product has no selling unit configured.</p>
    ) : (
      <div className="grid grid-cols-2 gap-2 overflow-y-auto min-h-0">
        {units.map((u) => (
          <UnitButton key={u.id} unit={u} onPick={() => onPick(u.id)} />
        ))}
      </div>
    )}
  </PanelShell>
)

// ── ambiguous ───────────────────────────────────────────────────────────────

type CandidatePickerProps = {
  candidates: RecognitionCandidate[]
  hint?: string[]
  toChoices: (c: RecognitionCandidate) => UnitChoice[]
  onPick: (c: RecognitionCandidate, unitId: string) => void
  onSearch: () => void
  onDismiss: () => void
}

export const CandidatePicker = ({ candidates, hint, toChoices, onPick, onSearch, onDismiss }: CandidatePickerProps) => (
  <PanelShell>
    <div className="flex items-start justify-between mb-3 gap-2">
      <div className="min-w-0">
        <p className="text-base font-bold text-stone-800">Which product is this?</p>
        {hint && hint.length > 0 && <p className="text-xs text-gray-400 mt-0.5 truncate">Read: {hint.join(' · ')}</p>}
      </div>
      <CloseButton onClick={onDismiss} label="Keep scanning" />
    </div>
    <div className="flex flex-col gap-3 overflow-y-auto min-h-0">
      {candidates.map((c) => {
        const units = toChoices(c)
        return (
          <div key={c.productId} className="rounded-2xl border border-gray-200 p-3">
            <div className="flex items-center gap-3">
              <ProductThumb src={c.image} name={c.name} className="w-12 h-12" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-700 truncate">{c.name}</p>
                {c.brand && <p className="text-xs text-gray-400 truncate">{c.brand}</p>}
                <div className="mt-1 flex items-center gap-2">
                  <ConfidenceBar value={c.confidence} />
                  <SignalBadges signals={c.signals} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {units.map((u) => (
                <UnitButton key={u.id} unit={u} compact onPick={() => onPick(c, u.id)} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
    <button
      onClick={onSearch}
      className="mt-3 h-12 rounded-2xl border border-endeavour text-endeavour font-semibold text-sm flex items-center justify-center gap-2 flex-shrink-0"
    >
      <Search className="h-4 w-4" /> None of these — search manually
    </button>
  </PanelShell>
)

// ── Manual search (also the not_found screen) ───────────────────────────────

export type SearchBanner =
  | { kind: 'not-recognised'; hint: string[] }
  | { kind: 'barcode-unknown'; barcode: string; canLink: boolean }
  | { kind: 'linking'; barcode: string }

type SearchPanelProps = {
  products: Product[]
  initialQuery: string
  banner?: SearchBanner
  onPick: (product: Product) => void
  onStartLinking?: () => void
  onClose: () => void
}

export const SearchPanel = ({ products, initialQuery, banner, onPick, onStartLinking, onClose }: SearchPanelProps) => {
  const [query, setQuery] = useState(initialQuery)
  const results = useMemo(() => (query.trim() ? searchProducts(products, query).slice(0, 40) : products.slice(0, 40)), [products, query])

  return (
    <div className="absolute inset-0 z-40 bg-white flex flex-col animate-in fade-in-0 slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-gray-100">
        <button
          onClick={onClose}
          aria-label="Back to camera"
          className="w-11 h-11 rounded-full flex items-center justify-center text-gray-600 active:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, brand, SKU or category"
            aria-label="Search products"
            className="w-full h-11 pl-9 pr-9 rounded-xl border border-gray-200 text-base text-stone-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-endeavour"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-gray-400"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {banner?.kind === 'not-recognised' && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-sm font-semibold text-amber-800">Product not recognised</p>
          {banner.hint.length > 0 && <p className="text-xs text-amber-700/60 mt-0.5 truncate">Read: {banner.hint.join(' · ')}</p>}
        </div>
      )}
      {banner?.kind === 'barcode-unknown' && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Barcode not in your catalog</p>
            <p className="text-xs text-amber-700/70 font-mono truncate">{banner.barcode}</p>
          </div>
          {banner.canLink && onStartLinking && (
            <button
              onClick={onStartLinking}
              className="h-10 px-3 rounded-xl bg-white border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5 flex-shrink-0"
            >
              <Link2 className="h-3.5 w-3.5" /> Link to a product
            </button>
          )}
        </div>
      )}
      {banner?.kind === 'linking' && (
        <div className="px-4 py-3 bg-endeavour/5 border-b border-endeavour/10">
          <p className="text-sm font-semibold text-endeavour">Pick the product for this barcode</p>
          <p className="text-xs text-gray-500 font-mono truncate">{banner.barcode}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 text-gray-400 py-16">
            <Package className="h-8 w-8 opacity-40" />
            <p className="text-sm">No products match &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => onPick(p)}
                className="flex items-center gap-3 py-2.5 text-left active:bg-gray-50 min-h-[60px]"
              >
                <ProductThumb src={p.imageUrl} name={p.name} className="w-11 h-11" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-700 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 truncate">{[p.brand, p.category, p.sku].filter(Boolean).join(' · ')}</p>
                </div>
                {p.units.length > 1 && (
                  <span className="text-[10px] text-gray-400 bg-gray-100 rounded-md px-1.5 py-0.5">{p.units.length} units</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Camera failure ──────────────────────────────────────────────────────────

type CameraErrorViewProps = { message: string; canRetry: boolean; onRetry: () => void; onSearch: () => void; onTakePhoto: () => void }

export const CameraErrorView = ({ message, canRetry, onRetry, onSearch, onTakePhoto }: CameraErrorViewProps) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center text-white">
    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
      <CameraOff className="h-7 w-7" />
    </div>
    <p className="text-sm leading-relaxed text-white/80 max-w-xs">{message}</p>
    <div className="flex flex-col gap-2 w-full max-w-xs">
      <button onClick={onTakePhoto} className="h-12 rounded-2xl bg-white text-stone-800 font-semibold text-sm">
        Take or choose a photo
      </button>
      <button
        onClick={onSearch}
        className="h-12 rounded-2xl border border-white/30 text-white font-semibold text-sm flex items-center justify-center gap-2"
      >
        <Search className="h-4 w-4" /> Search products
      </button>
      {canRetry && (
        <button onClick={onRetry} className="h-11 text-white/70 font-semibold text-sm flex items-center justify-center gap-2">
          <RotateCcw className="h-4 w-4" /> Try camera again
        </button>
      )}
    </div>
  </div>
)
