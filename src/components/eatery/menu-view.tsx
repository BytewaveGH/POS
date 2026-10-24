'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BadgePercent, Plus, Search, ShieldAlert } from 'lucide-react'
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

// Lowest possible price: base + cheapest choice of every required group.
export const fromPrice = (item: MenuItem) =>
  round2(
    item.price +
      item.optionGroups.filter((g) => g.min > 0).reduce((s, g) => s + Math.min(...g.choices.map((c) => c.priceDelta), 0) * g.min, 0) +
      (item.combo?.slots ?? []).reduce((s, sl) => s + Math.min(...sl.choices.map((c) => c.upcharge), 0), 0)
  )
const hasRange = (item: MenuItem) => item.optionGroups.some((g) => g.min > 0 && new Set(g.choices.map((c) => c.priceDelta)).size > 1)

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
        <>
          <s className="text-xs e-muted" aria-label={`was ${formatMoney(base, currency)}`}>
            {formatMoney(base, currency)}
          </s>
        </>
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

interface ItemProps {
  item: MenuItem
  availability: Availability
  promotion?: Promotion
  currency: string
  addLabel: string
  onOpen: () => void
}

const ElegantRow = ({ item, availability, promotion, currency, onOpen }: ItemProps) => (
  <li>
    <button
      type="button"
      onClick={onOpen}
      disabled={!availability.orderable}
      className="group w-full text-left py-4 disabled:opacity-55 e-focus"
      aria-label={`${item.name}${availability.orderable ? '' : ` — ${availability.label}`}`}
    >
      <span className="flex items-baseline gap-3">
        <span className="e-display text-[21px] group-hover:opacity-80">{item.name}</span>
        <span className="e-leader" aria-hidden />
        <Price item={item} promotion={promotion} currency={currency} className="text-base" />
      </span>
      {item.description && <span className="block mt-1 e-muted text-sm italic leading-relaxed max-w-xl">{item.description}</span>}
      <span className="mt-2 flex flex-wrap items-center gap-2">
        <TagList tags={item.tags} />
        <Unavailable a={availability} />
      </span>
    </button>
  </li>
)

