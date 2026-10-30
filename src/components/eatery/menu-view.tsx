'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BadgePercent, Check, Flame, Plus, Search, ShieldAlert, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  bestPromotion,
  formatMoney,
  inAnyWindow,
  itemAvailability,
  promotionLive,
  round2,
  windowLabel,
  type Availability,
} from '@/lib/eatery/menu'
import type { MenuCategory, MenuItem, Promotion, StorefrontBundle } from '@/lib/eatery/types'
import { ItemArt, TagList } from './theme-scope'

// The `min` cheapest choices of a required group (in stock ones, if any are).
const cheapest = (g: MenuItem['optionGroups'][number]) => {
  const inStock = g.choices.filter((c) => !c.soldOut)
  return (inStock.length ? inStock : g.choices)
    .map((c) => c.priceDelta)
    .sort((a, b) => a - b)
    .slice(0, g.min)
    .reduce((s, d) => s + d, 0)
}

// Lowest possible price: base + cheapest choices of every required group.
export const fromPrice = (item: MenuItem) =>
  round2(
    item.price +
      item.optionGroups.filter((g) => g.min > 0).reduce((s, g) => s + cheapest(g), 0) +
      (item.combo?.slots ?? []).reduce((s, sl) => s + Math.min(...sl.choices.map((c) => c.upcharge), 0), 0)
  )
const hasRange = (item: MenuItem) => item.optionGroups.some((g) => g.min > 0 && new Set(g.choices.map((c) => c.priceDelta)).size > 1)

// Can go straight into the order without opening the options sheet.
export const isQuickAdd = (item: MenuItem) => !item.combo && !item.optionGroups.some((g) => g.min > 0)

type Theme = StorefrontBundle['restaurant']['theme']

const Price = ({
  item,
  promotion,
  currency,
  className,
}: {
  item: MenuItem
  promotion?: Promotion
  currency: string
  className?: string
}) => {
  const base = fromPrice(item)
  const now = promotion ? round2(base * (1 - promotion.percentOff / 100)) : base
  return (
    <span className={cn('inline-flex items-baseline gap-1.5 whitespace-nowrap', className)}>
      {hasRange(item) && <span className="text-[11px] font-semibold e-muted">from</span>}
      <span className="e-price">{formatMoney(now, currency)}</span>
      {promotion && (
        <s className="text-xs e-muted" aria-label={`was ${formatMoney(base, currency)}`}>
          {formatMoney(base, currency)}
        </s>
      )}
    </span>
  )
}

const Unavailable = ({ a }: { a: Availability }) =>
  a.orderable ? null : (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold e-soft" style={{ color: 'var(--e-text)' }}>
      {a.reason === 'not-now' ? `Available ${a.label}` : a.label}
    </span>
  )

const InCart = ({ n }: { n: number }) =>
  n > 0 ? (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold e-accent">
      <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> {n} in your order
    </span>
  ) : null

interface ItemProps {
  item: MenuItem
  availability: Availability
  promotion?: Promotion
  currency: string
  addLabel: string
  inCart: number
  onOpen: () => void
  // Only for items with no required choices, while ordering is open.
  onQuickAdd?: () => void
  theme: Theme
}

const label = (p: ItemProps) => `${p.item.name}${p.availability.orderable ? '' : ` — ${p.availability.label}`}`

// The round "+" (or "Choose" for items with options). A sibling of the card
// button, never inside it.
const AddButton = ({ p, className, size = 40 }: { p: ItemProps; className?: string; size?: number }) => {
  if (!p.availability.orderable) return null
  const common = 'flex items-center justify-center shadow-md transition-transform active:scale-95 e-focus'
  const style = {
    width: size,
    height: size,
    background: 'var(--e-primary)',
    color: 'var(--e-on-primary)',
    borderRadius: 'var(--e-radius-control)',
  }
  return p.onQuickAdd ? (
    <button type="button" onClick={p.onQuickAdd} aria-label={`Add ${p.item.name}`} className={cn(common, className)} style={style}>
      <Plus className="h-5 w-5" strokeWidth={3} />
    </button>
  ) : (
    <button
      type="button"
      onClick={p.onOpen}
      aria-label={`Choose options for ${p.item.name}`}
      className={cn(common, className)}
      style={style}
      tabIndex={-1}
    >
      <SlidersHorizontal className="h-4 w-4" strokeWidth={2.5} />
    </button>
  )
}

