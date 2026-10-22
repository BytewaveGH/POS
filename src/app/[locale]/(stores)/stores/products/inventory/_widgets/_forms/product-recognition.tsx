'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Lightbulb, Plus, Tag, Trash2, X } from 'lucide-react'
import { useAxios } from '@/hooks/use-axios'
import { usePermissions } from '@/hooks/use-permissions'
import { apiErrorMessage, apiStatus } from '@/lib/api-error'
import { RecognitionAdminServices } from '../../_logics/services'
import { BarcodeCaptureButton } from '../../../../pos/_widgets/scanner/barcode-capture'

export interface ProductAlias {
  id: number
  alias: string
  source: 'manual' | 'recognition'
  productUnitId?: number | null
}
export interface ProductBarcode {
  id: number
  code: string
  productUnitId?: number | null
}
export interface AliasSuggestion {
  text: string
  occurrences: number
  similarity: number
}

type UnitOption = { id: number; name: string }

const isValidCode = (code: string) => /^[\x21-\x7E]{1,64}$/.test(code)

// GET helper with explicit 403 handling (the UI is permission-gated, but the
// server is the authority).
const useList = <T,>(load: () => Promise<any>) => {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await load()
      const data = res?.data?.data
      setItems(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError(apiStatus(err) === 403 ? 'You don’t have permission to manage products.' : apiErrorMessage(err, 'Couldn’t load.'))
    } finally {
      setLoading(false)
    }
  }, [load])
  useEffect(() => {
    void reload()
  }, [reload])
  return { items, setItems, loading, error, reload }
}

