import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { contrast } from '@/lib/eatery/color'
import { resolveTheme, type SeasonalSettings, type ThemeConfig } from '@/lib/eatery/theme'
import { presetFor } from '@/lib/eatery/presets'
import { DESIGN_STYLES, applyStyle } from '@/lib/eatery/styles'
import {
  FESTIVALS,
  barColors,
  blackFriday,
  dressForFestival,
  easterSunday,
  festivalInk,
  festivalsOn,
  liveFestival,
  sealYear,
  upcomingFestivals,
  wearFestival,
} from '@/lib/eatery/festivals'
import { ThemeScope } from '@/components/eatery/theme-scope'
import { FestivalBar } from '@/components/eatery/festival-marks'
import { festivalVars } from '@/lib/eatery/festival-style'
import { FestivalPanel } from '@/app/[locale]/(eatery)/eatery/_components/festival-panel'

const light = presetFor('general').theme
const dark = applyStyle(light, DESIGN_STYLES.find((s) => s.key === 'noir')!)
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12)
const withSeasonal = (t: ThemeConfig, s: Partial<SeasonalSettings>): ThemeConfig => ({
  ...t,
  seasonal: { auto: true, intensity: 'full', banner: true, off: [], skipped: [], messages: {}, ...s },
})
const onNow = (now: Date, t: ThemeConfig = light) => liveFestival(t, now)?.festival.key ?? null
const pink = FESTIVALS.find((f) => f.key === 'pink-october')!

