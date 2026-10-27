'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Plus, Search, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/kit/ui'
import { Drawer, Field, FormGrid, Input, Segmented, Select, Textarea, Toggle, toNum } from '@/components/kit/form'
import { useEateryActions } from '@/lib/eatery/hooks'
import { EXPENSE_CATEGORIES, averageCost, itemCost, margin, recipeWarnings } from '@/lib/eatery/costing'
import { formatMoney } from '@/lib/eatery/menu'
import {
  PURCHASE_UNITS,
  USE_UNITS,
  amount,
  buysInBulk,
  conversion,
  costLabels,
  fromTemplate,
  lineUnits,
  perPurchaseOf,
  purchasePrice,
  rescaleFactor,
  stockLabel,
  templatesFor,
  toLine,
  typedOf,
  unitName,
  type IngredientTemplate,
} from '@/lib/eatery/units'
import type {
  Expense,
  ExpenseCategory,
  Ingredient,
  IngredientUnit,
  MenuItem,
  PackagingRule,
  Recipe,
  RecipeLine,
  Restaurant,
} from '@/lib/eatery/types'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const round = (n: number, dp = 4) => Math.round(n * 10 ** dp) / 10 ** dp

// Older call sites.
export const qtyLabel = (q: number, u: IngredientUnit) => amount(q, u)

// ── Quantity in the units people think in ──

type UnitShape = Pick<Ingredient, 'unit' | 'purchaseUnit' | 'perPurchase'>

