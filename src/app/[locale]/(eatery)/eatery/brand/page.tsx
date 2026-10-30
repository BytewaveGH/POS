'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Eye, RotateCcw, Save, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Card, PageHeader, SectionTitle } from '@/components/kit/ui'
import { Field, Input, Segmented, Toggle } from '@/components/kit/form'
import { formatRatio, isHex } from '@/lib/eatery/color'
import { useEateryActions, useNow } from '@/lib/eatery/hooks'
import { PRESETS, presetFor } from '@/lib/eatery/presets'
import {
  BODY_FONTS,
  DISPLAY_FONTS,
  FONTS,
  HERO_STYLES,
  MENU_LAYOUTS,
  PATTERNS,
  SURFACES,
  BACKDROPS,
  SHAPES,
  fixContrast,
  resolveTheme,
  type ThemeColors,
  type ThemeConfig,
} from '@/lib/eatery/theme'
import type { Restaurant } from '@/lib/eatery/types'
import { Storefront } from '@/components/eatery/storefront'
import { BrandMark, Cover, ThemeScope } from '@/components/eatery/theme-scope'
import { ImageField } from '../_components/image-field'
import { EateryFrame, RestaurantSwitcher } from '../_components/frame'
import { PresetCard } from '../_components/new-restaurant'
import { StyleCard } from '../_components/style-card'
import { DESIGN_STYLES, applyStyle, matchingStyle } from '@/lib/eatery/styles'
import { FESTIVAL_BY_KEY, dressForFestival, liveFestival, type FestivalKey } from '@/lib/eatery/festivals'
import { FestivalPanel } from '../_components/festival-panel'
import type { OwnerData } from '@/lib/eatery/hooks'

const COLOR_FIELDS: { key: keyof ThemeColors; label: string; hint: string }[] = [
  { key: 'background', label: 'Page', hint: 'Behind everything' },
  { key: 'surface', label: 'Cards', hint: 'Menu cards, sheets' },
  { key: 'text', label: 'Text', hint: 'Names, headings' },
  { key: 'muted', label: 'Secondary text', hint: 'Descriptions' },
  { key: 'primary', label: 'Brand colour', hint: 'Buttons, prices, tabs' },
  { key: 'accent', label: 'Accent', hint: 'Deals, badges, pattern' },
]

const ColorField = ({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) => {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        aria-label={`${label} colour`}
        value={isHex(value) && value.length === 7 ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-11 flex-shrink-0 cursor-pointer rounded-xl border border-stone-200 bg-white p-1"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-stone-700">{label}</p>
        <p className="text-[11px] text-stone-400">{hint}</p>
      </div>
      <input
        aria-label={`${label} hex`}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (isHex(e.target.value)) onChange(e.target.value)
        }}
        className="h-10 w-24 rounded-xl border border-stone-200 px-2 font-mono text-xs uppercase"
      />
    </div>
  )
}

