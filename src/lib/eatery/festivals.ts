// Festival editions: while a festival is on, the storefront marks it — then
// goes back to normal the day after.
//
// By default (`intensity: 'full'`) the whole storefront takes the festival's
// look: its palette (light or dark, matching the owner's), and its glyph and
// gradients on every card, button, tab, badge, heading, cover and the page
// itself (festival-style.ts, storefront.css). On top: a slim bar above the
// page, a seal on the header and a ring around the logo. Owners who prefer a
// lighter touch choose `'accent'`: their colours stay, and only the bar, seal,
// ring and the festival colour as accent are added. Fonts, layout, photos and
// wording are never changed.
//
// Nothing is saved into the owner's theme: `dressForFestival` runs as the
// public pages read a restaurant (hooks.ts), so turning a festival off takes
// effect at once. Palettes and colours pass WCAG AA as shipped
// (tests/eatery-festivals.test.tsx).

import { contrast, ensureContrast, readableOn } from './color'
import type { SeasonalSettings, ThemeColors, ThemeConfig } from './theme'

export type FestivalKey =
  | 'new-year'
  | 'valentines'
  | 'independence'
  | 'ramadan'
  | 'eid-al-fitr'
  | 'easter'
  | 'mothers-day'
  | 'eid-al-adha'
  | 'fathers-day'
  | 'pink-october'
  | 'halloween'
  | 'black-friday'
  | 'christmas'

export type FestivalKind = 'holiday' | 'faith' | 'awareness' | 'shopping'

export interface Festival {
  key: FestivalKey
  name: string
  kind: FestivalKind
  // The bar's default line; owners can write their own.
  message: string
  // The festival's colour: accent, seal and logo ring.
  color: string
  // The bar: a deep shade that carries white text, and an optional hairline
  // of colours along its top edge (a flag, a season).
  bar: { background: string; stripe?: string[] }
  // Used only when the owner picks full festival colours.
  palette: { light: ThemeColors; dark: ThemeColors }
  // First and last day (inclusive, local time) of the occurrence that starts
  // in `year`, or null when the date isn't known for that year.
  window: (year: number) => [Date, Date] | null
}

export interface Occurrence {
  festival: Festival
  year: number
  start: Date
  end: Date
}

export const FESTIVAL_KINDS: Record<FestivalKind, string> = {
  holiday: 'Holiday',
  faith: 'Faith',
  awareness: 'Awareness',
  shopping: 'Shopping',
}

const DAY = 86_400_000
const date = (y: number, m: number, d: number) => new Date(y, m - 1, d)
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const fixed =
  (m1: number, d1: number, m2: number, d2: number) =>
  (y: number): [Date, Date] => [date(y, m1, d1), date(m2 < m1 ? y + 1 : y, m2, d2)]
// The nth weekday (0 = Sunday) of a month.
const nthWeekday = (y: number, m: number, weekday: number, n: number) => {
  const first = date(y, m, 1)
  return addDays(first, ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7)
}
const around = (day: Date, before: number, after: number): [Date, Date] => [addDays(day, -before), addDays(day, after)]

// Western Easter Sunday (anonymous Gregorian algorithm).
export const easterSunday = (y: number) => {
  const a = y % 19
  const b = Math.floor(y / 100)
  const c = y % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return date(y, month, day)
}

// Black Friday: the day after the fourth Thursday of November.
export const blackFriday = (y: number) => addDays(nthWeekday(y, 11, 4, 4), 1)

// The Islamic calendar follows the moon: expected dates, which can move by a
// day with the sighting. Extend the table each year.
const ISLAMIC: Record<number, { ramadan: [number, number]; fitr: [number, number]; adha: [number, number] }> = {
  2025: { ramadan: [3, 1], fitr: [3, 30], adha: [6, 6] },
  2026: { ramadan: [2, 18], fitr: [3, 20], adha: [5, 27] },
  2027: { ramadan: [2, 8], fitr: [3, 9], adha: [5, 16] },
  2028: { ramadan: [1, 28], fitr: [2, 26], adha: [5, 5] },
  2029: { ramadan: [1, 16], fitr: [2, 14], adha: [4, 24] },
  2030: { ramadan: [1, 5], fitr: [2, 4], adha: [4, 13] },
}
const islamic = (y: number, k: 'ramadan' | 'fitr' | 'adha') => {
  const row = ISLAMIC[y]
  return row ? date(y, ...row[k]) : null
}

const palette = (background: string, surface: string, text: string, muted: string, primary: string, accent: string): ThemeColors => ({
  background,
  surface,
  text,
  muted,
  primary,
  accent,
})