// For bulk-bought items, "2 packs + 10 pieces"; for weights and volumes, a
// number with a kg/g (l/ml) switch. The value is always in the use unit.
export const QuantityInput = ({
  shape,
  value,
  onChange,
  id,
  label,
}: {
  shape: UnitShape
  value: number | ''
  onChange: (v: number | '') => void
  id: string
  label: string
}) => {
  const bulk = buysInBulk(shape)
  const per = perPurchaseOf(shape)
  const options = (USE_UNITS.map((u) => u.value) as IngredientUnit[]).filter(
    (u) => u === shape.unit || (conversion(u, shape.unit) && u !== shape.unit)
  )
  const [unit, setUnit] = useState<IngredientUnit>(shape.unit)
  useEffect(() => setUnit(shape.unit), [shape.unit])
  if (bulk) {
    const v = value === '' ? 0 : value
    const whole = value === '' ? '' : Math.floor(v / per + 1e-9)
    const rest = value === '' ? '' : round(v - (whole as number) * per, 2)
    const set = (w: number | '', r: number | '') => onChange(w === '' && r === '' ? '' : round(toNum(w) * per + toNum(r)))
    return (
      <div className="grid grid-cols-2 gap-2" role="group" aria-label={label}>
        <label className="relative block">
          <span className="sr-only">{unitName(shape.purchaseUnit!)}</span>
          <Input
            id={id}
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={whole}
            onChange={(e) => set(e.target.value === '' ? '' : toNum(e.target.value), rest)}
            className="pr-16"
            aria-label={`${label}: ${unitName(shape.purchaseUnit!)}`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
            {unitName(shape.purchaseUnit!)}
          </span>
        </label>
        <label className="relative block">
          <span className="sr-only">{unitName(shape.unit)}</span>
          <Input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={rest}
            onChange={(e) => set(whole, e.target.value === '' ? '' : toNum(e.target.value))}
            className="pr-16"
            aria-label={`${label}: ${unitName(shape.unit)}`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
            {unitName(shape.unit)}
          </span>
        </label>
      </div>
    )
  }
  const f = conversion(unit, shape.unit) ?? 1
  return (
    <div className="flex gap-2">
      <Input
        id={id}
        aria-label={label}
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        value={value === '' ? '' : round(value / f)}
        onChange={(e) => onChange(e.target.value === '' ? '' : round(toNum(e.target.value) * f))}
      />
      {options.length > 1 ? (
        <select
          aria-label={`${label} unit`}
          value={unit}
          onChange={(e) => setUnit(e.target.value as IngredientUnit)}
          className="h-11 rounded-xl border border-stone-200 bg-white px-2 text-sm"
        >
          {options.map((u) => (
            <option key={u} value={u}>
              {unitName(u)}
            </option>
          ))}
        </select>
      ) : (
        <span className="flex h-11 items-center px-1 text-sm text-stone-500">{unitName(shape.unit)}</span>
      )}
    </div>
  )
}

// ── Ingredient ──

const NOT_BULK = '__same__'

export const IngredientForm = ({
  open,
  onOpenChange,
  restaurant,
  ingredient,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  restaurant: Restaurant
  ingredient: Ingredient | null
  // Called with the created/updated ingredient (e.g. to drop it into a recipe).
  onSaved?: (i: Ingredient) => void
}) => {
  const actions = useEateryActions()
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<IngredientUnit>('pcs')
  const [purchaseUnit, setPurchaseUnit] = useState<string>(NOT_BULK)
  const [perPurchase, setPerPurchase] = useState<number | ''>('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState<number | ''>('')
  const [low, setLow] = useState<number | ''>('')
  const [supplier, setSupplier] = useState('')
  const [search, setSearch] = useState('')
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const i = ingredient
    setName(i?.name ?? '')
    setUnit(i?.unit ?? 'pcs')
    setPurchaseUnit(i && buysInBulk(i) ? i.purchaseUnit! : NOT_BULK)
    setPerPurchase(i && buysInBulk(i) ? perPurchaseOf(i) : '')
    setPrice(i ? String(purchasePrice(i)) : '')
    setStock(i ? i.stock : '')
    setLow(i ? i.lowStockAt : '')
    setSupplier(i?.supplier ?? '')
    setSearch('')
    setTried(false)
    actions.clearError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ingredient])

  const bulk = purchaseUnit !== NOT_BULK
  const per = bulk ? toNum(perPurchase) : 1
  const costPerUse = per > 0 ? toNum(price) / per : 0
  const shape: UnitShape = { unit, purchaseUnit: bulk ? purchaseUnit : undefined, perPurchase: bulk ? per : undefined }
  const rescale = ingredient ? rescaleFactor(ingredient, shape) : 1
  const problem = !name.trim()
    ? 'Give the ingredient a name'
    : bulk && !(per > 0)
      ? `How many ${unitName(unit)} are in one ${purchaseUnit}?`
      : toNum(price) < 0
        ? 'Price can’t be negative'
        : null
  const templates = templatesFor(restaurant.category).filter(
    (t) => !search.trim() || t.name.toLowerCase().includes(search.trim().toLowerCase())
  )

  const useTemplate = (t: IngredientTemplate) => {
    setName(t.name)
    setUnit(t.unit)
    setPurchaseUnit(t.purchaseUnit ?? NOT_BULK)
    setPerPurchase(t.perPurchase ?? '')
    setPrice(String(t.price))
  }

  const submit = async () => {
    setTried(true)
    if (problem) return
    setSaving(true)
    try {
      const body = {
        name: name.trim(),
        unit,
        purchaseUnit: bulk ? purchaseUnit : undefined,
        perPurchase: bulk ? per : undefined,
        costPerUnit: round(costPerUse, 6),
        lowStockAt: toNum(low),
        supplier: supplier.trim() || undefined,
      }
      let saved: Ingredient
      if (ingredient) {
        // Stock stays as counted; the server converts it (and recipes) when the counting unit changes.
        saved = await actions.update('ingredients', ingredient.id, {
          ...body,
          ...(rescale && rescale !== 1 ? { rescale } : {}),
        } as Partial<Ingredient>)
      } else saved = await actions.create('ingredients', { ...body, restaurantId: restaurant.id, stock: toNum(stock) })
      onSaved?.(saved)
      onOpenChange(false)
    } catch {
      // shown in the drawer
    } finally {
      setSaving(false)
    }
  }

  const useName = unitName(unit, 1)
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={ingredient ? `Edit ${ingredient.name}` : 'New ingredient'}
      description="Anything you buy to make or serve what you sell — food, drinks, tissue, boxes, gas."
      error={actions.error ?? (tried && problem ? { message: problem } : null)}
      footer={
        <>
          <span className="mr-auto text-sm text-stone-600">
            = <strong className="tabular-nums text-stone-900">{formatMoney(round(costPerUse, 4), restaurant.currency)}</strong> per{' '}
            {useName}
          </span>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={saving} onClick={() => void submit()}>
            {ingredient ? 'Save' : 'Add ingredient'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {!ingredient && (
          <section>
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-stone-700">
              <Sparkles className="h-4 w-4 text-amber-500" /> Start from a common item — then just check the price
            </p>
            <label className="relative mb-2 block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tissue, Coke, rice, gas…"
                aria-label="Search common items"
                className="h-10 w-full rounded-xl border border-stone-200 pl-9 pr-3 text-sm"
              />
            </label>
            <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
              {templates.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => useTemplate(t)}
                  className={cn(
                    'h-8 rounded-full border px-3 text-xs font-semibold',
                    name === t.name
                      ? 'border-endeavour bg-endeavour/10 text-endeavour'
                      : 'border-stone-200 text-stone-600 hover:border-stone-400'
                  )}
                >
                  {t.name}
                  {t.purchaseUnit && (
                    <span className="ml-1 font-normal text-stone-400">
                      · {t.purchaseUnit} of {amount(t.perPurchase ?? 1, t.unit)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        <Field label="Name" htmlFor="ing-name">
          <Input id="ing-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tissue" />
        </Field>

        <section className="rounded-2xl border border-stone-200 p-4">
          <p className="text-[13px] font-bold text-stone-800">How you buy it</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
            <Field label="You buy it by the" htmlFor="ing-buy">
              <Select
                id="ing-buy"
                value={purchaseUnit}
                onChange={(e) => setPurchaseUnit(e.target.value)}
                options={[
                  { value: NOT_BULK, label: `${unitName(unit, 1)} (one at a time)` },
                  ...PURCHASE_UNITS.map((u) => ({ value: u, label: u })),
                ]}
              />
            </Field>
            <Field
              label={`Price per ${bulk ? purchaseUnit : useName}`}
              htmlFor="ing-price"
              hint={ingredient ? 'Purchases update the average automatically' : undefined}
            >
              <Input
                id="ing-price"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                prefix={restaurant.currency === 'GHS' ? '₵' : undefined}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
            {bulk && (
              <Field label={`Each ${purchaseUnit} has`} htmlFor="ing-per">
                <Input
                  id="ing-per"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={perPurchase}
                  onChange={(e) => setPerPurchase(e.target.value === '' ? '' : toNum(e.target.value))}
                  placeholder="e.g. 50"
                />
              </Field>
            )}
            <Field label={bulk ? 'of (what recipes use)' : 'Recipes use it in'} htmlFor="ing-unit">
              <Select id="ing-unit" value={unit} onChange={(e) => setUnit(e.target.value as IngredientUnit)} options={USE_UNITS} />
            </Field>
          </div>
          <p className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-600">
            {bulk && per > 0 ? (
              <>
                1 {purchaseUnit} = {amount(per, unit)} → <strong>{formatMoney(round(costPerUse, 4), restaurant.currency)}</strong> per{' '}
                {useName}
              </>
            ) : (
              <>
                <strong>{formatMoney(round(costPerUse, 4), restaurant.currency)}</strong> per {useName}
                {['kg', 'l'].includes(unit) ? ` — recipes can still use ${unit === 'kg' ? 'grams' : 'ml'}` : ''}
              </>
            )}
          </p>
          {ingredient && ingredient.unit !== unit && (
            <p className={cn('mt-2 text-xs', rescale ? 'text-stone-500' : 'font-semibold text-amber-700')}>
              {rescale
                ? `Stock (${stockLabel(ingredient)}) and recipes using it will be converted: ${amount(1, ingredient.unit)} = ${amount(rescale, unit)}.`
                : `Can’t convert ${unitName(ingredient.unit)} to ${unitName(unit)} — after saving, count the stock again and check recipes using it.`}
            </p>
          )}
        </section>

        <FormGrid>
          {!ingredient && (
            <Field label="In stock now" htmlFor="ing-stock">
              <QuantityInput id="ing-stock" label="In stock now" shape={shape} value={stock} onChange={setStock} />
            </Field>
          )}
          <Field label="Warn me when below" htmlFor="ing-low">
            <QuantityInput id="ing-low" label="Warn me when below" shape={shape} value={low} onChange={setLow} />
          </Field>
          <Field label="Usual supplier" htmlFor="ing-sup">
            <Input id="ing-sup" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Makola market, Melcom…" />
          </Field>
        </FormGrid>
      </div>
    </Drawer>
  )
}

// ── Purchase / waste / count ──

export type StockAction = 'purchase' | 'waste' | 'count'

export const StockMoveForm = ({
  open,
  onOpenChange,
  restaurant,
  ingredient,
  action,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  restaurant: Restaurant
  ingredient: Ingredient | null
  action: StockAction
}) => {
  const actions = useEateryActions()
  const [qty, setQty] = useState<number | ''>('')
  const [total, setTotal] = useState('')
  const [supplier, setSupplier] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today())
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open) return
    setQty('')
    setTotal('')
    setSupplier(ingredient?.supplier ?? '')
    setNote('')
    setDate(today())
    setTried(false)
    actions.clearError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ingredient, action])
  if (!ingredient) return null
  const q = qty === '' ? 0 : qty
  const problem =
    action === 'count'
      ? qty === '' || q < 0
        ? 'Enter how much you counted'
        : null
      : q <= 0
        ? 'Enter a quantity above zero'
        : action === 'purchase' && toNum(total) < 0
          ? 'Cost can’t be negative'
          : null
  const newAvg = action === 'purchase' && q > 0 ? averageCost(ingredient, q, toNum(total)) : null
  const title =
    action === 'purchase' ? `Bought ${ingredient.name}` : action === 'waste' ? `Wasted ${ingredient.name}` : `Count ${ingredient.name}`
  const money = (n: number) => formatMoney(round(n, 4), restaurant.currency)
  const labels = costLabels(ingredient, money)
  const enteredText = () => {
    if (!buysInBulk(ingredient)) return amount(q, ingredient.unit)
    const per = perPurchaseOf(ingredient)
    const whole = Math.floor(q / per + 1e-9)
    const rest = round(q - whole * per, 2)
    return (
      [whole > 0 && amount(whole, ingredient.purchaseUnit!), rest > 0 && amount(rest, ingredient.unit)].filter(Boolean).join(' + ') ||
      amount(0, ingredient.unit)
    )
  }
  const submit = async () => {
    setTried(true)
    if (problem) return
    setSaving(true)
    try {
      await actions.create('stockMoves', {
        restaurantId: restaurant.id,
        ingredientId: ingredient.id,
        type: action,
        quantity: q,
        totalCost: action === 'purchase' ? toNum(total) : 0,
        date,
        supplier: action === 'purchase' ? supplier.trim() || undefined : undefined,
        note: note.trim() || undefined,
        entered: enteredText(),
      })
      onOpenChange(false)
    } catch {
      // shown in the drawer
    } finally {
      setSaving(false)
    }
  }
  const qLabel =
    action === 'count' ? 'Counted — what’s actually on the shelf' : action === 'purchase' ? 'How many did you buy?' : 'How much was wasted?'
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={`In stock: ${stockLabel(ingredient)} · ${labels.purchase ?? labels.use}`}
      error={actions.error ?? (tried && problem ? { message: problem } : null)}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={saving} onClick={() => void submit()}>
            {action === 'purchase' ? 'Add to stock' : action === 'waste' ? 'Record waste' : 'Save count'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label={qLabel} htmlFor="sm-qty">
          <QuantityInput id="sm-qty" label={qLabel} shape={ingredient} value={qty} onChange={setQty} />
        </Field>
        <FormGrid>
          {action === 'purchase' && (
            <Field label="Total paid" htmlFor="sm-total" hint="For everything you bought">
              <Input
                id="sm-total"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                prefix={restaurant.currency === 'GHS' ? '₵' : undefined}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
            </Field>
          )}
          <Field label="Date" htmlFor="sm-date">
            <Input id="sm-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          {action === 'purchase' && (
            <Field label="Supplier" htmlFor="sm-sup">
              <Input id="sm-sup" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </Field>
          )}
        </FormGrid>
        <Field label="Note" htmlFor="sm-note" hint={action === 'waste' ? 'e.g. burnt, expired, dropped' : 'Optional'}>
          <Textarea id="sm-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="rounded-xl bg-stone-50 p-3 text-sm text-stone-600">
          {action === 'purchase' && newAvg !== null ? (
            <>
              {enteredText()} → stock becomes <strong>{stockLabel({ ...ingredient, stock: ingredient.stock + q })}</strong>. Cost now{' '}
              <strong>{costLabels({ ...ingredient, costPerUnit: newAvg }, money).use}</strong>
              {buysInBulk(ingredient) && <> ({costLabels({ ...ingredient, costPerUnit: newAvg }, money).purchase})</>}.
            </>
          ) : action === 'waste' && q > 0 ? (
            <>
              Costs you <strong>{money(q * ingredient.costPerUnit)}</strong> — counted against profit.
            </>
          ) : action === 'count' && qty !== '' ? (
            q === ingredient.stock ? (
              'Matches the records.'
            ) : q < ingredient.stock ? (
              `${amount(round(ingredient.stock - q, 2), ingredient.unit)} less than recorded — check for unrecorded waste or sales without a recipe.`
            ) : (
              `${amount(round(q - ingredient.stock, 2), ingredient.unit)} more than recorded.`
            )
          ) : (
            'Enter a quantity to see the effect.'
          )}
        </div>
      </div>
    </Drawer>
  )
}

// ── Recipe lines (recipes and packaging) ──

const NEW = '__new__'

const LinesEditor = ({
  lines,
  onChange,
  ingredients,
  label,
  currency,
  warnings,
  onNewIngredient,
  onEditIngredient,
}: {
  lines: RecipeLine[]
  onChange: (l: RecipeLine[]) => void
  ingredients: Ingredient[]
  label: string
  currency: string
  warnings?: Map<number, { message: string; fixPackSize?: boolean }>
  // Opens the ingredient form; resolves with the created ingredient.
  onNewIngredient: (add: (i: Ingredient) => void) => void
  // Opens an existing ingredient (e.g. to set its pack size).
  onEditIngredient?: (i: Ingredient) => void
}) => {
  const byId = new Map(ingredients.map((i) => [i.id, i]))
  const unused = ingredients.filter((i) => !lines.some((l) => l.ingredientId === i.id))
  const setLine = (i: number, l: RecipeLine) => onChange(lines.map((x, j) => (j === i ? l : x)))
  return (
    <div className="flex flex-col gap-2">
      {lines.map((l, i) => {
        const ing = byId.get(l.ingredientId)
        if (!ing) return null
        const typed = typedOf(ing, l)
        const units = lineUnits(ing)
        const cost = l.quantity * ing.costPerUnit
        const warn = warnings?.get(ing.id)
        return (
          <div key={i} className={cn('rounded-xl border p-2', warn ? 'border-amber-300 bg-amber-50/50' : 'border-stone-200')}>
            <div className="grid grid-cols-[minmax(0,1fr)_88px_auto_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_96px_110px_72px_auto]">
              <select
                aria-label={`${label} ingredient ${i + 1}`}
                value={l.ingredientId}
                onChange={(e) => {
                  if (e.target.value === NEW) return onNewIngredient((n) => setLine(i, toLine(n, typed.value || 1)))
                  const next = byId.get(Number(e.target.value))!
                  setLine(i, toLine(next, typed.value))
                }}
                className="h-10 min-w-0 rounded-xl border border-stone-200 bg-white px-2 text-sm"
              >
                {ingredients
                  .filter((x) => x.id === l.ingredientId || !lines.some((y) => y.ingredientId === x.id))
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                <option value={NEW}>+ New ingredient…</option>
              </select>
              <Input
                aria-label={`${ing.name} quantity`}
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={typed.value}
                onChange={(e) => setLine(i, toLine(ing, toNum(e.target.value), typed.unit))}
              />
              <select
                aria-label={`${ing.name} unit`}
                value={typed.unit}
                onChange={(e) => setLine(i, toLine(ing, typed.value, e.target.value as IngredientUnit | 'purchase'))}
                className="hidden h-10 rounded-xl border border-stone-200 bg-white px-2 text-sm sm:block"
              >
                {units.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
              <span className="text-right text-sm font-semibold tabular-nums text-stone-700" aria-label={`${ing.name} cost`}>
                {formatMoney(round(cost, 2), currency)}
              </span>
              <button
                type="button"
                aria-label={`Remove ${ing.name}`}
                onClick={() => onChange(lines.filter((_, j) => j !== i))}
                className="flex h-10 w-9 items-center justify-center rounded-lg text-stone-400 hover:text-rose-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Phones: unit picker on its own row */}
            <select
              aria-hidden
              tabIndex={-1}
              value={typed.unit}
              onChange={(e) => setLine(i, toLine(ing, typed.value, e.target.value as IngredientUnit | 'purchase'))}
              className="mt-2 h-9 w-full rounded-xl border border-stone-200 bg-white px-2 text-sm sm:hidden"
            >
              {units.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
            {warn && (
              <div className="mt-1.5 flex flex-wrap items-start gap-x-2 gap-y-1 text-xs font-semibold text-amber-800">
                <p className="flex flex-1 items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {warn.message}
                </p>
                {warn.fixPackSize && onEditIngredient && (
                  <button
                    type="button"
                    onClick={() => onEditIngredient(ing)}
                    className="rounded-lg bg-amber-100 px-2 py-1 text-amber-900 hover:bg-amber-200"
                  >
                    Set pack size
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
      <div className="flex flex-wrap gap-2">
        {unused.length > 0 && (
          <Button variant="ghost" size="sm" icon={Plus} onClick={() => onChange([...lines, toLine(unused[0], 1)])}>
            Add ingredient
          </Button>
        )}
        <Button variant="ghost" size="sm" icon={Sparkles} onClick={() => onNewIngredient((n) => onChange([...lines, toLine(n, 1)]))}>
          New ingredient
        </Button>
      </div>
    </div>
  )
}

// One drawer to create an ingredient from inside a recipe, then drop it in.
const useInlineIngredient = (restaurant: Restaurant) => {
  const [pending, setPending] = useState<((i: Ingredient) => void) | null>(null)
  const form = (
    <IngredientForm
      open={!!pending}
      onOpenChange={(o) => !o && setPending(null)}
      restaurant={restaurant}
      ingredient={null}
      onSaved={(i) => pending?.(i)}
    />
  )
  return { open: (add: (i: Ingredient) => void) => setPending(() => add), form }
}

// ── Recipe ──

export const RecipeForm = ({
  open,
  onOpenChange,
  restaurant,
  item,
  recipe,
  recipes,
  ingredients,
  packaging = [],
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  restaurant: Restaurant
  item: MenuItem | null
  recipe: Recipe | null
  recipes: Recipe[]
  ingredients: Ingredient[]
  packaging?: PackagingRule[]
}) => {
  const actions = useEateryActions()
  const [base, setBase] = useState<RecipeLine[]>([])
  const [choices, setChoices] = useState<Record<string, RecipeLine[]>>({})
  const [saving, setSaving] = useState(false)
  const inline = useInlineIngredient(restaurant)
  const [editing, setEditing] = useState<Ingredient | null>(null)
  useEffect(() => {
    if (!open) return
    setBase(recipe?.ingredients ?? [])
    setChoices(recipe?.choices ?? {})
    actions.clearError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recipe])

  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients])
  if (!item) return null
  const money = (n: number) => formatMoney(n, restaurant.currency)
  const draft: Recipe = { id: recipe?.id ?? 0, restaurantId: restaurant.id, itemId: item.id, ingredients: base, choices }
  const recipeMap = new Map(recipes.filter((r) => r.itemId !== item.id).map((r) => [r.itemId, r]))
  recipeMap.set(item.id, draft)
  const defaultGroups = item.optionGroups.filter((g) => g.min >= 1 && g.max === 1)
  const defaults = Object.fromEntries(defaultGroups.map((g) => [g.id, [g.choices[0]?.id].filter(Boolean) as string[]]))
  const cost = itemCost(item, recipeMap, byId, defaults)
  const price = item.price + defaultGroups.reduce((s, g) => s + (g.choices[0]?.priceDelta ?? 0), 0)
  const m = margin(price, cost)
  const warnings = recipeWarnings(price, [...base, ...defaultGroups.flatMap((g) => choices[g.choices[0]?.id] ?? [])], byId, money)
  const lineWarnings = new Map(
    warnings.filter((w) => w.ingredientId).map((w) => [w.ingredientId!, { message: w.message, fixPackSize: w.fixPackSize }])
  )
  const overall = warnings.find((w) => !w.ingredientId)
  const extras = packaging.filter((p) => p.active)

  const submit = async () => {
    setSaving(true)
    const clean = (ls: RecipeLine[]) => ls.filter((l) => l.quantity !== 0)
    const body = {
      restaurantId: restaurant.id,
      itemId: item.id,
      ingredients: clean(base),
      choices: Object.fromEntries(
        Object.entries(choices)
          .map(([k, v]) => [k, clean(v)])
          .filter(([, v]) => (v as RecipeLine[]).length)
      ),
    }
    try {
      if (recipe) await actions.update('recipes', recipe.id, body)
      else await actions.create('recipes', body)
      onOpenChange(false)
    } catch {
      // shown in the drawer
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        wide
        title={`Recipe: ${item.name}`}
        description="What one serving uses. Every sale is then costed and taken out of stock."
        error={actions.error}
        footer={
          <>
            <span className="mr-auto text-sm text-stone-600">
              Costs <strong className="tabular-nums text-stone-900">{money(round(cost, 2))}</strong> · sells {money(price)} · profit{' '}
              <strong className="tabular-nums text-stone-900">{money(round(price - cost, 2))}</strong>{' '}
              <span className={cn('font-bold', m >= 0.6 ? 'text-emerald-700' : m >= 0.3 ? 'text-amber-700' : 'text-rose-700')}>
                ({Math.round(m * 100)}%)
              </span>
            </span>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void submit()}>
              Save recipe
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          {overall && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {overall.message}
            </p>
          )}
          <section>
            <p className="text-[13px] font-bold text-stone-800">{item.combo ? 'Extras for the combo (packaging…)' : 'One serving uses'}</p>
            <p className="mb-2 text-xs text-stone-500">
              {item.combo
                ? 'The items picked in the combo already bring their own recipes.'
                : 'One plate, cup, glass or slice — type quantities in whatever unit is easiest.'}
            </p>
            <LinesEditor
              lines={base}
              onChange={setBase}
              ingredients={ingredients}
              label="Base"
              currency={restaurant.currency}
              warnings={lineWarnings}
              onNewIngredient={inline.open}
              onEditIngredient={setEditing}
            />
          </section>
          {item.optionGroups.map((g) => (
            <section key={g.id}>
              <p className="text-[13px] font-bold text-stone-800">{g.name}</p>
              <p className="mb-2 text-xs text-stone-500">
                Extra ingredients when a customer picks one of these (use a minus to swap one out).
              </p>
              <div className="flex flex-col gap-3">
                {g.choices.map((c) => (
                  <div key={c.id} className="rounded-xl border border-stone-200 p-3">
                    <p className="mb-1.5 text-sm font-semibold text-stone-700">
                      {c.name}
                      {c.priceDelta ? (
                        <span className="ml-1 text-xs font-normal text-stone-400">
                          {c.priceDelta > 0 ? '+' : ''}
                          {money(c.priceDelta)}
                        </span>
                      ) : null}
                    </p>
                    <LinesEditor
                      lines={choices[c.id] ?? []}
                      onChange={(l) => setChoices((x) => ({ ...x, [c.id]: l }))}
                      ingredients={ingredients}
                      label={c.name}
                      currency={restaurant.currency}
                      onNewIngredient={inline.open}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
          {extras.length > 0 && (
            <p className="rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-500">
              Also counted on orders:{' '}
              {extras
                .map(
                  (p) => `${p.name} (${p.when === 'all' ? 'every order' : p.when === 'takeaway' ? 'take-away' : 'dine-in'}, per ${p.per})`
                )
                .join(' · ')}
              .
            </p>
          )}
        </div>
      </Drawer>
      {inline.form}
      {/* Fix an ingredient's pack size without leaving the recipe. The numbers
          typed here stay as they are, now read in the new unit ("1" pack → "1"
          piece) — that is what the owner meant. Other saved recipes are
          converted by the server so their meaning doesn't change. */}
      <IngredientForm open={!!editing} onOpenChange={(o) => !o && setEditing(null)} restaurant={restaurant} ingredient={editing} />
    </>
  )
}

// ── Packaging & extras ──

export const PackagingForm = ({
  open,
  onOpenChange,
  restaurant,
  rule,
  ingredients,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  restaurant: Restaurant
  rule: PackagingRule | null
  ingredients: Ingredient[]
}) => {
  const actions = useEateryActions()
  const inline = useInlineIngredient(restaurant)
  const [name, setName] = useState('')
  const [when, setWhen] = useState<PackagingRule['when']>('takeaway')
  const [per, setPer] = useState<PackagingRule['per']>('order')
  const [lines, setLines] = useState<RecipeLine[]>([])
  const [active, setActive] = useState(true)
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open) return
    setName(rule?.name ?? 'Take-away packaging')
    setWhen(rule?.when ?? 'takeaway')
    setPer(rule?.per ?? 'order')
    setLines(rule?.ingredients ?? [])
    setActive(rule?.active ?? true)
    setTried(false)
    actions.clearError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule])
  const byId = new Map(ingredients.map((i) => [i.id, i]))
  const cost = lines.reduce((s, l) => s + l.quantity * (byId.get(l.ingredientId)?.costPerUnit ?? 0), 0)
  const problem = !name.trim() ? 'Give it a name' : lines.length === 0 ? 'Add at least one item (tissue, a box…)' : null
  const submit = async () => {
    setTried(true)
    if (problem) return
    setSaving(true)
    const body = { restaurantId: restaurant.id, name: name.trim(), when, per, ingredients: lines.filter((l) => l.quantity > 0), active }
    try {
      if (rule) await actions.update('packaging', rule.id, body)
      else await actions.create('packaging', body)
      onOpenChange(false)
    } catch {
      // shown in the drawer
    } finally {
      setSaving(false)
    }
  }
  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        wide
        title={rule ? `Edit ${rule.name}` : 'Packaging & extras'}
        description="Things used on orders rather than in one dish — set them once instead of adding them to every recipe."
        error={actions.error ?? (tried && problem ? { message: problem } : null)}
        footer={
          <>
            <span className="mr-auto text-sm text-stone-600">
              <strong className="tabular-nums text-stone-900">{formatMoney(round(cost, 2), restaurant.currency)}</strong> per {per}
            </span>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void submit()}>
              {rule ? 'Save' : 'Add'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Field label="Name" htmlFor="pk-name">
            <Input id="pk-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Take-away packaging" />
          </Field>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-stone-700">Which orders</p>
            <Segmented
              ariaLabel="Which orders"
              value={when}
              onChange={setWhen}
              options={[
                { value: 'all', label: 'Every order' },
                { value: 'takeaway', label: 'Take-away & delivery' },
                { value: 'dine-in', label: 'Dine-in only' },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-stone-700">How often</p>
            <Segmented
              ariaLabel="How often"
              value={per}
              onChange={setPer}
              options={[
                { value: 'order', label: 'Once per order' },
                { value: 'item', label: 'For every item' },
              ]}
            />
            <p className="mt-1.5 text-xs text-stone-500">
              {per === 'order' ? 'e.g. one bag and two tissues per order.' : 'e.g. one box for every plate in the order.'}
            </p>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-stone-700">Uses</p>
            {ingredients.length === 0 ? (
              <Button variant="secondary" icon={Sparkles} onClick={() => inline.open((n) => setLines([toLine(n, 1)]))}>
                Add your first item (tissue, box…)
              </Button>
            ) : (
              <LinesEditor
                lines={lines}
                onChange={setLines}
                ingredients={ingredients}
                label="Packaging"
                currency={restaurant.currency}
                onNewIngredient={inline.open}
              />
            )}
          </div>
          <Toggle checked={active} onChange={setActive} label="On" hint="Switch off to stop counting it without deleting" />
        </div>
      </Drawer>
      {inline.form}
    </>
  )
}

// ── Expense ──

export const ExpenseForm = ({
  open,
  onOpenChange,
  restaurant,
  expense,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  restaurant: Restaurant
  expense: Expense | null
}) => {
  const actions = useEateryActions()
  const [category, setCategory] = useState<ExpenseCategory>('rent')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open) return
    setCategory(expense?.category ?? 'gas')
    setAmount(expense ? String(expense.amount) : '')
    setDate(expense?.date ?? today())
    setNote(expense?.note ?? '')
    setTried(false)
    actions.clearError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense])
  const problem = !(toNum(amount) > 0) ? 'Enter the amount' : null
  const submit = async () => {
    setTried(true)
    if (problem) return
    setSaving(true)
    const body = { restaurantId: restaurant.id, category, amount: toNum(amount), date, note: note.trim() || undefined }
    try {
      if (expense) await actions.update('expenses', expense.id, body)
      else await actions.create('expenses', body)
      onOpenChange(false)
    } catch {
      // shown in the drawer
    } finally {
      setSaving(false)
    }
  }
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={expense ? 'Edit expense' : 'Record an expense'}
      description="Running costs that aren’t ingredients. They come off your profit."
      error={actions.error ?? (tried && problem ? { message: problem } : null)}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={saving} onClick={() => void submit()}>
            {expense ? 'Save' : 'Record expense'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind of expense">
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={category === c.value}
              onClick={() => setCategory(c.value)}
              className={cn(
                'h-9 rounded-full border px-3 text-xs font-semibold',
                category === c.value ? 'border-endeavour bg-endeavour/10 text-endeavour' : 'border-stone-200 text-stone-600'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <FormGrid>
          <Field label="Amount" htmlFor="ex-amount">
            <Input
              id="ex-amount"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              prefix={restaurant.currency === 'GHS' ? '₵' : undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Date" htmlFor="ex-date">
            <Input id="ex-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </FormGrid>
        <Field label="Note" htmlFor="ex-note">
          <Textarea id="ex-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. October rent, 2 gas refills" />
        </Field>
      </div>
    </Drawer>
  )
}