const ElegantRow = (p: ItemProps) => (
  <li className="relative">
    <button
      type="button"
      onClick={p.onOpen}
      disabled={!p.availability.orderable}
      className="group w-full py-4 pr-14 text-left disabled:opacity-55 e-focus"
      aria-label={label(p)}
    >
      <span className="flex items-baseline gap-3">
        <span className="e-display text-[21px] group-hover:opacity-80">{p.item.name}</span>
        <span className="e-leader" aria-hidden />
        <Price item={p.item} promotion={p.promotion} currency={p.currency} className="text-base" />
      </span>
      {p.item.description && <span className="mt-1 block max-w-xl text-sm italic leading-relaxed e-muted">{p.item.description}</span>}
      <span className="mt-2 flex flex-wrap items-center gap-2">
        <TagList tags={p.item.tags} />
        <Unavailable a={p.availability} />
        <InCart n={p.inCart} />
      </span>
    </button>
    <AddButton p={p} size={36} className="absolute right-0 top-4" />
  </li>
)

const GridTile = (p: ItemProps) => (
  <li className="relative">
    <button
      type="button"
      onClick={p.onOpen}
      disabled={!p.availability.orderable}
      className="flex h-full w-full flex-col overflow-hidden text-left e-card disabled:opacity-55 e-focus transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgba(0,0,0,0.5)]"
      aria-label={label(p)}
    >
      <div className="relative">
        <ItemArt name={p.item.name} imageUrl={p.item.imageUrl} theme={p.theme} className="aspect-square w-full" />
        <span className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {p.promotion && <span className="rounded-full px-2 py-0.5 text-[11px] font-extrabold e-accent">−{p.promotion.percentOff}%</span>}
          {p.item.tags.includes('popular') && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{ background: 'var(--e-surface)', color: 'var(--e-text)' }}
            >
              <Flame className="h-3 w-3" aria-hidden /> Popular
            </span>
          )}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <span className="e-display text-xl leading-tight">{p.item.name}</span>
        {p.item.description && <span className="mt-1 line-clamp-2 text-xs e-muted">{p.item.description}</span>}
        <span className="mt-auto flex flex-wrap items-center justify-between gap-1 pt-2">
          <Price item={p.item} promotion={p.promotion} currency={p.currency} className="text-[15px]" />
          <Unavailable a={p.availability} />
        </span>
        {p.inCart > 0 && (
          <span className="mt-1.5">
            <InCart n={p.inCart} />
          </span>
        )}
      </div>
    </button>
    <AddButton p={p} className="absolute right-2 top-2" />
  </li>
)

const CozyCard = (p: ItemProps) => (
  <li className="relative">
    <button
      type="button"
      onClick={p.onOpen}
      disabled={!p.availability.orderable}
      className="flex w-full gap-4 p-3 pr-4 text-left e-card disabled:opacity-55 e-focus shadow-[0_8px_24px_-20px_rgba(0,0,0,0.45)] transition-shadow hover:shadow-[0_14px_30px_-18px_rgba(0,0,0,0.45)]"
      aria-label={label(p)}
    >
      <ItemArt
        name={p.item.name}
        imageUrl={p.item.imageUrl}
        theme={p.theme}
        className="h-24 w-24 flex-shrink-0 rounded-[calc(var(--e-radius)-6px)] sm:h-28 sm:w-28"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="e-display text-[19px] leading-snug">{p.item.name}</span>
        {p.item.description && <span className="mt-1 line-clamp-2 text-[13px] leading-relaxed e-muted">{p.item.description}</span>}
        <span className="mt-1.5 flex flex-wrap items-center gap-2">
          <TagList tags={p.item.tags} max={2} />
          <InCart n={p.inCart} />
        </span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-2 pr-12">
          <Price item={p.item} promotion={p.promotion} currency={p.currency} className="text-[15px]" />
          <Unavailable a={p.availability} />
        </span>
      </span>
    </button>
    <AddButton p={p} size={38} className="absolute bottom-3 right-3" />
  </li>
)

const CompactRow = (p: ItemProps) => (
  <li className="relative">
    <button
      type="button"
      onClick={p.onOpen}
      disabled={!p.availability.orderable}
      className="flex w-full items-center gap-3 py-3 pr-12 text-left disabled:opacity-55 e-focus"
      aria-label={label(p)}
    >
      <ItemArt
        name={p.item.name}
        imageUrl={p.item.imageUrl}
        theme={p.theme}
        size="sm"
        className="h-16 w-16 flex-shrink-0 rounded-[var(--e-radius-control)]"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{p.item.name}</span>
        {p.item.description && <span className="block truncate text-[13px] e-muted">{p.item.description}</span>}
        <span className="mt-1 flex flex-wrap items-center gap-2">
          <Price item={p.item} promotion={p.promotion} currency={p.currency} className="text-sm" />
          <Unavailable a={p.availability} />
          <InCart n={p.inCart} />
        </span>
      </span>
    </button>
    <AddButton p={p} size={36} className="absolute right-0 top-1/2 -translate-y-1/2" />
  </li>
)

