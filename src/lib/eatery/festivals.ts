// Festival looks: while a festival is on, the storefront wears its colours
// and motif, then goes back to the restaurant's own look the day after.
//
// Nothing here is saved into the owner's theme. `dressForFestival` is applied
// when the public pages read a restaurant (hooks.ts), so the owner's colours
// are never touched and turning a festival off takes effect immediately.
// Fonts, layout, logo, cover and wording always stay the owner's.
//
// Each festival has a light and a dark palette; the one matching the owner's
// page background is used, so a dark theme stays dark. All of them pass WCAG
// AA as shipped (tests/eatery-festivals.test.ts).

import { contrast } from './color'
import type { Pattern, SeasonalSettings, ThemeColors, ThemeConfig } from './theme'

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

export interface Festival {
  key: FestivalKey
  name: string
  // One line for the ribbon above the menu.
  tagline: string
  // What the owner sees in the festival list.
  about: string
  colors: { light: ThemeColors; dark: ThemeColors }
  pattern: Pattern
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

export const FESTIVALS: Festival[] = [
  {
    key: 'new-year',
    name: 'New Year',
    tagline: 'Happy New Year — thank you for a wonderful year.',
    about: 'Gold and midnight, with confetti',
    colors: {
      light: palette('#FBF8F1', '#FFFFFF', '#14110A', '#5B5345', '#7A5C0E', '#E9D58A'),
      dark: palette('#0B0B14', '#16162A', '#FAF7EE', '#BDB7A6', '#E9C46A', '#C4B5FD'),
    },
    pattern: 'confetti',
    window: fixed(12, 31, 1, 2),
  },
  {
    key: 'valentines',
    name: 'Valentine’s & Chocolate Day',
    tagline: 'Treat someone you love this Valentine’s.',
    about: 'Rose red with hearts',
    colors: {
      light: palette('#FFF0F1', '#FFFFFF', '#3A0A0F', '#7A3340', '#BE123C', '#FDA4AF'),
      dark: palette('#1A0608', '#2A0D11', '#FFE4E6', '#E7A8B0', '#FB7185', '#FDA4AF'),
    },
    pattern: 'hearts',
    window: fixed(2, 10, 2, 14),
  },
  {
    key: 'independence',
    name: 'Independence Day',
    tagline: 'Happy Independence Day, Ghana!',
    about: 'Red, gold and green with kente',
    colors: {
      light: palette('#FFFBEB', '#FFFFFF', '#111111', '#4B4B4B', '#006B3F', '#FCD116'),
      dark: palette('#0A0A0A', '#161616', '#FFFFFF', '#B5B5B5', '#FCD116', '#CE1126'),
    },
    pattern: 'kente',
    window: fixed(3, 1, 3, 6),
  },
  {
    key: 'ramadan',
    name: 'Ramadan',
    tagline: 'Ramadan Kareem to everyone fasting this month.',
    about: 'Night blue and lantern gold',
    colors: {
      light: palette('#F4F1E8', '#FFFFFF', '#0F1E2E', '#4A5868', '#1E3A5F', '#D4A64A'),
      dark: palette('#0B1324', '#132038', '#F4EEDF', '#B6BCC8', '#E2B857', '#7DD3FC'),
    },
    pattern: 'stars',
    window: (y) => {
      const start = islamic(y, 'ramadan')
      const eid = islamic(y, 'fitr')
      return start && eid ? [start, addDays(eid, -1)] : null
    },
  },
  {
    key: 'eid-al-fitr',
    name: 'Eid al-Fitr',
    tagline: 'Eid Mubarak! Celebrate with family and friends.',
    about: 'Emerald and gold',
    colors: {
      light: palette('#F1F7F3', '#FFFFFF', '#0E2A1D', '#46604F', '#0F766E', '#E2B857'),
      dark: palette('#06201A', '#0C2E25', '#F1F7F3', '#AFC9BC', '#E2B857', '#5EEAD4'),
    },
    pattern: 'stars',
    window: (y) => {
      const eid = islamic(y, 'fitr')
      return eid ? around(eid, 0, 2) : null
    },
  },
  {
    key: 'easter',
    name: 'Easter',
    tagline: 'Happy Easter from all of us.',
    about: 'Spring lilac with sprinkles',
    colors: {
      light: palette('#F7F5FF', '#FFFFFF', '#211A3A', '#5B5475', '#6D28D9', '#FDE68A'),
      dark: palette('#16112A', '#221B3C', '#F7F5FF', '#BDB6D6', '#C4B5FD', '#FDE68A'),
    },
    pattern: 'sprinkles',
    // Good Friday to Easter Monday.
    window: (y) => around(easterSunday(y), 2, 1),
  },
  {
    key: 'mothers-day',
    name: 'Mother’s Day',
    tagline: 'For the women who fed us first. Happy Mother’s Day.',
    about: 'Blush and berry with hearts',
    colors: {
      light: palette('#FFF5F7', '#FFFFFF', '#3A1424', '#7A4A5E', '#9D174D', '#FBCFE8'),
      dark: palette('#1E0F16', '#2C1620', '#FFF1F5', '#D9AFC0', '#F9A8D4', '#FDE68A'),
    },
    pattern: 'hearts',
    // The second Sunday of May and the three days before.
    window: (y) => around(nthWeekday(y, 5, 0, 2), 3, 0),
  },
  {
    key: 'eid-al-adha',
    name: 'Eid al-Adha',
    tagline: 'Eid Mubarak to you and yours.',
    about: 'Emerald and gold',
    colors: {
      light: palette('#F3F6EE', '#FFFFFF', '#18240F', '#4F5E45', '#3F6212', '#E2B857'),
      dark: palette('#0F1A0A', '#1A2912', '#F3F6EE', '#BAC7AE', '#E2B857', '#A3E635'),
    },
    pattern: 'stars',
    window: (y) => {
      const eid = islamic(y, 'adha')
      return eid ? around(eid, 0, 2) : null
    },
  },
  {
    key: 'fathers-day',
    name: 'Father’s Day',
    tagline: 'Bring Dad — he deserves a good meal.',
    about: 'Navy and amber',
    colors: {
      light: palette('#EFF4F8', '#FFFFFF', '#0F1B2A', '#4A5B6E', '#1D4ED8', '#F59E0B'),
      dark: palette('#0B1220', '#142035', '#EFF4F8', '#AFBBCB', '#60A5FA', '#FBBF24'),
    },
    pattern: 'grid',
    // The third Sunday of June and the three days before.
    window: (y) => around(nthWeekday(y, 6, 0, 3), 3, 0),
  },
  {
    key: 'pink-october',
    name: 'Pink October',
    tagline: 'Breast cancer awareness month — get checked, and check on the women you love.',
    about: 'Pink with awareness ribbons, all month',
    colors: {
      light: palette('#FFF1F5', '#FFFFFF', '#3B0A1E', '#7A3B55', '#C2185B', '#F8A5C2'),
      dark: palette('#1F0A14', '#2B1020', '#FFE4EE', '#E0A9C0', '#F472B6', '#FBCFE8'),
    },
    pattern: 'ribbons',
    window: fixed(10, 1, 10, 31),
  },
  {
    key: 'halloween',
    name: 'Halloween',
    tagline: 'Spooky season is here. Happy Halloween!',
    about: 'Pumpkin and violet with bats, the last week of October',
    colors: {
      light: palette('#FFF4E6', '#FFFFFF', '#1C1007', '#5C4632', '#C2410C', '#7C3AED'),
      dark: palette('#120D16', '#1E1724', '#FFF4E6', '#C9B8A8', '#FB923C', '#A78BFA'),
    },
    pattern: 'bats',
    window: fixed(10, 25, 10, 31),
  },
  {
    key: 'black-friday',
    name: 'Black Friday',
    tagline: 'Black Friday weekend is here.',
    about: 'Black and electric yellow, Monday to Cyber Monday',
    colors: {
      light: palette('#F5F5F5', '#FFFFFF', '#0A0A0A', '#525252', '#0A0A0A', '#FACC15'),
      dark: palette('#000000', '#141414', '#FFFFFF', '#A3A3A3', '#FACC15', '#EF4444'),
    },
    pattern: 'halftone',
    // The Monday before to Cyber Monday.
    window: (y) => around(blackFriday(y), 4, 3),
  },
  {
    key: 'christmas',
    name: 'Christmas',
    tagline: 'Merry Christmas and happy holidays!',
    about: 'Holly red and pine green with snow, all of December',
    colors: {
      light: palette('#F7F3EA', '#FFFFFF', '#14231A', '#4B5A50', '#B91C1C', '#15803D'),
      dark: palette('#0B1F16', '#123024', '#F7F3EA', '#B9C9BE', '#F87171', '#FACC15'),
    },
    pattern: 'snow',
    window: fixed(12, 1, 12, 26),
  },
]

export const FESTIVAL_BY_KEY = Object.fromEntries(FESTIVALS.map((f) => [f.key, f])) as Record<FestivalKey, Festival>

export const DEFAULT_SEASONAL: SeasonalSettings = { auto: true, banner: true, off: [], skipped: [] }
export const seasonalOf = (theme: Pick<ThemeConfig, 'seasonal'>): SeasonalSettings => ({ ...DEFAULT_SEASONAL, ...theme.seasonal })

export const occurrenceId = (o: Pick<Occurrence, 'festival' | 'year'>) => `${o.festival.key}:${o.year}`

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const occurrence = (festival: Festival, year: number): Occurrence | null => {
  const w = festival.window(year)
  return w ? { festival, year, start: w[0], end: w[1] } : null
}
const covers = (o: Occurrence, day: Date) => o.start <= day && day <= o.end

// Every festival on today, most specific (shortest) first: Halloween wins
// over Pink October in the last week of October.
export const festivalsOn = (now: Date): Occurrence[] => {
  const day = startOfDay(now)
  const y = day.getFullYear()
  return FESTIVALS.flatMap((f) => [occurrence(f, y - 1), occurrence(f, y)].filter((o): o is Occurrence => !!o && covers(o, day))).sort(
    (a, b) => a.end.getTime() - a.start.getTime() - (b.end.getTime() - b.start.getTime())
  )
}

// Whether the owner lets this occurrence show.
export const allowed = (s: SeasonalSettings, o: Occurrence) => !s.off.includes(o.festival.key) && !s.skipped.includes(occurrenceId(o))

// The festival the storefront wears today, or null.
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

// The theme in a festival's colours and motif. Everything else is the owner's.
export const wearFestival = (theme: ThemeConfig, festival: Festival): ThemeConfig => ({
  ...theme,
  colors: { ...festival.colors[isDark(theme.colors.background) ? 'dark' : 'light'] },
  pattern: festival.pattern,
  festival: festival.key,
})

// What customers see today; `preview` forces a festival (the owner's editor).
export const dressForFestival = (theme: ThemeConfig, now: Date, preview?: FestivalKey | null): ThemeConfig => {
  const festival = preview ? FESTIVAL_BY_KEY[preview] : liveFestival(theme, now)?.festival
  return festival ? wearFestival(theme, festival) : theme
}

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
