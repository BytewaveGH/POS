'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/kit/ui'
import { Drawer, Field, FormGrid, Input, Select, Textarea, toNum } from '@/components/kit/form'
import { useEateryActions } from '@/lib/eatery/hooks'
import { EXPENSE_CATEGORIES, UNITS, averageCost, itemCost, margin } from '@/lib/eatery/costing'
import { formatMoney } from '@/lib/eatery/menu'
import type { Expense, ExpenseCategory, Ingredient, IngredientUnit, MenuItem, Recipe, RecipeLine, Restaurant } from '@/lib/eatery/types'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const unitShort = (u: IngredientUnit) => (['g', 'kg', 'ml', 'l'].includes(u) ? u : ` ${u}`)
export const qtyLabel = (q: number, u: IngredientUnit) => `${Math.round(q * 100) / 100}${unitShort(u)}`
export const costPerUnitLabel = (cost: number, u: IngredientUnit, currency: string) => {
  // Show tiny per-gram costs per 1000 so they're readable.
  if (['g', 'ml'].includes(u) && cost < 0.1)
    return `${formatMoney(Math.round(cost * 1000 * 100) / 100, currency)} per ${u === 'g' ? 'kg' : 'litre'}`
  return `${formatMoney(Math.round(cost * 100) / 100, currency)} per ${u === 'pcs' ? 'piece' : u}`
}

// ── Ingredient ──

