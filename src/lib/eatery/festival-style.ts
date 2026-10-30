// The full festival look, applied to every storefront component.
//
// Each festival has a glyph (a heart, a crescent, an awareness ribbon…) drawn
// in the same 24-unit, round-stroke style as the interface icons. From it and
// the festival palette, `festivalVars` builds CSS variables that
// storefront.css uses under `[data-festival-mode='full']` to restyle cards,
// buttons, tabs, badges, choices, inputs, section headings, the page
// background, covers and item tiles. Components stay unaware of festivals.
//
// Decoration stays behind content at low opacity, and colours come from the
// contrast-checked palette, so readability doesn't depend on the festival.

import type React from 'react'
import { mix, readableOn, withAlpha } from './color'
import type { Festival, FestivalKey } from './festivals'
import type { ResolvedTheme } from './theme'

interface Glyph {
  // SVG body in a 24×24 box.
  body: (color: string) => string
}

const stroke = (d: string) => (c: string) =>
  `<path d='${d}' fill='none' stroke='${c}' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'/>`
const fill = (d: string) => (c: string) => `<path d='${d}' fill='${c}'/>`

const HEART = 'M12 20.5s-7.5-4.6-7.5-10.4A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.8c0 5.8-7.5 10.4-7.5 10.4z'
const STAR = 'M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z'

export const GLYPHS: Record<FestivalKey, Glyph> = {
  // A four-point sparkle.
  'new-year': { body: fill('M12 2.5c.9 5.2 2.6 7 7.5 8-4.9 1-6.6 2.8-7.5 8-.9-5.2-2.6-7-7.5-8 4.9-1 6.6-2.8 7.5-8z') },
  valentines: { body: fill(HEART) },
  // Ghana's black star.
  independence: { body: fill(STAR) },
  ramadan: {
    body: (c) =>
      `${fill('M14.5 3a8.6 8.6 0 1 0 6 14.6A7.2 7.2 0 1 1 14.5 3z')(c)}${fill('M19 5.2l.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2z')(c)}`,
  },
  // An eight-point star.
  'eid-al-fitr': {
    body: (c) =>
      `<g fill='none' stroke='${c}' stroke-width='1.75' stroke-linejoin='round'><rect x='6' y='6' width='12' height='12'/><rect x='6' y='6' width='12' height='12' transform='rotate(45 12 12)'/></g>`,
  },
  easter: {
    body: stroke('M12 3c3.6 0 6.2 5.3 6.2 10.2a6.2 6.2 0 0 1-12.4 0C5.8 8.3 8.4 3 12 3zM6.4 12.5l2.4-1.5 2.2 1.5 2-1.5 2.2 1.5 2.4-1.5'),
  },
  'mothers-day': { body: fill(HEART) },
  'eid-al-adha': {
    body: (c) =>
      `<g fill='none' stroke='${c}' stroke-width='1.75' stroke-linejoin='round'><rect x='6' y='6' width='12' height='12'/><rect x='6' y='6' width='12' height='12' transform='rotate(45 12 12)'/></g>`,
  },
  // A bow tie.
  'fathers-day': { body: stroke('M12 12 4 7.5v9zM12 12l8-4.5v9zM10.6 12h2.8') },
  // The awareness ribbon.
  'pink-october': {
    body: stroke(
      'M12 12.2 7.2 21M12 12.2l4.8 8.8M12 12.2C9.9 9.7 8.7 7.7 8.7 6A3.3 3.3 0 0 1 12 2.8 3.3 3.3 0 0 1 15.3 6c0 1.7-1.2 3.7-3.3 6.2z'
    ),
  },
  // A pumpkin: three lobes, wider than tall, with a stem and a leaf.
  halloween: {
    body: (c) =>
      `${fill('M12 8.2c-1.1-.8-2.6-1-4-.6-2.9.8-4.8 3.4-4.8 6.6 0 3.4 2.3 6.1 5.4 6.1 1.3 0 2.5-.4 3.4-1.1.9.7 2.1 1.1 3.4 1.1 3.1 0 5.4-2.7 5.4-6.1 0-3.2-1.9-5.8-4.8-6.6-1.4-.4-2.9-.2-4 .6z')(c)}${stroke('M12 8.2c0-2 .4-3.4 1.6-4.4M13.6 5.2c1.4-1 3-1 4.2-.2-1 1.3-2.6 1.6-4.2.2')(c)}`,
  },
  'black-friday': {
    body: (c) => `${stroke('M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3-8.7 8.7z')(c)}<circle cx='8' cy='8' r='1.4' fill='${c}'/>`,
  },
  christmas: { body: stroke('M12 3l4.8 6.5h-2.6l3.8 5.5H6l3.8-5.5H7.2zM12 15v5') },
}

const glyphUrl = (key: FestivalKey, color: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>${GLYPHS[key].body(color)}</svg>`)}")`

// The glyph scattered across a tile: two sizes, two angles, two dots.
export const festivalScatter = (key: FestivalKey, color: string, opacity: number): React.CSSProperties => {
  const c = withAlpha(color, opacity)
  const g = (x: number, y: number, size: number, rotate: number) =>
    `<g transform='translate(${x} ${y}) rotate(${rotate} ${size / 2} ${size / 2}) scale(${size / 24})'>${GLYPHS[key].body(c)}</g>`
  const tile = `<svg xmlns='http://www.w3.org/2000/svg' width='132' height='132' viewBox='0 0 132 132'>${g(14, 16, 18, -14)}${g(76, 70, 26, 12)}<circle cx='98' cy='24' r='2' fill='${c}'/><circle cx='30' cy='104' r='1.6' fill='${c}'/></svg>`
  return { backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(tile)}")` }
}

// CSS variables for storefront.css. `ink` is the festival colour already
// checked against the cards (theme-scope.tsx).
export const festivalVars = (f: Festival, r: ResolvedTheme, ink: string): Record<string, string> => {
  const p = r.palette
  // Second gradient stops move away from the text colour, so button and
  // badge text keeps (or gains) contrast across the whole gradient.
  const away = (bg: string, text: string, t: number) => mix(bg, text === '#ffffff' ? '#000000' : '#ffffff', t)
  return {
    '--e-primary-2': away(p.primary, p.onPrimary, 0.18),
    '--e-accent-2': away(p.accent, readableOn(p.accent), 0.2),
    '--e-fx-card': glyphUrl(f.key, withAlpha(ink, 0.22)),
    '--e-fx-mark': glyphUrl(f.key, '#000000'),
    '--e-fx-badge': festivalScatter(f.key, p.onAccent, 0.16).backgroundImage as string,
  }
}

// The page behind everything: the scatter, faint, over the theme's backdrop.
export const festivalBackdrop = (f: Festival, r: ResolvedTheme): React.CSSProperties => {
  const scatter = festivalScatter(f.key, r.palette.primaryText, 0.07).backgroundImage as string
  const base = r.style.backgroundImage as string | undefined
  return { backgroundImage: base ? `${scatter}, ${base}` : scatter }
}
