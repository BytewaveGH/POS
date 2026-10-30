import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { resolveTheme, type SeasonalSettings, type ThemeConfig } from '@/lib/eatery/theme'
import { presetFor } from '@/lib/eatery/presets'
import { DESIGN_STYLES, applyStyle } from '@/lib/eatery/styles'
import {
  FESTIVALS,
  blackFriday,
  dressForFestival,
  easterSunday,
  festivalsOn,
  liveFestival,
  upcomingFestivals,
  wearFestival,
} from '@/lib/eatery/festivals'
import { ThemeScope } from '@/components/eatery/theme-scope'
import { FestivalRibbon } from '@/components/eatery/festival-ribbon'
import { FestivalPanel } from '@/app/[locale]/(eatery)/eatery/_components/festival-panel'

const light = presetFor('general').theme
const dark = applyStyle(light, DESIGN_STYLES.find((s) => s.key === 'noir')!)
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12)
const withSeasonal = (t: ThemeConfig, s: Partial<SeasonalSettings>): ThemeConfig => ({
  ...t,
  seasonal: { auto: true, banner: true, off: [], skipped: [], ...s },
})
const onNow = (now: Date, t: ThemeConfig = light) => liveFestival(t, now)?.festival.key ?? null

describe('festival looks stay readable', () => {
  it.each(FESTIVALS.flatMap((f) => [[f.key, 'light'] as const, [f.key, 'dark'] as const]))('%s (%s) passes WCAG AA', (key, mode) => {
    const r = resolveTheme(wearFestival(mode === 'dark' ? dark : light, FESTIVALS.find((f) => f.key === key)!))
    expect(r.checks.filter((c) => !c.pass).map((c) => `${c.label} ${c.ratio.toFixed(2)}`)).toEqual([])
  })

  it('a dark theme gets the dark palette; fonts, layout, logo and wording stay', () => {
    const mine = { ...dark, imagery: { logoUrl: 'data:image/png;base64,AA', coverOverlay: 0.5 }, copy: { add: 'Pour it', cart: 'My tab' } }
    const worn = dressForFestival(mine, day(2026, 10, 10))
    expect(worn).toMatchObject({
      festival: 'pink-october',
      pattern: 'ribbons',
      fonts: mine.fonts,
      hero: mine.hero,
      imagery: mine.imagery,
      copy: mine.copy,
    })
    expect(worn.colors.background).toBe(FESTIVALS.find((f) => f.key === 'pink-october')!.colors.dark.background)
    expect(mine.festival).toBeUndefined()
  })
})

describe('festival calendar', () => {
  it('works out moving dates', () => {
    expect(blackFriday(2026)).toEqual(new Date(2026, 10, 27))
    expect(blackFriday(2027)).toEqual(new Date(2027, 10, 26))
    expect(easterSunday(2026)).toEqual(new Date(2026, 3, 5))
    expect(easterSunday(2027)).toEqual(new Date(2027, 2, 28))
  })

  it('picks the festival on today, the most specific first', () => {
    expect(onNow(day(2026, 10, 10))).toBe('pink-october')
    expect(onNow(day(2026, 10, 30))).toBe('halloween')
    expect(festivalsOn(day(2026, 10, 30)).map((o) => o.festival.key)).toEqual(['halloween', 'pink-october'])
    expect(onNow(day(2026, 11, 25))).toBe('black-friday')
    expect(onNow(day(2026, 11, 10))).toBeNull()
    expect(onNow(day(2026, 12, 24))).toBe('christmas')
    expect(onNow(day(2027, 1, 1))).toBe('new-year')
    expect(onNow(day(2026, 3, 20))).toBe('eid-al-fitr')
    expect(onNow(day(2026, 4, 3))).toBe('easter')
  })

  it('respects what the owner removed', () => {
    const oct30 = day(2026, 10, 30)
    // Halloween removed this year: Pink October shows instead, and Halloween is back next year.
    const skipped = withSeasonal(light, { skipped: ['halloween:2026'] })
    expect(onNow(oct30, skipped)).toBe('pink-october')
    expect(onNow(day(2027, 10, 30), skipped)).toBe('halloween')
    expect(onNow(oct30, withSeasonal(light, { off: ['halloween', 'pink-october'] }))).toBeNull()
    expect(onNow(oct30, withSeasonal(light, { auto: false }))).toBeNull()
    const plain = withSeasonal(light, { auto: false })
    expect(dressForFestival(plain, oct30)).toBe(plain)
  })

  it('lists each festival once, current first, in date order', () => {
    const list = upcomingFestivals(day(2026, 10, 30))
    expect(list.map((o) => o.festival.key).slice(0, 4)).toEqual(['pink-october', 'halloween', 'black-friday', 'christmas'])
    expect(new Set(list.map((o) => o.festival.key)).size).toBe(list.length)
    expect(list.find((o) => o.festival.key === 'valentines')!.year).toBe(2027)
  })
})

describe('festival ribbon and editor', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any
  })

  it('customers see the ribbon unless the owner hides it', () => {
    const worn = dressForFestival(light, day(2026, 10, 10))
    const { unmount } = render(
      <ThemeScope theme={worn}>
        <FestivalRibbon theme={worn} />
      </ThemeScope>
    )
    expect(screen.getByText('Pink October')).toBeTruthy()
    expect(screen.getByText(/get checked/)).toBeTruthy()
    unmount()
    const quiet = dressForFestival(withSeasonal(light, { banner: false }), day(2026, 10, 10))
    render(<FestivalRibbon theme={quiet} />)
    expect(screen.queryByTestId('festival-ribbon')).toBeNull()
  })

  it('the owner can remove the live festival for this year, or turn one off for good', () => {
    const changes: SeasonalSettings[] = []
    const previews: (string | null)[] = []
    render(
      <FestivalPanel
        theme={light}
        onChange={(s) => changes.push(s)}
        now={day(2026, 10, 30)}
        name="Mama’s Kitchen"
        dishes={[]}
        currency="GHS"
        previewing={null}
        onPreview={(k) => previews.push(k)}
      />
    )
    expect(screen.getByText('Customers see Halloween right now')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove this year' }))
    expect(changes.at(-1)).toMatchObject({ auto: true, skipped: ['halloween:2026'], off: [] })

    fireEvent.click(screen.getByRole('switch', { name: /Christmas/ }))
    expect(changes.at(-1)!.off).toEqual(['christmas'])

    fireEvent.click(screen.getByRole('button', { name: 'Preview Black Friday' }))
    expect(previews).toEqual(['black-friday'])
  })

  it('offers to bring back a festival the owner removed', () => {
    const changes: SeasonalSettings[] = []
    render(
      <FestivalPanel
        theme={withSeasonal(light, { skipped: ['halloween:2026'], off: ['pink-october'] })}
        onChange={(s) => changes.push(s)}
        now={day(2026, 10, 30)}
        name="Mama’s Kitchen"
        dishes={[]}
        currency="GHS"
        previewing={null}
        onPreview={() => {}}
      />
    )
    expect(screen.getByText('Halloween is on, but not on your storefront')).toBeTruthy()
    expect(screen.getByText('Removed this year')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Bring it back/ }))
    expect(changes.at(-1)).toMatchObject({ skipped: [], off: ['pink-october'] })
  })
})