const Choice = <T extends string>({
  value,
  current,
  onPick,
  label,
  hint,
}: {
  value: T
  current: T
  onPick: (v: T) => void
  label: string
  hint: string
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={value === current}
    onClick={() => onPick(value)}
    className={cn(
      'rounded-xl border p-3 text-left transition-colors',
      value === current ? 'border-endeavour bg-endeavour/[0.04] ring-2 ring-endeavour/15' : 'border-stone-200 hover:border-stone-300'
    )}
  >
    <p className="text-sm font-bold text-stone-900">{label}</p>
    <p className="text-[11px] text-stone-500">{hint}</p>
  </button>
)

const Editor = ({ o }: { o: OwnerData & { restaurant: Restaurant } }) => {
  const r = o.restaurant
  const now = useNow()
  const actions = useEateryActions()
  const [theme, setTheme] = useState<ThemeConfig>(r.theme)
  const [saving, setSaving] = useState(false)
  useEffect(() => setTheme(r.theme), [r.id, r.theme])
  const dirty = JSON.stringify(theme) !== JSON.stringify(r.theme)
  const current = matchingStyle(theme)
  const [styleTab, setStyleTab] = useState<'modern' | 'kind' | 'festivals'>('modern')
  // The phone shows the owner's own look unless they preview a festival.
  const [previewing, setPreviewing] = useState<FestivalKey | null>(null)
  const live = liveFestival(theme, now)
  const dishes = useMemo(() => o.items.filter((i) => i.status !== 'hidden').slice(0, 2), [o.items])
  const resolved = useMemo(() => resolveTheme(theme), [theme])
  const failing = resolved.checks.filter((c) => !c.pass)
  const set = (p: Partial<ThemeConfig>) => setTheme((t) => ({ ...t, ...p }))
  const setColor = (k: keyof ThemeColors, v: string) => setTheme((t) => ({ ...t, colors: { ...t.colors, [k]: v } }))
  const bundle = useMemo(
    () => ({
      restaurant: { ...r, theme: previewing ? dressForFestival(theme, now, previewing) : theme },
      categories: o.categories,
      items: o.items.filter((i) => i.status !== 'hidden'),
      promotions: o.promotions.filter((p) => p.active),
    }),
    [r, theme, previewing, now, o.categories, o.items, o.promotions]
  )

  const save = async () => {
    setSaving(true)
    try {
      await actions.update('restaurants', r.id, { theme })
    } catch {
      // toast shown
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={r.name}
        title="Brand & theme"
        description="How your storefront looks and feels. Changes preview live — customers see them once you save."
        actions={
          <>
            <RestaurantSwitcher o={o} />
            <Button variant="secondary" icon={RotateCcw} disabled={!dirty} onClick={() => setTheme(r.theme)}>
              Discard
            </Button>
            <Button icon={Save} loading={saving} disabled={!dirty} onClick={() => void save()}>
              Save theme
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-4 min-w-0">
          <Card className="p-5">
            <SectionTitle title="Start from a style" hint="Keeps your logo, cover photo and wording — fine-tune anything below" />
            <div className="mb-4 max-w-lg">
              <Segmented
                ariaLabel="Kind of style"
                value={styleTab}
                onChange={setStyleTab}
                options={[
                  { value: 'modern', label: `Modern styles · ${DESIGN_STYLES.length}` },
                  { value: 'kind', label: 'By kind of place' },
                  { value: 'festivals', label: live ? 'Festivals · live' : 'Festivals' },
                ]}
              />
            </div>
            {styleTab === 'modern' ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-5">
                {DESIGN_STYLES.map((st) => (
                  <StyleCard
                    key={st.key}
                    style={st}
                    base={theme}
                    name={r.name}
                    dishes={dishes}
                    currency={r.currency}
                    selected={current === st.key}
                    onSelect={() => setTheme(applyStyle(theme, st))}
                  />
                ))}
              </div>
            ) : styleTab === 'festivals' ? (
              <FestivalPanel
                theme={theme}
                onChange={(seasonal) => set({ seasonal })}
                now={now}
                name={r.name}
                dishes={dishes}
                currency={r.currency}
                previewing={previewing}
                onPreview={setPreviewing}
              />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {PRESETS.map((p) => (
                  <PresetCard
                    key={p.key}
                    category={p.key}
                    name={r.name}
                    selected={!current && theme.preset === p.key}
                    onSelect={() =>
                      setTheme({
                        ...JSON.parse(JSON.stringify(presetFor(p.key).theme)),
                        imagery: theme.imagery,
                        copy: theme.copy,
                        seasonal: theme.seasonal,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle title="Logo & cover" />
            <div className="grid gap-5 sm:grid-cols-2">
              <ImageField
                kind="logo"
                label="Logo"
                hint="Square works best · cropped to 512 px"
                value={theme.imagery.logoUrl}
                onChange={(logoUrl) => set({ imagery: { ...theme.imagery, logoUrl } })}
                upload={(file) => actions.uploadImage(r.id, file, 'logo')}
                fallback={
                  <ThemeScope theme={theme} className="flex h-full w-full items-center justify-center">
                    <BrandMark
                      restaurant={{ name: r.name, theme: { ...theme, imagery: { ...theme.imagery, logoUrl: undefined } } }}
                      size={52}
                    />
                  </ThemeScope>
                }
              />
              <ImageField
                kind="cover"
                label="Cover photo"
                hint="Wide photo · resized to 1600 px"
                value={theme.imagery.coverUrl}
                onChange={(coverUrl) => set({ imagery: { ...theme.imagery, coverUrl } })}
                upload={(file) => actions.uploadImage(r.id, file, 'cover')}
                fallback={<Cover theme={{ ...theme, imagery: { ...theme.imagery, coverUrl: undefined } }} className="h-full w-full" />}
              />
            </div>
            {theme.imagery.coverUrl && (
              <Field
                label={`Darken the cover · ${Math.round(theme.imagery.coverOverlay * 100)}%`}
                htmlFor="th-overlay"
                hint="Keeps your name readable over the photo (never below 35%)"
                className="mt-4"
              >
                <input
                  id="th-overlay"
                  type="range"
                  min={0.35}
                  max={0.85}
                  step={0.05}
                  value={theme.imagery.coverOverlay}
                  onChange={(e) => set({ imagery: { ...theme.imagery, coverOverlay: Number(e.target.value) } })}
                  className="w-full accent-endeavour"
                />
              </Field>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle title="Colours" />
            <div className="grid gap-4 sm:grid-cols-2">
              {COLOR_FIELDS.map((f) => (
                <ColorField key={f.key} label={f.label} hint={f.hint} value={theme.colors[f.key]} onChange={(v) => setColor(f.key, v)} />
              ))}
            </div>
            <div
              className={cn(
                'mt-5 rounded-xl border p-4',
                failing.length ? 'border-amber-200 bg-amber-50/60' : 'border-emerald-200 bg-emerald-50/50'
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                  className={cn(
                    'text-sm font-bold inline-flex items-center gap-1.5',
                    failing.length ? 'text-amber-800' : 'text-emerald-800'
                  )}
                >
                  {failing.length ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {failing.length
                    ? `${failing.length} colour pair${failing.length === 1 ? ' is' : 's are'} hard to read`
                    : 'Readable for everyone (WCAG AA)'}
                </p>
                {failing.length > 0 && (
                  <Button size="sm" icon={Wand2} onClick={() => setTheme(fixContrast(theme))}>
                    Fix contrast
                  </Button>
                )}
              </div>
              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {resolved.checks.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-stone-700">{c.label}</span>
                    <span className={cn('font-mono font-bold tabular-nums', c.pass ? 'text-emerald-700' : 'text-amber-800')}>
                      {formatRatio(c.ratio)} {c.pass ? '✓' : `· needs ${c.required}:1`}
                    </span>
                  </li>
                ))}
              </ul>
              {failing.length > 0 && (
                <p className="mt-2 text-[11px] text-amber-800">
                  Until you fix it, the storefront quietly adjusts these colours so customers can still read your menu.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Type" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[13px] font-semibold text-stone-700 mb-2">Headings</p>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Heading font">
                  {DISPLAY_FONTS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={theme.fonts.display === f}
                      onClick={() => set({ fonts: { ...theme.fonts, display: f } })}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-left',
                        theme.fonts.display === f ? 'border-endeavour ring-2 ring-endeavour/15' : 'border-stone-200 hover:border-stone-300'
                      )}
                    >
                      <span className="block text-xl leading-tight text-stone-900" style={{ fontFamily: FONTS[f].family }}>
                        {r.name.split(' ')[0]}
                      </span>
                      <span className="block text-[11px] text-stone-500">{FONTS[f].label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-stone-700 mb-2">Body text</p>
                <div className="grid gap-2" role="radiogroup" aria-label="Body font">
                  {BODY_FONTS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={theme.fonts.body === f}
                      onClick={() => set({ fonts: { ...theme.fonts, body: f } })}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-left',
                        theme.fonts.body === f ? 'border-endeavour ring-2 ring-endeavour/15' : 'border-stone-200 hover:border-stone-300'
                      )}
                    >
                      <span className="block text-sm text-stone-800" style={{ fontFamily: FONTS[f].family }}>
                        Grilled chicken, jollof and fresh salad.
                      </span>
                      <span className="block text-[11px] text-stone-500">
                        {FONTS[f].label} · {FONTS[f].feel}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <Toggle
                    checked={theme.uppercaseHeadings}
                    onChange={(v) => set({ uppercaseHeadings: v })}
                    label="Headings in capitals"
                    hint="Poster style"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Layout" />
            <p className="text-[13px] font-semibold text-stone-700 mb-2">Top of the page</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2" role="radiogroup" aria-label="Header style">
              {HERO_STYLES.map((h) => (
                <Choice key={h.value} value={h.value} current={theme.hero} onPick={(hero) => set({ hero })} label={h.label} hint={h.hint} />
              ))}
            </div>
            <p className="text-[13px] font-semibold text-stone-700 mt-5 mb-2">Menu</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2" role="radiogroup" aria-label="Menu layout">
              {MENU_LAYOUTS.map((m) => (
                <Choice
                  key={m.value}
                  value={m.value}
                  current={theme.menuLayout}
                  onPick={(menuLayout) => set({ menuLayout })}
                  label={m.label}
                  hint={m.hint}
                />
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[13px] font-semibold text-stone-700 mb-2">Corners</p>
                <Segmented ariaLabel="Corners" value={theme.shape} onChange={(shape) => set({ shape })} options={SHAPES} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-stone-700 mb-2">Cards</p>
                <Segmented
                  ariaLabel="Card surface"
                  value={theme.surface ?? 'outlined'}
                  onChange={(surface) => set({ surface })}
                  options={SURFACES}
                />
                <p className="text-[13px] font-semibold text-stone-700 mb-2 mt-4">Page background</p>
                <Segmented
                  ariaLabel="Page background"
                  value={theme.backdrop ?? 'solid'}
                  onChange={(backdrop) => set({ backdrop })}
                  options={BACKDROPS}
                />
                <p className="text-[13px] font-semibold text-stone-700 mb-2 mt-4">Pattern</p>
                <div className="flex flex-wrap gap-1.5">
                  {PATTERNS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      aria-pressed={theme.pattern === p.value}
                      onClick={() => set({ pattern: p.value })}
                      className={cn(
                        'h-8 rounded-full border px-3 text-xs font-semibold',
                        theme.pattern === p.value ? 'border-endeavour bg-endeavour/10 text-endeavour' : 'border-stone-200 text-stone-600'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Wording" hint="Say it the way you would" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Add button" htmlFor="th-add" hint="e.g. Add · Add to tab · I’ll have it">
                <Input
                  id="th-add"
                  value={theme.copy.add}
                  maxLength={18}
                  onChange={(e) => set({ copy: { ...theme.copy, add: e.target.value || 'Add' } })}
                />
              </Field>
              <Field label="Basket name" htmlFor="th-cart" hint="e.g. Your order · Your tab · Your box">
                <Input
                  id="th-cart"
                  value={theme.copy.cart}
                  maxLength={18}
                  onChange={(e) => set({ copy: { ...theme.copy, cart: e.target.value || 'Your order' } })}
                />
              </Field>
            </div>
          </Card>
        </div>

        <div className="xl:sticky xl:top-20 xl:self-start">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-400">Live preview</p>
          {previewing ? (
            <p
              className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-endeavour/[0.06] px-3 py-2 text-xs text-stone-700"
              role="status"
            >
              <span>
                Previewing <strong>{FESTIVAL_BY_KEY[previewing].name}</strong>
              </span>
              <button type="button" onClick={() => setPreviewing(null)} className="font-bold text-endeavour hover:underline">
                Show my look
              </button>
            </p>
          ) : (
            live && (
              <p
                className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-700"
                role="status"
              >
                <span>
                  Customers see <strong>{live.festival.name}</strong> today
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewing(live.festival.key)}
                  className="inline-flex items-center gap-1 font-bold text-endeavour hover:underline"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden /> See it
                </button>
              </p>
            )
          )}
          <div className="mx-auto w-full max-w-[400px] rounded-[42px] border-[10px] border-stone-900 bg-stone-900 shadow-2xl">
            <div className="h-[720px] overflow-y-auto overflow-x-hidden rounded-[32px] bg-white" data-testid="theme-preview">
              <Storefront bundle={bundle} now={now} cartKey={`__preview__${r.id}`} checkoutHref="#" preview />
            </div>
          </div>
          {dirty && <p className="mt-3 text-center text-xs font-semibold text-amber-700">Unsaved changes</p>}
        </div>
      </div>
    </>
  )
}

export default function BrandPage() {
  return <EateryFrame>{(o) => <Editor o={o} />}</EateryFrame>
}
