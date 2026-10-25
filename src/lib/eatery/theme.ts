// Theme configuration: the only thing that differs between restaurants'
// storefronts. Stored as JSON on each restaurant (`restaurant.theme`).
// `resolveTheme` turns it into CSS custom properties, fixing any colour pair
// that would be hard to read, so owners can't ship an unreadable menu.

import type React from 'react'
import { contrast, ensureContrast, isHex, mix, readableOn, withAlpha } from './color'
import type { CategoryKey } from './types'

// ── Fonts (self-hosted, see app/[locale]/(eatery-public)/eat/layout.tsx) ──

export type FontKey =
  | 'playfair'
  | 'fraunces'
  | 'instrument'
  | 'syne'
  | 'space-grotesk'
  | 'oswald'
  | 'bebas'
  | 'pacifico'
  | 'outfit'
  | 'inter'
  | 'dm-sans'
  | 'nunito'
  | 'mulish'

export const FONTS: Record<FontKey, { label: string; family: string; use: 'display' | 'body' | 'both'; feel: string }> = {
  playfair: {
    label: 'Playfair Display',
    family: "'Playfair Display Variable', Georgia, serif",
    use: 'display',
    feel: 'Elegant, high-contrast serif',
  },
  fraunces: { label: 'Fraunces', family: "'Fraunces Variable', Georgia, serif", use: 'display', feel: 'Warm, soft serif' },
  instrument: { label: 'Instrument Serif', family: "'Instrument Serif', Georgia, serif", use: 'display', feel: 'Refined editorial serif' },
  syne: { label: 'Syne', family: "'Syne Variable', system-ui, sans-serif", use: 'display', feel: 'Wide, avant-garde' },
  'space-grotesk': {
    label: 'Space Grotesk',
    family: "'Space Grotesk Variable', system-ui, sans-serif",
    use: 'both',
    feel: 'Technical, modern grotesk',
  },
  oswald: { label: 'Oswald', family: "'Oswald Variable', 'Arial Narrow', sans-serif", use: 'display', feel: 'Bold, condensed' },
  bebas: { label: 'Bebas Neue', family: "'Bebas Neue', Impact, sans-serif", use: 'display', feel: 'Poster capitals' },
  pacifico: { label: 'Pacifico', family: "'Pacifico', 'Brush Script MT', cursive", use: 'display', feel: 'Playful script' },
  outfit: { label: 'Outfit', family: "'Outfit Variable', system-ui, sans-serif", use: 'both', feel: 'Clean geometric' },
  inter: { label: 'Inter', family: "'Inter Variable', system-ui, sans-serif", use: 'both', feel: 'Crisp interface sans' },
  'dm-sans': { label: 'DM Sans', family: "'DM Sans Variable', system-ui, sans-serif", use: 'both', feel: 'Neutral, very legible' },
  nunito: { label: 'Nunito', family: "'Nunito Variable', system-ui, sans-serif", use: 'both', feel: 'Rounded, friendly' },
  mulish: { label: 'Mulish', family: 'var(--font-mulish), system-ui, sans-serif', use: 'both', feel: 'Sellix default' },
}

export const DISPLAY_FONTS = (Object.keys(FONTS) as FontKey[]).filter((k) => FONTS[k].use !== 'body')
// Script and poster faces are for headings only.
export const BODY_FONTS = (Object.keys(FONTS) as FontKey[]).filter((k) => FONTS[k].use !== 'display')

// ── Layout vocabulary ──

export type HeroStyle = 'cinematic' | 'poster' | 'cozy' | 'minimal'
export type MenuLayout = 'elegant-list' | 'bold-grid' | 'cozy-cards' | 'compact-list'
export type Shape = 'sharp' | 'soft' | 'rounded' | 'pill'
export type Pattern = 'none' | 'deco' | 'halftone' | 'steam' | 'kente' | 'ember' | 'sprinkles' | 'citrus' | 'dots' | 'grid' | 'waves'

// How cards sit on the page.
//   outlined  hairline border (the original look)
//   elevated  no border, soft layered shadow
//   glass     frosted, translucent over the backdrop
//   brutal    thick ink border with a hard offset shadow
export type SurfaceStyle = 'outlined' | 'elevated' | 'glass' | 'brutal'
// The page behind the cards.
export type Backdrop = 'solid' | 'gradient' | 'mesh'