const GHANA = ['#CE1126', '#FCD116', '#006B3F']

export const FESTIVALS: Festival[] = [
  {
    key: 'new-year',
    name: 'New Year',
    kind: 'holiday',
    message: 'Happy New Year — thank you for dining with us.',
    color: '#A8801A',
    bar: { background: '#14110A', stripe: ['#E9C46A'] },
    palette: {
      light: palette('#FBF8F1', '#FFFFFF', '#14110A', '#5B5345', '#7A5C0E', '#E9D58A'),
      dark: palette('#0B0B14', '#16162A', '#FAF7EE', '#BDB7A6', '#E9C46A', '#C4B5FD'),
    },
    window: fixed(12, 31, 1, 2),
  },
  {
    key: 'valentines',
    name: 'Valentine’s Day',
    kind: 'holiday',
    message: 'Valentine’s & Chocolate Day — celebrate with someone special.',
    color: '#BE123C',
    bar: { background: '#881337' },
    palette: {
      light: palette('#FFF0F1', '#FFFFFF', '#3A0A0F', '#7A3340', '#BE123C', '#FDA4AF'),
      dark: palette('#1A0608', '#2A0D11', '#FFE4E6', '#E7A8B0', '#FB7185', '#FDA4AF'),
    },
    window: fixed(2, 10, 2, 14),
  },
  {
    key: 'independence',
    name: 'Independence Day',
    kind: 'holiday',
    message: 'Happy Independence Day, Ghana.',
    color: '#006B3F',
    bar: { background: '#111111', stripe: GHANA },
    palette: {
      light: palette('#FFFBEB', '#FFFFFF', '#111111', '#4B4B4B', '#006B3F', '#FCD116'),
      dark: palette('#0A0A0A', '#161616', '#FFFFFF', '#B5B5B5', '#FCD116', '#CE1126'),
    },
    window: fixed(3, 1, 3, 6),
  },
  {
    key: 'ramadan',
    name: 'Ramadan',
    kind: 'faith',
    message: 'Ramadan Kareem to everyone observing this month.',
    color: '#1E3A5F',
    bar: { background: '#0F1E33', stripe: ['#D4A64A'] },
    palette: {
      light: palette('#F4F1E8', '#FFFFFF', '#0F1E2E', '#4A5868', '#1E3A5F', '#D4A64A'),
      dark: palette('#0B1324', '#132038', '#F4EEDF', '#B6BCC8', '#E2B857', '#7DD3FC'),
    },
    window: (y) => {
      const start = islamic(y, 'ramadan')
      const eid = islamic(y, 'fitr')
      return start && eid ? [start, addDays(eid, -1)] : null
    },
  },
  {
    key: 'eid-al-fitr',
    name: 'Eid al-Fitr',
    kind: 'faith',
    message: 'Eid Mubarak from all of us.',
    color: '#0F766E',
    bar: { background: '#0B3D38', stripe: ['#D4A64A'] },
    palette: {
      light: palette('#F1F7F3', '#FFFFFF', '#0E2A1D', '#46604F', '#0F766E', '#E2B857'),
      dark: palette('#06201A', '#0C2E25', '#F1F7F3', '#AFC9BC', '#E2B857', '#5EEAD4'),
    },
    window: (y) => {
      const eid = islamic(y, 'fitr')
      return eid ? around(eid, 0, 2) : null
    },
  },
  {
    key: 'easter',
    name: 'Easter',
    kind: 'faith',
    message: 'Happy Easter from all of us.',
    color: '#6D28D9',
    bar: { background: '#3B1A78' },
    palette: {
      light: palette('#F7F5FF', '#FFFFFF', '#211A3A', '#5B5475', '#6D28D9', '#FDE68A'),
      dark: palette('#16112A', '#221B3C', '#F7F5FF', '#BDB6D6', '#C4B5FD', '#FDE68A'),
    },
    // Good Friday to Easter Monday.
    window: (y) => around(easterSunday(y), 2, 1),
  },
  {
    key: 'mothers-day',
    name: 'Mother’s Day',
    kind: 'holiday',
    message: 'Happy Mother’s Day — treat her to something good.',
    color: '#9D174D',
    bar: { background: '#701A3E' },
    palette: {
      light: palette('#FFF5F7', '#FFFFFF', '#3A1424', '#7A4A5E', '#9D174D', '#FBCFE8'),
      dark: palette('#1E0F16', '#2C1620', '#FFF1F5', '#D9AFC0', '#F9A8D4', '#FDE68A'),
    },
    // The second Sunday of May and the three days before.
    window: (y) => around(nthWeekday(y, 5, 0, 2), 3, 0),
  },
  {
    key: 'eid-al-adha',
    name: 'Eid al-Adha',
    kind: 'faith',
    message: 'Eid Mubarak from all of us.',
    color: '#3F6212',
    bar: { background: '#1F3A12', stripe: ['#D4A64A'] },
    palette: {
      light: palette('#F3F6EE', '#FFFFFF', '#18240F', '#4F5E45', '#3F6212', '#E2B857'),
      dark: palette('#0F1A0A', '#1A2912', '#F3F6EE', '#BAC7AE', '#E2B857', '#A3E635'),
    },
    window: (y) => {
      const eid = islamic(y, 'adha')
      return eid ? around(eid, 0, 2) : null
    },
  },
  {
    key: 'fathers-day',
    name: 'Father’s Day',
    kind: 'holiday',
    message: 'Happy Father’s Day — treat him to something good.',
    color: '#1D4ED8',
    bar: { background: '#172554' },
    palette: {
      light: palette('#EFF4F8', '#FFFFFF', '#0F1B2A', '#4A5B6E', '#1D4ED8', '#F59E0B'),
      dark: palette('#0B1220', '#142035', '#EFF4F8', '#AFBBCB', '#60A5FA', '#FBBF24'),
    },
    // The third Sunday of June and the three days before.
    window: (y) => around(nthWeekday(y, 6, 0, 3), 3, 0),
  },
  {
    key: 'pink-october',
    name: 'Pink October',
    kind: 'awareness',
    message: 'We’re going pink for Breast Cancer Awareness Month. Get checked.',
    color: '#DB2777',
    bar: { background: '#9D174D' },
    palette: {
      light: palette('#FFF1F5', '#FFFFFF', '#3B0A1E', '#7A3B55', '#C2185B', '#F8A5C2'),
      dark: palette('#1F0A14', '#2B1020', '#FFE4EE', '#E0A9C0', '#F472B6', '#FBCFE8'),
    },
    window: fixed(10, 1, 10, 31),
  },
  {
    key: 'halloween',
    name: 'Halloween',
    kind: 'holiday',
    message: 'Happy Halloween.',
    color: '#EA580C',
    bar: { background: '#1C1917', stripe: ['#EA580C'] },
    palette: {
      light: palette('#FFF4E6', '#FFFFFF', '#1C1007', '#5C4632', '#C2410C', '#7C3AED'),
      dark: palette('#120D16', '#1E1724', '#FFF4E6', '#C9B8A8', '#FB923C', '#A78BFA'),
    },
    window: fixed(10, 25, 10, 31),
  },
  {
    key: 'black-friday',
    name: 'Black Friday',
    kind: 'shopping',
    message: 'Black Friday weekend is here.',
    color: '#0A0A0A',
    bar: { background: '#0A0A0A', stripe: ['#FACC15'] },
    palette: {
      light: palette('#F5F5F5', '#FFFFFF', '#0A0A0A', '#525252', '#0A0A0A', '#FACC15'),
      dark: palette('#000000', '#141414', '#FFFFFF', '#A3A3A3', '#FACC15', '#EF4444'),
    },
    // The Monday before to Cyber Monday.
    window: (y) => around(blackFriday(y), 4, 3),
  },
  {
    key: 'christmas',
    name: 'Christmas',
    kind: 'holiday',
    message: 'Season’s greetings from all of us.',
    color: '#B91C1C',
    bar: { background: '#14532D', stripe: ['#B91C1C', '#E9C46A', '#B91C1C'] },
    palette: {
      light: palette('#F7F3EA', '#FFFFFF', '#14231A', '#4B5A50', '#B91C1C', '#15803D'),
      dark: palette('#0B1F16', '#123024', '#F7F3EA', '#B9C9BE', '#F87171', '#FACC15'),
    },
    window: fixed(12, 1, 12, 26),
  },
]

