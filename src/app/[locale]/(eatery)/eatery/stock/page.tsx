'use client'

import React, { useMemo, useState } from 'react'
import { AlertTriangle, Boxes, ChefHat, Coins, History, Package, Pencil, Plus, Receipt, ShoppingCart, Trash2, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Card, EmptyState, PageHeader, StatCard } from '@/components/kit/ui'
import { ConfirmDialog } from '@/components/kit/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEateryActions, useNow, type OwnerData } from '@/lib/eatery/hooks'
import { expenseLabel, itemCost, margin, periodRange, stockStatus } from '@/lib/eatery/costing'
import { amount, costLabels, fromTemplate, stockLabel, templatesFor } from '@/lib/eatery/units'
import { formatMoney } from '@/lib/eatery/menu'
import type { Expense, Ingredient, MenuItem, PackagingRule, Restaurant, StockMoveType } from '@/lib/eatery/types'
import { EateryFrame, RestaurantSwitcher } from '../_components/frame'
import {
  ExpenseForm,
  IngredientForm,
  PackagingForm,
  RecipeForm,
  StockMoveForm,
  qtyLabel,
  type StockAction,
} from '../_components/stock-forms'

const MOVE_LABEL: Record<StockMoveType, { label: string; className: string }> = {
  purchase: { label: 'Bought', className: 'bg-emerald-50 text-emerald-700' },
  usage: { label: 'Used in order', className: 'bg-stone-100 text-stone-600' },
  return: { label: 'Order cancelled', className: 'bg-sky-50 text-sky-700' },
  waste: { label: 'Wasted', className: 'bg-rose-50 text-rose-700' },
  count: { label: 'Stock count', className: 'bg-amber-50 text-amber-700' },
}

const MarginBadge = ({ m, costed }: { m: number; costed: boolean }) =>
  costed ? (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
        m >= 0.6 ? 'bg-emerald-50 text-emerald-700' : m >= 0.3 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
      )}
    >
      {Math.round(m * 100)}% margin
    </span>
  ) : (
    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-500">No recipe</span>
  )

const Tab = ({
  value,
  icon: Icon,
  label,
  count,
}: {
  value: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  count?: number
}) => (
  <TabsTrigger value={value} className="rounded-lg data-[state=active]:shadow-sm">
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-4 w-4" /> {label}
      {count !== undefined && <span className="text-[11px] text-stone-400 tabular-nums">{count}</span>}
    </span>
  </TabsTrigger>
)