export const SURFACES: { value: SurfaceStyle; label: string }[] = [
  { value: 'outlined', label: 'Outlined' },
  { value: 'elevated', label: 'Elevated' },
  { value: 'glass', label: 'Glass' },
  { value: 'brutal', label: 'Bold ink' },
]
export const BACKDROPS: { value: Backdrop; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'mesh', label: 'Colour mesh' },
]

export const HERO_STYLES: { value: HeroStyle; label: string; hint: string }[] = [
  { value: 'cinematic', label: 'Cinematic', hint: 'Full-bleed, moody, centred name' },
  { value: 'poster', label: 'Poster', hint: 'Loud colour block, huge capitals' },
  { value: 'cozy', label: 'Cozy', hint: 'Soft card with a rounded cover' },
  { value: 'minimal', label: 'Minimal', hint: 'Simple banner, menu first' },
]
export const MENU_LAYOUTS: { value: MenuLayout; label: string; hint: string }[] = [
  { value: 'elegant-list', label: 'Elegant list', hint: 'Names and prices with dotted leaders' },
  { value: 'bold-grid', label: 'Bold grid', hint: 'Big tiles, two per row on phones' },
  { value: 'cozy-cards', label: 'Cozy cards', hint: 'Photo on the left, story on the right' },
  { value: 'compact-list', label: 'Compact list', hint: 'Dense rows for long menus' },
]
export const SHAPES: { value: Shape; label: string }[] = [
  { value: 'sharp', label: 'Sharp' },
  { value: 'soft', label: 'Soft' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'pill', label: 'Pill' },
]
export const PATTERNS: { value: Pattern; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'deco', label: 'Art deco' },
  { value: 'halftone', label: 'Halftone' },
  { value: 'steam', label: 'Steam' },
  { value: 'kente', label: 'Kente' },
  { value: 'ember', label: 'Embers' },
  { value: 'sprinkles', label: 'Sprinkles' },
  { value: 'citrus', label: 'Citrus' },
  { value: 'dots', label: 'Dots' },
  { value: 'grid', label: 'Grid' },
  { value: 'waves', label: 'Waves' },
]

// ── The stored format ──

export interface ThemeColors {
  // Page background
  background: string
  // Cards, sheets
  surface: string
  // Main text
  text: string
  // Secondary text (descriptions)
  muted: string
  // Buttons, prices, active tabs
  primary: string
  // Highlights: badges, promo banner, pattern
  accent: string
}

export interface ThemeConfig {
  version: 1
  // The preset it started from (owners may change everything after).
  preset: CategoryKey
  colors: ThemeColors
  fonts: { display: FontKey; body: FontKey }
  // Headings in capitals (poster style)
  uppercaseHeadings: boolean
  shape: Shape
  hero: HeroStyle
  menuLayout: MenuLayout
  pattern: Pattern
  // Optional (older themes): default 'outlined' and 'solid'.
  surface?: SurfaceStyle
  backdrop?: Backdrop
  imagery: {
    logoUrl?: string
    coverUrl?: string
    // Darkening over the cover photo so the name stays readable (0–0.85)
    coverOverlay: number
  }
  // Wording that suits the place: "Add" vs "Add to tab", "Your order" vs "Your round"
  copy: { add: string; cart: string }
}

// ── Resolution ──

export interface ContrastCheck {
  id: string
  label: string
  // Ratio of the colours as chosen
  ratio: number
  required: number
  pass: boolean
  // What will actually be used (adjusted when it failed)
  used: string
}

export interface ResolvedTheme {
  config: ThemeConfig
  checks: ContrastCheck[]
  // Colours actually rendered
  palette: ThemeColors & { onPrimary: string; primaryText: string; accentText: string; onAccent: string; border: string }
  style: React.CSSProperties
}

const RADIUS: Record<Shape, { card: string; control: string }> = {
  sharp: { card: '0px', control: '0px' },
  soft: { card: '10px', control: '8px' },
  rounded: { card: '20px', control: '14px' },
  pill: { card: '24px', control: '999px' },
}