export const FESTIVAL_BY_KEY = Object.fromEntries(FESTIVALS.map((f) => [f.key, f])) as Record<FestivalKey, Festival>
export const festivalOf = (theme: Pick<ThemeConfig, 'festival'>) =>
  theme.festival ? (FESTIVAL_BY_KEY[theme.festival as FestivalKey] ?? null) : null

export const DEFAULT_SEASONAL: SeasonalSettings = { auto: true, intensity: 'full', banner: true, off: [], skipped: [], messages: {} }
export const seasonalOf = (theme: Pick<ThemeConfig, 'seasonal'>): SeasonalSettings => ({ ...DEFAULT_SEASONAL, ...theme.seasonal })

// The owner's line for the bar, or the festival's own.
export const messageFor = (s: SeasonalSettings, f: Festival) => s.messages?.[f.key]?.trim() || f.message

export const occurrenceId = (o: Pick<Occurrence, 'festival' | 'year'>) => `${o.festival.key}:${o.year}`

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const occurrence = (festival: Festival, year: number): Occurrence | null => {
  const w = festival.window(year)
  return w ? { festival, year, start: w[0], end: w[1] } : null
}
const covers = (o: Occurrence, day: Date) => o.start <= day && day <= o.end
const length = (o: Occurrence) => o.end.getTime() - o.start.getTime()