const Section = ({ icon, title, help, children }: { icon: React.ReactNode; title: string; help?: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-2">
    <div>
      <p className="bytewave-paragraph text-endeavour font-mulish-regular flex items-center gap-1.5">
        {icon}
        {title}
      </p>
      {help && <p className="text-xs text-gray-400 mt-0.5">{help}</p>}
    </div>
    {children}
  </section>
)

const UnitSelect = ({
  units,
  value,
  onChange,
  label,
}: {
  units: UnitOption[]
  value: string
  onChange: (v: string) => void
  label: string
}) => (
  <select
    aria-label={label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="h-9 px-2 rounded-md border border-gray-200 text-sm text-stone-600 bg-white focus:outline-none focus:ring-1 focus:ring-endeavour"
  >
    <option value="">Any unit</option>
    {units.map((u) => (
      <option key={u.id} value={u.id}>
        {u.name}
      </option>
    ))}
  </select>
)

const ProductRecognitionPanel = ({ productId, units }: { productId: number; units: UnitOption[] }) => {
  const request = useAxios()
  const unitName = (id?: number | null) => units.find((u) => u.id === id)?.name

  // ── Aliases ──
  const loadAliases = useCallback(() => request(RecognitionAdminServices.FetchAliases(productId)), [request, productId])
  const aliases = useList<ProductAlias>(loadAliases)
  const [aliasText, setAliasText] = useState('')
  const [aliasUnit, setAliasUnit] = useState('')
  const [aliasError, setAliasError] = useState<string | null>(null)

  const addAlias = async (alias: string, source: 'manual' | 'recognition', productUnitId?: number) => {
    setAliasError(null)
    try {
      await request(RecognitionAdminServices.CreateAlias(productId, { alias, source, ...(productUnitId ? { productUnitId } : {}) }))
      await aliases.reload()
      return true
    } catch (err) {
      const status = apiStatus(err)
      setAliasError(
        status === 409
          ? `“${alias}” is already an alias for this product.`
          : status === 422
            ? 'That alias isn’t valid, or the unit belongs to another product.'
            : status === 403
              ? 'You don’t have permission to manage products.'
              : apiErrorMessage(err, 'Couldn’t add the alias.')
      )
      return false
    }
  }

  const removeAlias = async (id: number) => {
    try {
      await request(RecognitionAdminServices.DeleteAlias(productId, id))
      aliases.setItems((list) => list.filter((a) => a.id !== id))
    } catch (err) {
      setAliasError(apiErrorMessage(err, 'Couldn’t delete the alias.'))
    }
  }

  // ── Suggestions (learning loop). Never auto-promoted; dismiss is client-side. ──
  const loadSuggestions = useCallback(() => request(RecognitionAdminServices.FetchAliasSuggestions(productId)), [request, productId])
  const suggestions = useList<AliasSuggestion>(loadSuggestions)
  const [dismissed, setDismissed] = useState<string[]>([])
  const visibleSuggestions = suggestions.items.filter((s) => !dismissed.includes(s.text))

  // ── Barcodes ──
  const loadBarcodes = useCallback(() => request(RecognitionAdminServices.FetchBarcodes(productId)), [request, productId])
  const barcodes = useList<ProductBarcode>(loadBarcodes)
  const [code, setCode] = useState('')
  const [codeUnit, setCodeUnit] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)

  const addBarcode = async () => {
    const value = code.trim()
    if (!isValidCode(value)) return setCodeError('Barcodes are 1–64 printable characters, no spaces.')
    setCodeError(null)
    try {
      await request(
        RecognitionAdminServices.CreateBarcode(productId, { code: value, ...(codeUnit ? { productUnitId: Number(codeUnit) } : {}) })
      )
      setCode('')
      setCodeUnit('')
      await barcodes.reload()
    } catch (err) {
      const status = apiStatus(err)
      setCodeError(
        status === 409
          ? 'That barcode is already registered (to this or another product).'
          : status === 422
            ? 'Invalid barcode, or the unit belongs to another product.'
            : status === 403
              ? 'You don’t have permission to manage products.'
              : apiErrorMessage(err, 'Couldn’t add the barcode.')
      )
    }
  }

  const removeBarcode = async (id: number) => {
    try {
      await request(RecognitionAdminServices.DeleteBarcode(productId, id))
      barcodes.setItems((list) => list.filter((b) => b.id !== id))
    } catch (err) {
      setCodeError(apiErrorMessage(err, 'Couldn’t delete the barcode.'))
    }
  }

  return (
    <div className="flex flex-col gap-6 border-t border-gray-200 pt-5 mt-2" data-testid="product-recognition">
      <Section
        icon={<Tag className="h-4 w-4" />}
        title="Also known as (search terms)"
        help="Alternate names help the camera recognise this product, e.g. “HappyMan”, “H-Man”, “Alomo Sachet”."
      >
        {aliases.error ? (
          <p className="text-xs text-red-500">{aliases.error}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {aliases.items.length === 0 && !aliases.loading && <p className="text-xs text-gray-400">No aliases yet.</p>}
            {aliases.items.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1 rounded-md bg-gray-100 text-stone-700 text-xs px-2 py-1">
                {a.alias}
                {a.productUnitId && <span className="text-gray-400">→ {unitName(a.productUnitId) ?? 'unit'}</span>}
                {a.source === 'recognition' && <span className="text-[10px] text-endeavour">learned</span>}
                <button
                  type="button"
                  aria-label={`Delete alias ${a.alias}`}
                  onClick={() => void removeAlias(a.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={aliasText}
            onChange={(e) => setAliasText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (aliasText.trim())
                  void addAlias(aliasText.trim(), 'manual', aliasUnit ? Number(aliasUnit) : undefined).then((ok) => ok && setAliasText(''))
              }
            }}
            maxLength={120}
            placeholder="e.g. H-Man"
            aria-label="New alias"
            className="flex-1 h-9 px-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-endeavour"
          />
          <UnitSelect units={units} value={aliasUnit} onChange={setAliasUnit} label="This name means a specific unit" />
          <button
            type="button"
            disabled={!aliasText.trim()}
            onClick={() =>
              void addAlias(aliasText.trim(), 'manual', aliasUnit ? Number(aliasUnit) : undefined).then((ok) => ok && setAliasText(''))
            }
            className="h-9 px-3 rounded-md bg-endeavour text-white text-sm flex items-center gap-1 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        {aliasError && <p className="text-xs text-red-500">{aliasError}</p>}
      </Section>

      {visibleSuggestions.length > 0 && (
        <Section
          icon={<Lightbulb className="h-4 w-4" />}
          title="Suggested aliases"
          help="Text the camera read that cashiers confirmed as this product. Review before adding."
        >
          <div className="flex flex-col divide-y divide-gray-100 rounded-md border border-gray-200">
            {visibleSuggestions.map((s) => (
              <div key={s.text} className="flex items-center gap-2 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-700 font-mono truncate">{s.text}</p>
                  <p className="text-[11px] text-gray-400">
                    seen {s.occurrences}× · {Math.round(s.similarity * 100)}% similar
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void addAlias(s.text, 'recognition').then((ok) => ok && setDismissed((d) => [...d, s.text]))}
                  className="h-8 px-2.5 rounded-md bg-endeavour/10 text-endeavour text-xs font-semibold"
                >
                  Add as alias
                </button>
                <button
                  type="button"
                  onClick={() => setDismissed((d) => [...d, s.text])}
                  className="h-8 px-2 rounded-md text-gray-400 text-xs"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section
        icon={<Tag className="h-4 w-4" />}
        title="Barcodes"
        help="Link the barcode to the unit it’s printed on (e.g. the carton barcode → Box)."
      >
        {barcodes.error ? (
          <p className="text-xs text-red-500">{barcodes.error}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {barcodes.items.length === 0 && !barcodes.loading && <p className="text-xs text-gray-400">No barcodes yet.</p>}
            {barcodes.items.map((b) => (
              <div key={b.id} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-stone-700">{b.code}</span>
                <span className="text-xs text-gray-400">{b.productUnitId ? (unitName(b.productUnitId) ?? 'unit') : 'any unit'}</span>
                <button
                  type="button"
                  aria-label={`Delete barcode ${b.code}`}
                  onClick={() => void removeBarcode(b.id)}
                  className="ml-auto text-gray-300 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void addBarcode()
              }
            }}
            maxLength={64}
            placeholder="Barcode"
            aria-label="New barcode"
            className="flex-1 h-9 px-3 rounded-md border border-gray-200 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-endeavour"
          />
          <BarcodeCaptureButton
            onCode={setCode}
            className="h-9 w-9 rounded-md border border-gray-200 text-gray-500 flex items-center justify-center"
          />
          <UnitSelect units={units} value={codeUnit} onChange={setCodeUnit} label="Unit the barcode is printed on" />
          <button
            type="button"
            disabled={!code.trim()}
            onClick={() => void addBarcode()}
            className="h-9 px-3 rounded-md bg-endeavour text-white text-sm flex items-center gap-1 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        {codeError && <p className="text-xs text-red-500">{codeError}</p>}
      </Section>
    </div>
  )
}

// Hidden for employees without canManageProducts (admins always have it).
const ProductRecognition = (props: { productId: number; units: UnitOption[] }) => {
  const { canManageProducts } = usePermissions()
  if (!canManageProducts) return null
  return <ProductRecognitionPanel {...props} />
}

export default ProductRecognition