export const PromoBanner = ({ promotions, now, categories }: { promotions: Promotion[]; now: Date; categories: MenuCategory[] }) => {
  const live = promotions.filter((p) => promotionLive(p, now))
  if (!live.length) return null
  return (
    <div className="mx-auto max-w-5xl px-4">
      {live.map((p) => {
        const where = p.categoryIds.length
          ? categories
              .filter((c) => p.categoryIds.includes(c.id))
              .map((c) => c.name)
              .join(', ')
          : 'everything'
        const until = p.schedule.find(() => true)
        return (
          <div
            key={p.id}
            className="mb-3 flex items-center gap-3 px-4 py-3 e-accent shadow-sm"
            style={{ borderRadius: 'var(--e-radius)' }}
            role="status"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-black/10">
              <BadgePercent className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-sm font-bold leading-snug">
              <span className="e-display mr-1.5 text-lg">{p.name} — on now.</span>
              {p.percentOff}% off {where.toLowerCase()}
              {until ? ` · ${windowLabel(until)}` : ''}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// The restaurant's own highlights (items tagged popular or signature).
const PopularRail = ({ items, make }: { items: MenuItem[]; make: (i: MenuItem) => ItemProps }) => {
  if (items.length < 2) return null
  return (
    <section className="pt-6" aria-labelledby="popular-title">
      <h2 id="popular-title" className="e-display mb-3 text-[26px]">
        Popular here
      </h2>
      <ul className="e-tabs -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {items.map((i) => {
          const p = make(i)
          return (
            <li key={i.id} className="relative w-44 flex-shrink-0 snap-start sm:w-52">
              <button
                type="button"
                onClick={p.onOpen}
                className="flex w-full flex-col overflow-hidden text-left e-card e-focus"
                aria-label={`${i.name}, popular`}
              >
                <ItemArt name={i.name} imageUrl={i.imageUrl} theme={p.theme} className="aspect-[4/3] w-full" />
                <span className="flex flex-1 flex-col p-3">
                  <span className="e-display line-clamp-2 text-lg leading-tight">{i.name}</span>
                  <Price item={i} promotion={p.promotion} currency={p.currency} className="mt-1.5 text-sm" />
                </span>
              </button>
              <AddButton p={p} size={34} className="absolute right-2 top-2" />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export const MenuView = ({
  bundle,
  now,
  onOpen,
  onQuickAdd,
  cartCounts,
  blocked,
  stickyOffset = 64,
}: {
  bundle: StorefrontBundle
  now: Date
  onOpen: (item: MenuItem) => void
  onQuickAdd?: (item: MenuItem) => void
  // itemId → quantity already in the order
  cartCounts?: Map<number, number>
  blocked?: string | null
  stickyOffset?: number
}) => {
  const { restaurant, categories, items, promotions } = bundle
  const t = restaurant.theme
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [active, setActive] = useState<number | null>(null)
  const sectionRefs = useRef(new Map<number, HTMLElement>())
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const q = query.trim().toLowerCase()
  const sections = useMemo(
    () =>
      categories
        .map((c) => ({
          category: c,
          items: items.filter(
            (i) => i.categoryId === c.id && i.status !== 'hidden' && (!q || `${i.name} ${i.description ?? ''}`.toLowerCase().includes(q))
          ),
        }))
        .filter((s) => s.items.length > 0),
    [categories, items, q]
  )
  const hasAlcohol = restaurant.servesAlcohol && items.some((i) => i.tags.includes('alcoholic'))

  const make = (item: MenuItem): ItemProps => {
    const availability = itemAvailability(item, categoryById.get(item.categoryId), now)
    return {
      item,
      availability,
      promotion: bestPromotion(item, promotions, now),
      currency: restaurant.currency,
      addLabel: t.copy.add,
      inCart: cartCounts?.get(item.id) ?? 0,
      onOpen: () => onOpen(item),
      onQuickAdd: onQuickAdd && !blocked && availability.orderable && isQuickAdd(item) ? () => onQuickAdd(item) : undefined,
      theme: t,
    }
  }
  const popular = q
    ? []
    : items
        .filter(
          (i) =>
            (i.tags.includes('popular') || i.tags.includes('signature')) &&
            itemAvailability(i, categoryById.get(i.categoryId), now).orderable
        )
        .slice(0, 8)

  // Highlight the section in view.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(Number((visible.target as HTMLElement).dataset.category))
      },
      { rootMargin: `-${stickyOffset + 60}px 0px -60% 0px` }
    )
    sectionRefs.current.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [sections, stickyOffset])

  const jump = (id: number) => {
    setActive(id)
    const el = sectionRefs.current.get(id)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - stickyOffset - 56, behavior: 'smooth' })
  }

  return (
    <div>
      <div
        className="sticky z-20 border-b backdrop-blur-md"
        style={{ top: stickyOffset, borderColor: 'var(--e-border)', background: 'color-mix(in srgb, var(--e-bg) 90%, transparent)' }}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
          {searching ? (
            <label className="relative flex-1">
              <span className="sr-only">Search the menu</span>
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 e-muted" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the menu"
                className="e-input !min-h-[40px] pl-10"
                type="search"
              />
            </label>
          ) : (
            <nav aria-label="Menu sections" className="e-tabs flex flex-1 gap-1 overflow-x-auto">
              {sections.map((s) => (
                <button
                  key={s.category.id}
                  type="button"
                  className="e-tab e-focus"
                  aria-current={active === s.category.id}
                  onClick={() => jump(s.category.id)}
                >
                  {s.category.name}
                </button>
              ))}
            </nav>
          )}
          <button
            type="button"
            onClick={() => {
              setSearching((v) => !v)
              setQuery('')
            }}
            aria-label={searching ? 'Close search' : 'Search the menu'}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full e-focus e-soft"
          >
            {searching ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" style={{ color: 'var(--e-primary-text)' }} />}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4">
        {hasAlcohol && (
          <p className="flex items-center gap-2 pt-3 text-xs font-semibold e-muted">
            <ShieldAlert className="h-4 w-4 flex-shrink-0" aria-hidden /> Alcohol is only served to guests 18 and over. Please drink
            responsibly.
          </p>
        )}
        <PopularRail items={popular} make={make} />
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-36">
        {sections.length === 0 && (
          <div className="py-16 text-center">
            <p className="e-display text-2xl">{q ? `Nothing matches “${query}”` : 'The menu is being prepared'}</p>
            <p className="mt-1 text-sm e-muted">{q ? 'Try another word.' : 'Check back soon.'}</p>
            {q && (
              <button type="button" onClick={() => setQuery('')} className="e-btn-quiet mt-4">
                Clear search
              </button>
            )}
          </div>
        )}
        {sections.map(({ category, items: list }) => {
          const notNow = !!category.schedule?.length && !inAnyWindow(category.schedule, now)
          const elegant = t.menuLayout === 'elegant-list'
          return (
            <section
              key={category.id}
              data-category={category.id}
              ref={(el) => {
                if (el) sectionRefs.current.set(category.id, el)
                else sectionRefs.current.delete(category.id)
              }}
              className="pt-10"
              aria-labelledby={`cat-${category.id}`}
            >
              <div className={cn('mb-4', elegant ? 'text-center' : 'flex items-end justify-between gap-3')}>
                <div>
                  <h2 id={`cat-${category.id}`} className={cn('e-display', elegant ? 'text-3xl' : 'text-[28px] sm:text-[32px]')}>
                    {category.name}
                  </h2>
                  {(category.description || notNow) && (
                    <p className="mt-1 text-sm e-muted">
                      {category.description}
                      {notNow && category.schedule
                        ? `${category.description ? ' · ' : ''}Served ${category.schedule.map(windowLabel).join(', ')}`
                        : ''}
                    </p>
                  )}
                </div>
                {!elegant && (
                  <span className="pb-1 text-xs font-bold e-muted">
                    {list.length} item{list.length === 1 ? '' : 's'}
                  </span>
                )}
                {elegant && (
                  <div className="mx-auto mt-3 flex w-24 items-center gap-2" aria-hidden>
                    <span className="h-px flex-1" style={{ background: 'var(--e-primary)' }} />
                    <span className="h-1.5 w-1.5 rotate-45" style={{ background: 'var(--e-primary)' }} />
                    <span className="h-px flex-1" style={{ background: 'var(--e-primary)' }} />
                  </div>
                )}
              </div>
              {t.menuLayout === 'elegant-list' && (
                <ul className="mx-auto max-w-2xl divide-y divide-[color:var(--e-border)]">
                  {list.map((i) => (
                    <ElegantRow key={i.id} {...make(i)} />
                  ))}
                </ul>
              )}
              {t.menuLayout === 'bold-grid' && (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {list.map((i) => (
                    <GridTile key={i.id} {...make(i)} />
                  ))}
                </ul>
              )}
              {t.menuLayout === 'cozy-cards' && (
                <ul className="grid gap-3 md:grid-cols-2">
                  {list.map((i) => (
                    <CozyCard key={i.id} {...make(i)} />
                  ))}
                </ul>
              )}
              {t.menuLayout === 'compact-list' && (
                <ul className="divide-y divide-[color:var(--e-border)]">
                  {list.map((i) => (
                    <CompactRow key={i.id} {...make(i)} />
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