export const IngredientForm = ({
  open,
  onOpenChange,
  restaurant,
  ingredient,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  restaurant: Restaurant
  ingredient: Ingredient | null
}) => {
  const actions = useEateryActions()
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<IngredientUnit>('kg')
  const [cost, setCost] = useState('')
  const [stock, setStock] = useState('')
  const [low, setLow] = useState('')
  const [supplier, setSupplier] = useState('')
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open) return
    setName(ingredient?.name ?? '')
    setUnit(ingredient?.unit ?? 'kg')
    setCost(ingredient ? String(ingredient.costPerUnit) : '')
    setStock(ingredient ? String(ingredient.stock) : '')
    setLow(ingredient ? String(ingredient.lowStockAt) : '')
    setSupplier(ingredient?.supplier ?? '')
    setTried(false)
    actions.clearError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ingredient])
  const problem = !name.trim() ? 'Give the ingredient a name' : toNum(cost) < 0 ? 'Cost can’t be negative' : null
  const submit = async () => {
    setTried(true)
    if (problem) return
    setSaving(true)
    try {
      const body = { name: name.trim(), unit, costPerUnit: toNum(cost), lowStockAt: toNum(low), supplier: supplier.trim() || undefined }
      // Stock changes after creation go through purchases, waste and counts.
      if (ingredient) await actions.update('ingredients', ingredient.id, body)
      else await actions.create('ingredients', { ...body, restaurantId: restaurant.id, stock: toNum(stock) })
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
      title={ingredient ? `Edit ${ingredient.name}` : 'New ingredient'}
      description="Anything you buy to make what you sell — including packaging and bottled drinks."
      error={actions.error ?? (tried && problem ? { message: problem } : null)}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={saving} onClick={() => void submit()}>
            {ingredient ? 'Save' : 'Add ingredient'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <FormGrid>
          <Field label="Name" htmlFor="ing-name">
            <Input id="ing-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mozzarella" />
          </Field>
          <Field label="Measured in" htmlFor="ing-unit" hint="Recipes use this unit">
            <Select id="ing-unit" value={unit} onChange={(e) => setUnit(e.target.value as IngredientUnit)} options={UNITS} />
          </Field>
          <Field
            label={`Cost per ${unit === 'pcs' ? 'piece' : unit}`}
            htmlFor="ing-cost"
            hint={ingredient ? 'Purchases update this automatically' : 'What one unit costs you'}
          >
            <Input
              id="ing-cost"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </Field>
          {!ingredient && (
            <Field label="In stock now" htmlFor="ing-stock" hint={`In ${unit}`}>
              <Input
                id="ing-stock"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </Field>
          )}
          <Field label="Warn me when below" htmlFor="ing-low" hint={`In ${unit}`}>
            <Input id="ing-low" type="number" min={0} step="any" inputMode="decimal" value={low} onChange={(e) => setLow(e.target.value)} />
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
  const [qty, setQty] = useState('')
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
  const q = toNum(qty)
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
      })
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
      title={title}
      description={`In stock: ${qtyLabel(ingredient.stock, ingredient.unit)} · ${costPerUnitLabel(ingredient.costPerUnit, ingredient.unit, restaurant.currency)}`}
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
        <FormGrid>
          <Field
            label={action === 'count' ? `Counted (${ingredient.unit})` : `Quantity (${ingredient.unit})`}
            htmlFor="sm-qty"
            hint={action === 'count' ? 'What’s actually on the shelf' : undefined}
          >
            <Input id="sm-qty" type="number" min={0} step="any" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          {action === 'purchase' && (
            <Field label="Total paid" htmlFor="sm-total" hint="For the whole quantity">
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
          {action === 'purchase' && newAvg !== null && (
            <>
              Stock becomes <strong>{qtyLabel(ingredient.stock + q, ingredient.unit)}</strong>. New average cost:{' '}
              <strong>{costPerUnitLabel(newAvg, ingredient.unit, restaurant.currency)}</strong>.
            </>
          )}
          {action === 'waste' && q > 0 && (
            <>
              Costs you <strong>{formatMoney(Math.round(q * ingredient.costPerUnit * 100) / 100, restaurant.currency)}</strong> — counted
              against profit.
            </>
          )}
          {action === 'count' && qty !== '' && (
            <>
              {q === ingredient.stock
                ? 'Matches the records.'
                : q < ingredient.stock
                  ? `${qtyLabel(ingredient.stock - q, ingredient.unit)} less than recorded — check for unrecorded waste or sales without a recipe.`
                  : `${qtyLabel(q - ingredient.stock, ingredient.unit)} more than recorded.`}
            </>
          )}
          {((action === 'purchase' && newAvg === null) || (action === 'waste' && q <= 0) || (action === 'count' && qty === '')) && (
            <>Enter a quantity to see the effect.</>
          )}
        </div>
      </div>
    </Drawer>
  )
}

// ── Recipe ──

const LinesEditor = ({
  lines,
  onChange,
  ingredients,
  label,
}: {
  lines: RecipeLine[]
  onChange: (l: RecipeLine[]) => void
  ingredients: Ingredient[]
  label: string
}) => {
  const byId = new Map(ingredients.map((i) => [i.id, i]))
  const unused = ingredients.filter((i) => !lines.some((l) => l.ingredientId === i.id))
  return (
    <div className="flex flex-col gap-1.5">
      {lines.map((l, i) => {
        const ing = byId.get(l.ingredientId)
        return (
          <div key={i} className="grid grid-cols-[1fr_120px_auto] items-center gap-2">
            <Select
              aria-label={`${label} ingredient ${i + 1}`}
              value={l.ingredientId}
              onChange={(e) => onChange(lines.map((x, j) => (j === i ? { ...x, ingredientId: Number(e.target.value) } : x)))}
              options={ingredients
                .filter((x) => x.id === l.ingredientId || !lines.some((y) => y.ingredientId === x.id))
                .map((x) => ({ value: x.id, label: x.name }))}
            />
            <div className="relative">
              <Input
                aria-label={`${ing?.name ?? 'Ingredient'} quantity`}
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={l.quantity}
                onChange={(e) => onChange(lines.map((x, j) => (j === i ? { ...x, quantity: toNum(e.target.value) } : x)))}
                className="pr-12"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">{ing?.unit}</span>
            </div>
            <button
              type="button"
              aria-label={`Remove ${ing?.name ?? 'ingredient'}`}
              onClick={() => onChange(lines.filter((_, j) => j !== i))}
              className="h-10 w-9 flex items-center justify-center rounded-lg text-stone-400 hover:text-rose-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
      {unused.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          icon={Plus}
          className="self-start"
          onClick={() => onChange([...lines, { ingredientId: unused[0].id, quantity: 0 }])}
        >
          Add ingredient
        </Button>
      )}
    </div>
  )
}

export const RecipeForm = ({
  open,
  onOpenChange,
  restaurant,
  item,
  recipe,
  recipes,
  ingredients,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  restaurant: Restaurant
  item: MenuItem | null
  recipe: Recipe | null
  recipes: Recipe[]
  ingredients: Ingredient[]
}) => {
  const actions = useEateryActions()
  const [base, setBase] = useState<RecipeLine[]>([])
  const [choices, setChoices] = useState<Record<string, RecipeLine[]>>({})
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open) return
    setBase(recipe?.ingredients ?? [])
    setChoices(recipe?.choices ?? {})
    actions.clearError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recipe])

  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients])
  if (!item) return null
  const draft: Recipe = { id: recipe?.id ?? 0, restaurantId: restaurant.id, itemId: item.id, ingredients: base, choices }
  const recipeMap = new Map(recipes.filter((r) => r.itemId !== item.id).map((r) => [r.itemId, r]))
  recipeMap.set(item.id, draft)
  const defaults = Object.fromEntries(
    item.optionGroups.filter((g) => g.min >= 1 && g.max === 1).map((g) => [g.id, [g.choices[0]?.id].filter(Boolean) as string[]])
  )
  const cost = itemCost(item, recipeMap, byId, defaults)
  const m = margin(
    item.price + item.optionGroups.filter((g) => g.min >= 1 && g.max === 1).reduce((s, g) => s + (g.choices[0]?.priceDelta ?? 0), 0),
    cost
  )

  const submit = async () => {
    setSaving(true)
    const clean = (ls: RecipeLine[]) => ls.filter((l) => l.quantity > 0)
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
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={`Recipe: ${item.name}`}
      description="What goes into one portion. Used to cost every sale and take ingredients out of stock."
      error={actions.error}
      footer={
        <>
          <span className="mr-auto text-sm text-stone-600">
            Costs <strong className="tabular-nums text-stone-900">{formatMoney(cost, restaurant.currency)}</strong> ·{' '}
            <span className={cn('font-bold', m >= 0.6 ? 'text-emerald-700' : m >= 0.3 ? 'text-amber-700' : 'text-rose-700')}>
              {Math.round(m * 100)}% margin
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
      {ingredients.length === 0 ? (
        <p className="text-sm text-stone-500">Add ingredients first, then come back to build the recipe.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <section>
            <p className="text-[13px] font-bold text-stone-800 mb-1">
              {item.combo ? 'Extras for the combo (packaging…)' : 'One portion uses'}
            </p>
            {item.combo && <p className="text-xs text-stone-500 mb-2">The items picked in the combo already bring their own recipes.</p>}
            <LinesEditor lines={base} onChange={setBase} ingredients={ingredients} label="Base" />
          </section>
          {item.optionGroups.map((g) => (
            <section key={g.id}>
              <p className="text-[13px] font-bold text-stone-800">{g.name}</p>
              <p className="text-xs text-stone-500 mb-2">Extra ingredients when a customer picks one of these.</p>
              <div className="flex flex-col gap-3">
                {g.choices.map((c) => (
                  <div key={c.id} className="rounded-xl border border-stone-200 p-3">
                    <p className="text-sm font-semibold text-stone-700 mb-1.5">
                      {c.name}
                      {c.priceDelta ? (
                        <span className="ml-1 text-xs font-normal text-stone-400">
                          {c.priceDelta > 0 ? '+' : ''}
                          {formatMoney(c.priceDelta, restaurant.currency)}
                        </span>
                      ) : null}
                    </p>
                    <LinesEditor
                      lines={choices[c.id] ?? []}
                      onChange={(l) => setChoices((x) => ({ ...x, [c.id]: l }))}
                      ingredients={ingredients}
                      label={c.name}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Drawer>
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