const safe = (c: string | undefined, fallback: string) => (c && isHex(c) ? c : fallback)

// Text needs 4.5:1 (WCAG AA); large display text and UI shapes 3:1.
export const resolveTheme = (config: ThemeConfig): ResolvedTheme => {
  const c = config.colors
  const background = safe(c.background, '#ffffff')
  const surface = safe(c.surface, background)
  const primary = safe(c.primary, '#0865AC')
  const accent = safe(c.accent, primary)
  const checks: ContrastCheck[] = []
  const check = (id: string, label: string, fg: string, bg: string, required: number) => {
    const ratio = contrast(fg, bg)
    const used = ensureContrast(fg, bg, required)
    checks.push({ id, label, ratio, required, pass: ratio >= required, used })
    return used
  }

  // Text must read on both the page and on cards.
  const textOnBg = check('text', 'Text on background', safe(c.text, readableOn(background)), background, 4.5)
  const text = ensureContrast(textOnBg, surface, 4.5)
  const muted = check('muted', 'Secondary text on cards', safe(c.muted, mix(text, surface, 0.35)), surface, 4.5)
  const onPrimary = readableOn(primary)
  checks.push({
    id: 'button',
    label: 'Button text',
    ratio: contrast(onPrimary, primary),
    required: 4.5,
    pass: contrast(onPrimary, primary) >= 4.5,
    used: onPrimary,
  })
  // Prices and links are written in the primary colour on cards.
  const primaryText = check('price', 'Prices and links on cards', primary, surface, 4.5)
  check('shape', 'Buttons against the page', primary, background, 3)
  const accentText = ensureContrast(accent, surface, 4.5)
  const onAccent = readableOn(accent)
  const border = mix(surface, text, luminance01(background) < 0.4 ? 0.18 : 0.12)
  const radius = RADIUS[config.shape] ?? RADIUS.soft

  const palette = { background, surface, text, muted, primary, accent, onPrimary, primaryText, accentText, onAccent, border }
  const style = {
    '--e-bg': background,
    '--e-surface': surface,
    '--e-text': text,
    '--e-muted': muted,
    '--e-primary': primary,
    '--e-on-primary': onPrimary,
    '--e-primary-text': primaryText,
    '--e-accent': accent,
    '--e-accent-text': accentText,
    '--e-on-accent': onAccent,
    '--e-border': border,
    '--e-primary-soft': withAlpha(primary, 0.12),
    '--e-accent-soft': withAlpha(accent, 0.16),
    '--e-radius': radius.card,
    '--e-radius-control': radius.control,
    '--e-font-display': (FONTS[config.fonts.display] ?? FONTS.mulish).family,
    '--e-font-body': (FONTS[config.fonts.body] ?? FONTS.mulish).family,
    '--e-heading-case': config.uppercaseHeadings ? 'uppercase' : 'none',
    '--e-ink': text,
    backgroundColor: background,
    ...backdropStyle(config.backdrop ?? 'solid', background, primary, accent),
    color: text,
    fontFamily: 'var(--e-font-body)',
  } as React.CSSProperties
  return { config, checks, palette, style }
}

// Washes stay faint (≤ 16% colour) so text contrast, checked against the solid
// background, still holds.
const backdropStyle = (b: Backdrop, bg: string, primary: string, accent: string): React.CSSProperties => {
  if (b === 'gradient')
    return {
      backgroundImage: `linear-gradient(180deg, ${bg} 0%, ${mix(bg, accent, 0.1)} 55%, ${mix(bg, primary, 0.12)} 100%)`,
      backgroundAttachment: 'fixed',
    }
  if (b === 'mesh')
    return {
      backgroundImage: `radial-gradient(60% 50% at 0% 0%, ${withAlpha(primary, 0.16)}, transparent 70%), radial-gradient(50% 45% at 100% 10%, ${withAlpha(accent, 0.16)}, transparent 70%), radial-gradient(60% 50% at 50% 100%, ${withAlpha(primary, 0.1)}, transparent 70%)`,
      backgroundAttachment: 'fixed',
    }
  return {}
}