const StockScreen = ({ o }: { o: OwnerData & { restaurant: Restaurant } }) => {
  const r = o.restaurant
  const now = useNow()
  const actions = useEateryActions()
  const [ingForm, setIngForm] = useState<{ ingredient: Ingredient | null } | null>(null)
  const [move, setMove] = useState<{ ingredient: Ingredient; action: StockAction } | null>(null)
  const [recipeFor, setRecipeFor] = useState<MenuItem | null>(null)
  const [expenseForm, setExpenseForm] = useState<{ expense: Expense | null } | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'ingredients' | 'expenses' | 'packaging'; id: number; label: string } | null>(null)
  const [packForm, setPackForm] = useState<{ rule: PackagingRule | null } | null>(null)
  const [historyType, setHistoryType] = useState<StockMoveType | 'all'>('all')
  const [adding, setAdding] = useState(false)

  const ingById = useMemo(() => new Map(o.ingredients.map((i) => [i.id, i])), [o.ingredients])
  const recipeByItem = useMemo(() => new Map(o.recipes.map((x) => [x.itemId, x])), [o.recipes])
  const month = periodRange('month', now)
  const inMonth = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso) >= month.from
  const stockValue = o.ingredients.reduce((s, i) => s + Math.max(0, i.stock) * i.costPerUnit, 0)
  const alerts = o.ingredients.filter((i) => stockStatus(i) !== 'ok')
  const boughtThisMonth = o.stockMoves.filter((m) => m.type === 'purchase' && inMonth(m.date)).reduce((s, m) => s + m.totalCost, 0)
  const expensesThisMonth = o.expenses.filter((e) => inMonth(e.date)).reduce((s, e) => s + e.amount, 0)
  const suggestions = templatesFor(r.category).filter((t) => !o.ingredients.some((i) => i.name.toLowerCase() === t.name.toLowerCase()))
  const money = (n: number) => formatMoney(n, r.currency)
  const sellable = o.items.filter((i) => i.status !== 'hidden')
  const orderCode = new Map(o.orders.map((x) => [x.id, x.code]))

  const addSuggestions = async () => {
    setAdding(true)
    try {
      await actions.createMany(
        'ingredients',
        suggestions.map((t) => fromTemplate(t, r.id))
      )
    } catch {
      // toast shown
    } finally {
      setAdding(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={r.name}
        title="Ingredients & costs"
        description="What you buy, what each dish costs to make, what gets wasted and what it costs to run the place — so the overview can show real profit."
        actions={<RestaurantSwitcher o={o} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Stock on hand"
          value={formatMoney(Math.round(stockValue), r.currency)}
          hint={`${o.ingredients.length} ingredients`}
          icon={Package}
          tone="blue"
        />
        <StatCard
          label="Running low"
          value={alerts.length}
          hint={
            alerts.length
              ? alerts
                  .slice(0, 2)
                  .map((i) => i.name)
                  .join(', ')
              : 'All stocked'
          }
          icon={AlertTriangle}
          tone={alerts.length ? 'amber' : 'green'}
        />
        <StatCard label="Bought this month" value={formatMoney(Math.round(boughtThisMonth), r.currency)} icon={ShoppingCart} tone="stone" />
        <StatCard label="Expenses this month" value={formatMoney(Math.round(expensesThisMonth), r.currency)} icon={Wallet} tone="rose" />
      </div>

      <Tabs defaultValue="ingredients">
        <TabsList className="h-auto p-1 rounded-xl bg-stone-100 flex-wrap justify-start">
          <Tab value="ingredients" icon={Package} label="Ingredients" count={o.ingredients.length} />
          <Tab value="recipes" icon={ChefHat} label="Recipes & margins" />
          <Tab value="packaging" icon={Boxes} label="Packaging & extras" count={o.packaging.length} />
          <Tab value="expenses" icon={Receipt} label="Expenses" count={o.expenses.length} />
          <Tab value="history" icon={History} label="Stock history" />
        </TabsList>

        <TabsContent value="ingredients" className="mt-4">
          <div className="flex flex-wrap justify-end gap-2 mb-3">
            {suggestions.length > 0 && o.ingredients.length < 4 && (
              <Button variant="secondary" loading={adding} onClick={() => void addSuggestions()}>
                Add {suggestions.length} common ingredients
              </Button>
            )}
            <Button icon={Plus} onClick={() => setIngForm({ ingredient: null })}>
              New ingredient
            </Button>
          </div>
          {o.ingredients.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No ingredients yet"
              description="Add what you buy — flour, cheese, chicken, gin, milk, cups — with what it costs you."
            />
          ) : (
            <Card className="divide-y divide-stone-100">
              {o.ingredients.map((i) => {
                const st = stockStatus(i)
                return (
                  <div key={i.id} role="group" aria-label={i.name} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-stone-900">
                        {i.name}
                        {st !== 'ok' && (
                          <span
                            className={cn(
                              'ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold align-middle',
                              st === 'out' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                            )}
                          >
                            {st === 'out' ? 'Out of stock' : 'Low'}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-500">
                        {(() => {
                          const c = costLabels(i, money)
                          return c.purchase ? `${c.use} · ${c.purchase}` : c.use
                        })()}
                        {i.supplier ? ` · ${i.supplier}` : ''}
                      </p>
                    </div>
                    <div className="text-left sm:text-right sm:w-36">
                      <p className={cn('font-extrabold tabular-nums', i.stock < 0 ? 'text-rose-700' : 'text-stone-900')}>{stockLabel(i)}</p>
                      <p className="text-[11px] text-stone-400 tabular-nums">
                        worth {formatMoney(Math.round(Math.max(0, i.stock) * i.costPerUnit * 100) / 100, r.currency)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" onClick={() => setMove({ ingredient: i, action: 'purchase' })}>
                        Bought
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setMove({ ingredient: i, action: 'waste' })}>
                        Waste
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setMove({ ingredient: i, action: 'count' })}>
                        Count
                      </Button>
                      <button
                        type="button"
                        aria-label={`Edit ${i.name}`}
                        onClick={() => setIngForm({ ingredient: i })}
                        className="h-9 w-9 flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${i.name}`}
                        onClick={() => setConfirm({ kind: 'ingredients', id: i.id, label: i.name })}
                        className="h-9 w-9 flex items-center justify-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recipes" className="mt-4">
          <p className="text-sm text-stone-500 mb-3">
            Set what one portion uses. Every sale is then costed and taken out of stock when it’s accepted. Margins use the first
            size/choice.
          </p>
          <Card className="divide-y divide-stone-100">
            {sellable.map((item) => {
              const rec = recipeByItem.get(item.id)
              const costed = !!rec && (rec.ingredients.length > 0 || Object.keys(rec.choices).length > 0)
              const defaults = Object.fromEntries(
                item.optionGroups
                  .filter((g) => g.min >= 1 && g.max === 1)
                  .map((g) => [g.id, [g.choices[0]?.id].filter(Boolean) as string[]])
              )
              const price =
                item.price +
                item.optionGroups.filter((g) => g.min >= 1 && g.max === 1).reduce((s, g) => s + (g.choices[0]?.priceDelta ?? 0), 0)
              const cost = itemCost(item, recipeByItem, ingById, defaults)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRecipeFor(item)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50"
                  aria-label={`Recipe for ${item.name}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-stone-900 truncate">{item.name}</p>
                    <p className="text-xs text-stone-500 tabular-nums">
                      Sells {formatMoney(price, r.currency)}
                      {costed
                        ? ` · costs ${formatMoney(cost, r.currency)} · profit ${formatMoney(Math.round((price - cost) * 100) / 100, r.currency)}`
                        : ''}
                    </p>
                  </div>
                  <MarginBadge m={margin(price, cost)} costed={costed || (!!item.combo && cost > 0)} />
                </button>
              )
            })}
          </Card>
        </TabsContent>

        <TabsContent value="packaging" className="mt-4">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm text-stone-500">
              Tissue, take-away boxes, bags, straws… Set them once here instead of adding them to every recipe. They’re taken out of stock
              and counted in profit on every matching order.
            </p>
            <Button icon={Plus} onClick={() => setPackForm({ rule: null })}>
              Add packaging
            </Button>
          </div>
          {o.packaging.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No packaging set up"
              description="e.g. “Take-away packaging: 1 box per item, 1 bag and 2 tissues per order”."
            />
          ) : (
            <Card className="divide-y divide-stone-100">
              {o.packaging.map((p) => {
                const cost = p.ingredients.reduce((s2, l) => s2 + l.quantity * (ingById.get(l.ingredientId)?.costPerUnit ?? 0), 0)
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <button type="button" onClick={() => setPackForm({ rule: p })} className="min-w-0 flex-1 text-left">
                      <p className="font-semibold text-stone-900">
                        {p.name}
                        {!p.active && (
                          <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500 align-middle">
                            Off
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-500">
                        {p.when === 'all' ? 'Every order' : p.when === 'takeaway' ? 'Take-away & delivery' : 'Dine-in'} · per {p.per} ·{' '}
                        {p.ingredients
                          .map(
                            (l) =>
                              `${amount(l.quantity, ingById.get(l.ingredientId)?.unit ?? 'pcs')} ${ingById.get(l.ingredientId)?.name ?? '?'}`
                          )
                          .join(', ')}
                      </p>
                    </button>
                    <p className="font-extrabold tabular-nums text-stone-900">{money(Math.round(cost * 100) / 100)}</p>
                    <button
                      type="button"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => setConfirm({ kind: 'packaging', id: p.id, label: p.name })}
                      className="h-9 w-9 flex items-center justify-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button icon={Plus} onClick={() => setExpenseForm({ expense: null })}>
              Record expense
            </Button>
          </div>
          {o.expenses.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="No expenses yet"
              description="Rent, wages, light bill, cooking gas, packaging — record them so profit is real profit."
            />
          ) : (
            <Card className="divide-y divide-stone-100">
              {o.expenses.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <button type="button" onClick={() => setExpenseForm({ expense: e })} className="min-w-0 flex-1 text-left">
                    <p className="font-semibold text-stone-900">{expenseLabel(e.category)}</p>
                    <p className="text-xs text-stone-500">
                      {new Date(`${e.date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      {e.note ? ` · ${e.note}` : ''}
                    </p>
                  </button>
                  <p className="font-extrabold tabular-nums text-stone-900">{formatMoney(e.amount, r.currency)}</p>
                  <button
                    type="button"
                    aria-label={`Delete ${expenseLabel(e.category)} expense`}
                    onClick={() => setConfirm({ kind: 'expenses', id: e.id, label: `${expenseLabel(e.category)} expense` })}
                    className="h-9 w-9 flex items-center justify-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(['all', 'purchase', 'usage', 'waste', 'count', 'return'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={historyType === t}
                onClick={() => setHistoryType(t)}
                className={cn(
                  'h-8 rounded-full border px-3 text-xs font-semibold',
                  historyType === t ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-600'
                )}
              >
                {t === 'all' ? 'Everything' : MOVE_LABEL[t].label}
              </button>
            ))}
          </div>
          <Card className="divide-y divide-stone-100">
            {o.stockMoves.filter((m) => historyType === 'all' || m.type === historyType).length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-stone-400">Nothing recorded yet.</p>
            )}
            {o.stockMoves
              .filter((m) => historyType === 'all' || m.type === historyType)
              .slice(0, 200)
              .map((m) => {
                const ing = ingById.get(m.ingredientId)
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap', MOVE_LABEL[m.type].className)}>
                      {MOVE_LABEL[m.type].label}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold text-stone-800">{ing?.name ?? 'Deleted ingredient'}</span>
                      <span className="text-stone-400">
                        {' '}
                        ·{' '}
                        {new Date(m.date.length === 10 ? `${m.date}T12:00:00` : m.date).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                        })}
                        {m.orderId ? ` · order #${orderCode.get(m.orderId) ?? m.orderId}` : ''}
                        {m.supplier ? ` · ${m.supplier}` : ''}
                        {m.note ? ` · ${m.note}` : ''}
                      </span>
                    </span>
                    <span className={cn('tabular-nums font-semibold', m.quantity >= 0 ? 'text-emerald-700' : 'text-stone-700')}>
                      {m.quantity >= 0 ? '+' : '−'}
                      {m.entered && m.type !== 'count' ? m.entered : ing ? amount(Math.abs(m.quantity), ing.unit) : Math.abs(m.quantity)}
                    </span>
                    <span className="w-24 text-right tabular-nums text-stone-500">{formatMoney(Math.abs(m.totalCost), r.currency)}</span>
                  </div>
                )
              })}
          </Card>
        </TabsContent>
      </Tabs>

      <IngredientForm
        open={!!ingForm}
        onOpenChange={(v) => !v && setIngForm(null)}
        restaurant={r}
        ingredient={ingForm?.ingredient ?? null}
      />
      <StockMoveForm
        open={!!move}
        onOpenChange={(v) => !v && setMove(null)}
        restaurant={r}
        ingredient={move?.ingredient ?? null}
        action={move?.action ?? 'purchase'}
      />
      <RecipeForm
        open={!!recipeFor}
        onOpenChange={(v) => !v && setRecipeFor(null)}
        restaurant={r}
        item={recipeFor}
        recipe={recipeFor ? (recipeByItem.get(recipeFor.id) ?? null) : null}
        recipes={o.recipes}
        ingredients={o.ingredients}
        packaging={o.packaging}
      />
      <PackagingForm
        open={!!packForm}
        onOpenChange={(v) => !v && setPackForm(null)}
        restaurant={r}
        rule={packForm?.rule ?? null}
        ingredients={o.ingredients}
      />
      <ExpenseForm
        open={!!expenseForm}
        onOpenChange={(v) => !v && setExpenseForm(null)}
        restaurant={r}
        expense={expenseForm?.expense ?? null}
      />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={`Delete ${confirm?.label ?? ''}?`}
        description={
          confirm?.kind === 'ingredients'
            ? 'Its stock history stays for your records.'
            : confirm?.kind === 'packaging'
              ? 'It stops being counted on new orders.'
              : 'It no longer counts against profit.'
        }
        onConfirm={() => (confirm ? actions.remove(confirm.kind, confirm.id) : undefined)}
      />
    </>
  )
}

export default function StockPage() {
  return <EateryFrame>{(o) => <StockScreen o={o} />}</EateryFrame>
}