// Every festival on today, most specific (shortest) first: Halloween wins
// over Pink October in the last week of October.
export const festivalsOn = (now: Date): Occurrence[] => {
  const day = startOfDay(now)
  const y = day.getFullYear()
  return FESTIVALS.flatMap((f) => [occurrence(f, y - 1), occurrence(f, y)].filter((o): o is Occurrence => !!o && covers(o, day))).sort(
    (a, b) => length(a) - length(b)
  )
}

// Whether the owner lets this occurrence show.
export const allowed = (s: SeasonalSettings, o: Occurrence) => !s.off.includes(o.festival.key) && !s.skipped.includes(occurrenceId(o))

// The festival the storefront marks today, or null.
export const liveFestival = (theme: Pick<ThemeConfig, 'seasonal'>, now: Date): Occurrence | null => {
  const s = seasonalOf(theme)
  if (!s.auto) return null
  return festivalsOn(now).find((o) => allowed(s, o)) ?? null
}

// Each festival's current or next occurrence, in date order.
export const upcomingFestivals = (now: Date): Occurrence[] => {
  const day = startOfDay(now)
  const y = day.getFullYear()
  return FESTIVALS.map((f) => [y - 1, y, y + 1].map((yr) => occurrence(f, yr)).find((o): o is Occurrence => !!o && o.end >= day) ?? null)
    .filter((o): o is Occurrence => !!o)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

export const daysUntil = (o: Occurrence, now: Date) => Math.round((o.start.getTime() - startOfDay(now).getTime()) / DAY)

const isDark = (hex: string) => contrast(hex, '#ffffff') > contrast(hex, '#000000')

// The theme marked for a festival. 'accent' keeps the owner's palette and
// only brings in the festival colour; 'full' wears the festival palette.
export const wearFestival = (theme: ThemeConfig, festival: Festival): ThemeConfig => {
  const full = seasonalOf(theme).intensity === 'full'
  return {
    ...theme,
    colors: full
      ? { ...festival.palette[isDark(theme.colors.background) ? 'dark' : 'light'] }
      : { ...theme.colors, accent: festival.color },
    festival: festival.key,
  }
}

// What customers see today; `preview` forces a festival (the owner's editor).
export const dressForFestival = (theme: ThemeConfig, now: Date, preview?: FestivalKey | null): ThemeConfig => {
  const festival = preview ? FESTIVAL_BY_KEY[preview] : liveFestival(theme, now)?.festival
  return festival ? wearFestival(theme, festival) : theme
}

// The festival colour, adjusted to read (or show as a shape) on `bg`.
export const festivalInk = (f: Festival, bg: string, min = 3) => ensureContrast(f.color, bg, min)
export const barColors = (f: Festival) => ({ background: f.bar.background, text: readableOn(f.bar.background) })

// The year on the seal: New Year's Eve already counts as the new year.
export const sealYear = (f: Festival, now: Date) => now.getFullYear() + (f.key === 'new-year' && now.getMonth() === 11 ? 1 : 0)

// Removes past skips so the list doesn't grow forever.
export const pruneSkipped = (s: SeasonalSettings, now: Date): string[] => {
  const y = now.getFullYear()
  return s.skipped.filter((id) => Number(id.split(':')[1]) >= y - 1)
}

export const formatWindow = (o: Pick<Occurrence, 'start' | 'end'>) => {
  const d = (x: Date, month: boolean) => x.toLocaleDateString('en-GB', month ? { day: 'numeric', month: 'short' } : { day: 'numeric' })
  if (o.start.getTime() === o.end.getTime()) return d(o.start, true)
  const sameMonth = o.start.getMonth() === o.end.getMonth()
  return `${d(o.start, !sameMonth)} – ${d(o.end, true)}`
}