const luminance01 = (hex: string) => {
  // Cheap perceived lightness for choosing border direction.
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, (x) => x + x) : h, 16)
  return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255
}

// Applies every contrast fix to the stored colours (the "Fix contrast" button).
export const fixContrast = (config: ThemeConfig): ThemeConfig => {
  const r = resolveTheme(config)
  return { ...config, colors: { ...config.colors, text: r.palette.text, muted: r.palette.muted, primary: fixPrimary(r) } }
}
const fixPrimary = (r: ResolvedTheme) => {
  // Keep the brand colour unless prices written in it fail on cards.
  const price = r.checks.find((c) => c.id === 'price')
  return price && !price.pass ? price.used : r.palette.primary
}

// ── Decorative patterns (CSS only — no image downloads) ──

const svg = (body: string, size: number) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>${body}</svg>`)}")`

export const patternStyle = (pattern: Pattern, color: string, opacity = 0.18): React.CSSProperties => {
  const c = withAlpha(color, opacity)
  switch (pattern) {
    case 'deco':
      return {
        backgroundImage: svg(
          `<g fill='none' stroke='${c}' stroke-width='1.2'><path d='M0 40a40 40 0 0 1 80 0M10 40a30 30 0 0 1 60 0M20 40a20 20 0 0 1 40 0M30 40a10 10 0 0 1 20 0'/><path d='M-40 80a40 40 0 0 1 80 0M40 80a40 40 0 0 1 80 0M-30 80a30 30 0 0 1 60 0M50 80a30 30 0 0 1 60 0'/></g>`,
          80
        ),
      }
    case 'halftone':
      return { backgroundImage: `radial-gradient(${c} 22%, transparent 24%)`, backgroundSize: '14px 14px' }
    case 'dots':
      return { backgroundImage: `radial-gradient(${c} 1.5px, transparent 1.6px)`, backgroundSize: '18px 18px' }
    case 'steam':
      return {
        backgroundImage: svg(
          `<g fill='none' stroke='${c}' stroke-width='1.6' stroke-linecap='round'><path d='M10 50c-6-8 6-12 0-20s6-12 0-20'/><path d='M34 56c-6-8 6-12 0-20s6-12 0-20'/></g>`,
          48
        ),
      }
    case 'kente':
      return {
        backgroundImage: `repeating-linear-gradient(90deg, ${c} 0 10px, transparent 10px 22px), repeating-linear-gradient(0deg, ${withAlpha(color, opacity * 0.7)} 0 6px, transparent 6px 30px)`,
      }
    case 'ember':
      return {
        backgroundImage: `radial-gradient(circle at 20% 30%, ${c} 0 2px, transparent 3px), radial-gradient(circle at 70% 70%, ${c} 0 1.5px, transparent 2.5px), radial-gradient(circle at 50% 10%, ${withAlpha(color, opacity * 0.6)} 0 1px, transparent 2px)`,
        backgroundSize: '60px 60px, 90px 90px, 40px 40px',
      }
    case 'sprinkles':
      return {
        backgroundImage: svg(
          `<g fill='${c}'><rect x='6' y='8' width='9' height='3' rx='1.5' transform='rotate(30 10 9)'/><rect x='30' y='20' width='9' height='3' rx='1.5' transform='rotate(-40 34 21)'/><rect x='14' y='34' width='9' height='3' rx='1.5' transform='rotate(70 18 35)'/><circle cx='38' cy='40' r='2'/></g>`,
          48
        ),
      }
    case 'citrus':
      return {
        backgroundImage: svg(
          `<g fill='none' stroke='${c}' stroke-width='1.4'><circle cx='24' cy='24' r='14'/><path d='M24 10v28M10 24h28M14 14l20 20M34 14 14 34'/></g>`,
          56
        ),
      }
    case 'grid':
      return {
        backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
      }
    case 'waves':
      return {
        backgroundImage: svg(
          `<path d='M0 20 Q 15 8 30 20 T 60 20' fill='none' stroke='${c}' stroke-width='1.6'/><path d='M0 44 Q 15 32 30 44 T 60 44' fill='none' stroke='${c}' stroke-width='1.6'/>`,
          60
        ),
      }
    default:
      return {}
  }
}