describe('festival editions respect the brand', () => {
  it('by default the whole look changes; fonts, layout, logo and wording stay', () => {
    const mine = { ...dark, imagery: { logoUrl: 'data:image/png;base64,AA', coverOverlay: 0.5 }, copy: { add: 'Pour it', cart: 'My tab' } }
    const worn = dressForFestival(mine, day(2026, 10, 10))
    expect(worn).toMatchObject({ festival: 'pink-october', fonts: mine.fonts, hero: mine.hero, imagery: mine.imagery, copy: mine.copy })
    expect(worn.colors).toEqual(pink.palette.dark)
    expect(mine.festival).toBeUndefined()
  })

  it('“a touch” keeps the owner’s colours and only brings in the festival accent', () => {
    const mine = withSeasonal(dark, { intensity: 'accent' })
    const worn = dressForFestival(mine, day(2026, 10, 10))
    expect(worn).toMatchObject({
      festival: 'pink-october',
      pattern: mine.pattern,
      fonts: mine.fonts,
      imagery: mine.imagery,
      copy: mine.copy,
    })
    expect(worn.colors).toEqual({ ...mine.colors, accent: pink.color })
    expect(mine.festival).toBeUndefined()
  })

  it('full festival colours follow the theme: a dark theme stays dark', () => {
    expect(wearFestival(withSeasonal(dark, { intensity: 'full' }), pink).colors).toEqual(pink.palette.dark)
    expect(wearFestival(withSeasonal(light, { intensity: 'full' }), pink).colors).toEqual(pink.palette.light)
  })

  it.each(FESTIVALS.flatMap((f) => [[f.key, 'light'] as const, [f.key, 'dark'] as const]))(
    '%s full palette (%s) passes WCAG AA',
    (key, mode) => {
      const f = FESTIVALS.find((x) => x.key === key)!
      const r = resolveTheme(wearFestival(withSeasonal(mode === 'dark' ? dark : light, { intensity: 'full' }), f))
      expect(r.checks.filter((c) => !c.pass).map((c) => `${c.label} ${c.ratio.toFixed(2)}`)).toEqual([])
    }
  )

  it.each(FESTIVALS.map((f) => [f.key]))('%s bar and seal read clearly', (key) => {
    const f = FESTIVALS.find((x) => x.key === key)!
    const bar = barColors(f)
    expect(contrast(bar.text, bar.background)).toBeGreaterThanOrEqual(4.5)
    for (const surface of ['#FFFFFF', '#141414', light.colors.surface, dark.colors.surface])
      expect(contrast(festivalInk(f, surface, 4.5), surface)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('the full look reaches every component', () => {
  it('marks the scope so cards, buttons, tabs, badges and headings take the festival styling', () => {
    const worn = dressForFestival(light, day(2026, 10, 10))
    const { container, unmount } = render(
      <ThemeScope theme={worn}>
        <p>menu</p>
      </ThemeScope>
    )
    const scope = container.firstElementChild as HTMLElement
    expect(scope.dataset).toMatchObject({ festival: 'pink-october', festivalMode: 'full' })
    for (const v of ['--e-festival', '--e-primary-2', '--e-accent-2', '--e-fx-card', '--e-fx-mark', '--e-fx-badge'])
      expect(scope.style.getPropertyValue(v), v).not.toBe('')
    unmount()

    const touch = dressForFestival(withSeasonal(light, { intensity: 'accent' }), day(2026, 10, 10))
    const quiet = render(
      <ThemeScope theme={touch}>
        <p>menu</p>
      </ThemeScope>
    ).container.firstElementChild as HTMLElement
    expect(quiet.dataset.festivalMode).toBe('accent')
    expect(quiet.style.getPropertyValue('--e-fx-card')).toBe('')
  })

  it.each(FESTIVALS.flatMap((f) => [[f.key, 'light'] as const, [f.key, 'dark'] as const]))(
    '%s (%s) button and badge text stays readable across the gradients',
    (key, mode) => {
      const f = FESTIVALS.find((x) => x.key === key)!
      const r = resolveTheme(wearFestival(withSeasonal(mode === 'dark' ? dark : light, {}), f))
      const vars = festivalVars(f, r, festivalInk(f, r.palette.surface, 3))
      expect(contrast(r.palette.onPrimary, vars['--e-primary-2'])).toBeGreaterThanOrEqual(
        contrast(r.palette.onPrimary, r.palette.primary) - 0.01
      )
      expect(contrast(r.palette.onAccent, vars['--e-accent-2'])).toBeGreaterThanOrEqual(
        contrast(r.palette.onAccent, r.palette.accent) - 0.01
      )
    }
  )
})

describe('festival calendar', () => {
  it('works out moving dates', () => {
    expect(blackFriday(2026)).toEqual(new Date(2026, 10, 27))
    expect(blackFriday(2027)).toEqual(new Date(2027, 10, 26))
    expect(easterSunday(2026)).toEqual(new Date(2026, 3, 5))
    expect(easterSunday(2027)).toEqual(new Date(2027, 2, 28))
    expect(sealYear(FESTIVALS[0], new Date(2026, 11, 31))).toBe(2027)
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

describe('festival bar and editor', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any
  })

  it('customers see the owner’s message, or ours, unless the bar is off', () => {
    const worn = dressForFestival(light, day(2026, 10, 10))
    const { unmount } = render(
      <ThemeScope theme={worn}>
        <FestivalBar theme={worn} />
      </ThemeScope>
    )
    expect(screen.getByText(pink.message)).toBeTruthy()
    unmount()
    const custom = dressForFestival(
      withSeasonal(light, { messages: { 'pink-october': 'Free pink lemonade all month' } }),
      day(2026, 10, 10)
    )
    const again = render(<FestivalBar theme={custom} />)
    expect(screen.getByText('Free pink lemonade all month')).toBeTruthy()
    again.unmount()
    render(<FestivalBar theme={dressForFestival(withSeasonal(light, { banner: false }), day(2026, 10, 10))} />)
    expect(screen.queryByTestId('festival-bar')).toBeNull()
  })

  const renderPanel = (theme: ThemeConfig) => {
    const changes: SeasonalSettings[] = []
    const previews: (string | null)[] = []
    render(
      <FestivalPanel
        theme={theme}
        onChange={(s) => changes.push(s)}
        now={day(2026, 10, 30)}
        previewing={null}
        onPreview={(k) => previews.push(k)}
      />
    )
    return { changes, previews }
  }

  it('opens on the live festival, which the owner can remove this year, preview or reword', () => {
    const { changes, previews } = renderPanel(light)
    const spot = screen.getByRole('region', { name: 'Halloween details' })
    expect(spot.textContent).toMatch(/Live now · until Sat,? 31 Oct/)
    fireEvent.click(screen.getByRole('button', { name: 'Remove this year' }))
    expect(changes.at(-1)).toMatchObject({ skipped: ['halloween:2026'], off: [], intensity: 'full' })
    fireEvent.click(screen.getByRole('button', { name: /Preview on the phone/ }))
    expect(previews).toEqual(['halloween'])
    fireEvent.change(screen.getByLabelText('Message on the bar'), { target: { value: 'Spooky specials tonight' } })
    expect(changes.at(-1)!.messages).toEqual({ halloween: 'Spooky specials tonight' })
  })

  it('switches the look, and turns a festival off for good from the agenda', () => {
    const { changes } = renderPanel(light)
    fireEvent.click(screen.getByRole('radio', { name: /A touch/ }))
    expect(changes.at(-1)!.intensity).toBe('accent')
    fireEvent.click(screen.getByRole('switch', { name: 'Christmas' }))
    expect(changes.at(-1)!.off).toEqual(['christmas'])
    // Picking a future festival offers to skip it in advance.
    fireEvent.click(screen.getByRole('button', { name: /Black Friday/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip this year' }))
    expect(changes.at(-1)!.skipped).toEqual(['black-friday:2026'])
  })

  it('offers to bring back a festival the owner skipped', () => {
    const { changes } = renderPanel(withSeasonal(light, { skipped: ['halloween:2026'], off: ['pink-october'] }))
    fireEvent.click(screen.getByRole('button', { name: /^Halloween/ }))
    expect(screen.getAllByText('Skipped this year').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /Bring it back this year/ }))
    expect(changes.at(-1)).toMatchObject({ skipped: [], off: ['pink-october'] })
  })
})