const GridTile = ({
  item,
  availability,
  promotion,
  currency,
  theme,
  onOpen,
}: ItemProps & { theme: StorefrontBundle['restaurant']['theme'] }) => (
  <li className="relative">
    <button
      type="button"
      onClick={onOpen}
      disabled={!availability.orderable}
      className="flex h-full w-full flex-col overflow-hidden text-left e-card disabled:opacity-55 e-focus transition-transform hover:-translate-y-0.5"
      aria-label={`${item.name}${availability.orderable ? '' : ` — ${availability.label}`}`}
    >
      <div className="relative">
        <ItemArt name={item.name} imageUrl={item.imageUrl} theme={theme} className="aspect-square w-full" />
        {promotion && (
          <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-extrabold e-accent">
            −{promotion.percentOff}%
          </span>
        )}
        {availability.orderable && (
          <span
            className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center shadow-md"
            style={{ background: 'var(--e-primary)', color: 'var(--e-on-primary)', borderRadius: 'var(--e-radius-control)' }}
            aria-hidden
          >
            <Plus className="h-5 w-5" strokeWidth={3} />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <span className="e-display text-xl leading-tight">{item.name}</span>
        {item.description && <span className="mt-1 text-xs e-muted line-clamp-2">{item.description}</span>}
        <span className="mt-auto pt-2 flex flex-wrap items-center justify-between gap-1">
          <Price item={item} promotion={promotion} currency={currency} className="text-[15px]" />
          <Unavailable a={availability} />
        </span>
      </div>
    </button>
  </li>
)

const CozyCard = ({
  item,
  availability,
  promotion,
  currency,
  theme,
  addLabel,
  onOpen,
}: ItemProps & { theme: StorefrontBundle['restaurant']['theme'] }) => (
  <li>
    <button
      type="button"
      onClick={onOpen}
      disabled={!availability.orderable}
      className="flex w-full gap-4 p-3 text-left e-card disabled:opacity-55 e-focus shadow-[0_8px_24px_-20px_rgba(0,0,0,0.45)]"
      aria-label={`${item.name}${availability.orderable ? '' : ` — ${availability.label}`}`}
    >
      <ItemArt
        name={item.name}
        imageUrl={item.imageUrl}
        theme={theme}
        className="h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 rounded-[calc(var(--e-radius)-6px)]"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="e-display text-[19px] leading-snug">{item.name}</span>
        {item.description && <span className="mt-1 text-[13px] e-muted line-clamp-2 leading-relaxed">{item.description}</span>}
        <TagList tags={item.tags} className="mt-1.5" max={2} />
        <span className="mt-auto pt-2 flex items-center justify-between gap-2">
          <Price item={item} promotion={promotion} currency={currency} className="text-[15px]" />
          {availability.orderable ? (
            <span
              className="inline-flex h-9 items-center rounded-full px-3.5 text-xs font-extrabold e-soft"
              style={{ color: 'var(--e-primary-text)' }}
            >
              {addLabel}
            </span>
          ) : (
            <Unavailable a={availability} />
          )}
        </span>
      </span>
    </button>
  </li>
)

const CompactRow = ({
  item,
  availability,
  promotion,
  currency,
  theme,
  onOpen,
}: ItemProps & { theme: StorefrontBundle['restaurant']['theme'] }) => (
  <li>
    <button
      type="button"
      onClick={onOpen}
      disabled={!availability.orderable}
      className="flex w-full items-center gap-3 py-3 text-left disabled:opacity-55 e-focus"
      aria-label={`${item.name}${availability.orderable ? '' : ` — ${availability.label}`}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-[15px]">{item.name}</span>
        {item.description && <span className="block text-[13px] e-muted truncate">{item.description}</span>}
        <span className="mt-1 flex items-center gap-2">
          <Price item={item} promotion={promotion} currency={currency} className="text-sm" />
          <Unavailable a={availability} />
        </span>
      </span>
      <ItemArt
        name={item.name}
        imageUrl={item.imageUrl}
        theme={theme}
        size="sm"
        className="h-16 w-16 flex-shrink-0 rounded-[var(--e-radius-control)]"
      />
    </button>
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
            className="mb-3 flex items-center gap-3 px-4 py-3 e-accent"
            style={{ borderRadius: 'var(--e-radius)' }}
            role="status"
          >
            <BadgePercent className="h-6 w-6 flex-shrink-0" aria-hidden />
            <p className="text-sm font-bold leading-snug">
              <span className="e-display text-lg mr-1.5">{p.name} now on.</span>
              {p.percentOff}% off {where.toLowerCase()}
              {until ? ` · ${windowLabel(until)}` : ''}
            </p>
          </div>
        )
      })}
    </div>
  )
}

export const MenuView = ({
  bundle,
  now,
  onOpen,
  stickyOffset = 64,
}: {
  bundle: StorefrontBundle
  now: Date
  onOpen: (item: MenuItem) => void
  stickyOffset?: number
}) => {
  const { restaurant, categories, items, promotions } = bundle
  const t = restaurant.theme
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<number | null>(null)
  const sectionRefs = useRef(new Map<number, HTMLElement>())

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
        className="sticky z-20 backdrop-blur-md"
        style={{ top: stickyOffset, background: 'color-mix(in srgb, var(--e-bg) 88%, transparent)' }}
      >
        <div className="mx-auto max-w-5xl px-4 py-2 flex items-center gap-2">
          <nav aria-label="Menu sections" className="e-tabs flex-1 flex gap-1 overflow-x-auto">
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
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-3">
        <label className="relative block mb-2">
          <span className="sr-only">Search the menu</span>
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 e-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the menu"
            className="e-input pl-10"
            type="search"
          />
        </label>
        {hasAlcohol && (
          <p className="flex items-center gap-2 py-2 text-xs font-semibold e-muted">
            <ShieldAlert className="h-4 w-4 flex-shrink-0" aria-hidden /> Alcohol is only served to guests 18 and over. Please drink
            responsibly.
          </p>
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-32">
        {sections.length === 0 && (
          <p className="py-16 text-center e-muted">{q ? `Nothing matches “${query}”.` : 'The menu is being prepared — check back soon.'}</p>
        )}
        {sections.map(({ category, items: list }) => {
          const notNow = !!category.schedule?.length && !inAnyWindow(category.schedule, now)
          const props = (item: MenuItem): ItemProps => ({
            item,
            availability: itemAvailability(item, category, now),
            promotion: bestPromotion(item, promotions, now),
            currency: restaurant.currency,
            addLabel: t.copy.add,
            onOpen: () => onOpen(item),
          })
          return (
            <section
              key={category.id}
              data-category={category.id}
              ref={(el) => {
                if (el) sectionRefs.current.set(category.id, el)
                else sectionRefs.current.delete(category.id)
              }}
              className="pt-8"
              aria-labelledby={`cat-${category.id}`}
            >
              <div className={cn('mb-3', t.menuLayout === 'elegant-list' && 'text-center')}>
                <h2
                  id={`cat-${category.id}`}
                  className={cn('e-display', t.menuLayout === 'elegant-list' ? 'text-3xl' : 'text-[28px] sm:text-[32px]')}
                >
                  {category.name}
                </h2>
                {(category.description || category.schedule?.length) && (
                  <p className="mt-1 text-sm e-muted">
                    {category.description}
                    {notNow && category.schedule ? ` · Served ${category.schedule.map(windowLabel).join(', ')}` : ''}
                  </p>
                )}
                {t.menuLayout === 'elegant-list' && (
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
                    <ElegantRow key={i.id} {...props(i)} />
                  ))}
                </ul>
              )}
              {t.menuLayout === 'bold-grid' && (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {list.map((i) => (
                    <GridTile key={i.id} {...props(i)} theme={t} />
                  ))}
                </ul>
              )}
              {t.menuLayout === 'cozy-cards' && (
                <ul className="grid gap-3 md:grid-cols-2">
                  {list.map((i) => (
                    <CozyCard key={i.id} {...props(i)} theme={t} />
                  ))}
                </ul>
              )}
              {t.menuLayout === 'compact-list' && (
                <ul className="divide-y divide-[color:var(--e-border)]">
                  {list.map((i) => (
                    <CompactRow key={i.id} {...props(i)} theme={t} />
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
