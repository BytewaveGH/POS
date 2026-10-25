// Design styles: complete, contemporary looks any restaurant can wear,
// independent of what it sells. Category presets (presets.ts) are a starting
// point by kind of place; these are a starting point by taste.
//
// Each style sets every visual dimension together — palette, type pairing,
// header, menu layout, corners, surface treatment, backdrop and texture — so
// the result reads as one deliberate system. Applying one keeps the owner's
// logo, cover photo and wording. All of them pass WCAG AA as shipped
// (tests/eatery-core.test.ts).

import type { ThemeConfig } from './theme'

export type StyleKey =
  | 'noir'
  | 'swiss'
  | 'aurora'
  | 'brutal'
  | 'editorial'
  | 'soft-clay'
  | 'sage'
  | 'night-market'
  | 'citrus-pop'
  | 'champagne'

type StyleTheme = Omit<ThemeConfig, 'version' | 'preset' | 'imagery' | 'copy'>

export interface DesignStyle {
  key: StyleKey
  name: string
  description: string
  // Shown as small chips on the card.
  tags: string[]
  // Who it tends to suit (not a restriction).
  suits: string
  theme: StyleTheme
}

export const DESIGN_STYLES: DesignStyle[] = [
  {
    key: 'noir',
    name: 'Noir',
    description: 'Monochrome luxury. Black, white and a refined serif — nothing competes with your food.',
    tags: ['Dark', 'Minimal', 'Serif'],
    suits: 'Cocktail bars, fine dining, omakase',
    theme: {
      colors: { background: '#0A0A0A', surface: '#141414', text: '#FAFAFA', muted: '#A3A3A3', primary: '#FAFAFA', accent: '#D4D4D4' },
      fonts: { display: 'instrument', body: 'inter' },
      uppercaseHeadings: false,
      shape: 'sharp',
      hero: 'cinematic',
      menuLayout: 'elegant-list',
      pattern: 'none',
      surface: 'outlined',
      backdrop: 'solid',
    },
  },
  {
    key: 'swiss',
    name: 'Swiss',
    description: 'International typographic style: a strict grid, one signal red, crisp grotesk type.',
    tags: ['Light', 'Grid', 'Graphic'],
    suits: 'Modern cafés, burger joints, delis',
    theme: {
      colors: { background: '#F4F4F0', surface: '#FFFFFF', text: '#111111', muted: '#555555', primary: '#D90414', accent: '#111111' },
      fonts: { display: 'space-grotesk', body: 'inter' },
      uppercaseHeadings: false,
      shape: 'sharp',
      hero: 'minimal',
      menuLayout: 'compact-list',
      pattern: 'grid',
      surface: 'outlined',
      backdrop: 'solid',
    },
  },
  {
    key: 'aurora',
    name: 'Aurora Glass',
    description: 'Frosted glass cards floating over a soft colour mesh. Calm, premium, very current.',
    tags: ['Dark', 'Glass', 'Gradient'],
    suits: 'Lounges, juice bars, dessert spots',
    theme: {
      colors: { background: '#0F172A', surface: '#1E293B', text: '#F1F5F9', muted: '#A9B6C8', primary: '#38BDF8', accent: '#A78BFA' },
      fonts: { display: 'syne', body: 'inter' },
      uppercaseHeadings: false,
      shape: 'rounded',
      hero: 'cinematic',
      menuLayout: 'cozy-cards',
      pattern: 'none',
      surface: 'glass',
      backdrop: 'mesh',
    },
  },
  {
    key: 'brutal',
    name: 'Neo-brutal',
    description: 'Thick ink outlines, hard shadows and loud colour. Confident, playful, impossible to miss.',
    tags: ['Light', 'Bold', 'Outlined'],
    suits: 'Burgers, wings, shawarma, street food',
    theme: {
      colors: { background: '#FFF1C9', surface: '#FFFFFF', text: '#111111', muted: '#3D3D3D', primary: '#C2410C', accent: '#FFD23F' },
      fonts: { display: 'space-grotesk', body: 'space-grotesk' },
      uppercaseHeadings: true,
      shape: 'sharp',
      hero: 'poster',
      menuLayout: 'bold-grid',
      pattern: 'dots',
      surface: 'brutal',
      backdrop: 'solid',
    },
  },
  {
    key: 'editorial',
    name: 'Editorial',
    description: 'A food magazine spread: warm paper, a high-fashion serif, generous white space.',
    tags: ['Light', 'Serif', 'Airy'],
    suits: 'Bistros, brunch, wine bars',
    theme: {
      colors: { background: '#F7F3EC', surface: '#FFFDF8', text: '#1A1A1A', muted: '#5A554E', primary: '#1A1A1A', accent: '#B8452F' },
      fonts: { display: 'instrument', body: 'dm-sans' },
      uppercaseHeadings: false,
      shape: 'soft',
      hero: 'cozy',
      menuLayout: 'elegant-list',
      pattern: 'none',
      surface: 'elevated',
      backdrop: 'solid',
    },
  },
  {
    key: 'soft-clay',
    name: 'Soft Clay',
    description: 'Pastel, rounded and tactile — like a well-designed app. Friendly without being childish.',
    tags: ['Light', 'Pastel', 'Rounded'],
    suits: 'Bubble tea, bakeries, ice cream',
    theme: {
      colors: { background: '#F3EEF8', surface: '#FFFFFF', text: '#2A2340', muted: '#5F5873', primary: '#6D4AFF', accent: '#FFB3C7' },
      fonts: { display: 'outfit', body: 'inter' },
      uppercaseHeadings: false,
      shape: 'pill',
      hero: 'cozy',
      menuLayout: 'cozy-cards',
      pattern: 'waves',
      surface: 'elevated',
      backdrop: 'gradient',
    },
  },
  {
    key: 'sage',
    name: 'Sage & Stone',
    description: 'Muted greens, natural stone and a gentle serif. Calm, honest, seasonal.',
    tags: ['Light', 'Natural', 'Calm'],
    suits: 'Healthy bowls, farm-to-table, coffee',
    theme: {
      colors: { background: '#EEF1EA', surface: '#FAFBF8', text: '#1F2A1F', muted: '#536051', primary: '#3F6B4A', accent: '#C7A46A' },
      fonts: { display: 'fraunces', body: 'inter' },
      uppercaseHeadings: false,
      shape: 'rounded',
      hero: 'cozy',
      menuLayout: 'cozy-cards',
      pattern: 'none',
      surface: 'elevated',
      backdrop: 'solid',
    },
  },
  {
    key: 'night-market',
    name: 'Night Market',
    description: 'Neon-lit street food after dark: bold capitals, electric yellow, glowing colour.',
    tags: ['Dark', 'Neon', 'Poster'],
    suits: 'Late-night food, grills, kebab, pizza',
    theme: {
      colors: { background: '#111015', surface: '#1C1A22', text: '#FFF7ED', muted: '#C4B8AA', primary: '#FACC15', accent: '#F43F5E' },
      fonts: { display: 'bebas', body: 'space-grotesk' },
      uppercaseHeadings: true,
      shape: 'soft',
      hero: 'poster',
      menuLayout: 'bold-grid',
      pattern: 'halftone',
      surface: 'outlined',
      backdrop: 'mesh',
    },
  },
  {
    key: 'citrus-pop',
    name: 'Citrus Pop',
    description: 'Electric blue and acid lime on clean white. Young, fast and made for phones.',
    tags: ['Light', 'Vivid', 'Rounded'],
    suits: 'Smoothies, poke, fast-casual',
    theme: {
      colors: { background: '#FFFFFF', surface: '#F5F6F0', text: '#101010', muted: '#4A4A4A', primary: '#0040E6', accent: '#C6F432' },
      fonts: { display: 'syne', body: 'space-grotesk' },
      uppercaseHeadings: false,
      shape: 'pill',
      hero: 'poster',
      menuLayout: 'bold-grid',
      pattern: 'none',
      surface: 'elevated',
      backdrop: 'solid',
    },
  },
  {
    key: 'champagne',
    name: 'Champagne',
    description: 'Ivory, bronze and a classic display serif. Quiet luxury in daylight.',
    tags: ['Light', 'Luxe', 'Serif'],
    suits: 'Hotels, patisseries, rooftop bars',
    theme: {
      colors: { background: '#FBF8F3', surface: '#FFFFFF', text: '#1C1917', muted: '#6B6259', primary: '#7D5D24', accent: '#E8D9B5' },
      fonts: { display: 'playfair', body: 'inter' },
      uppercaseHeadings: false,
      shape: 'soft',
      hero: 'cinematic',
      menuLayout: 'elegant-list',
      pattern: 'deco',
      surface: 'elevated',
      backdrop: 'solid',
    },
  },
]

export const STYLE_BY_KEY = Object.fromEntries(DESIGN_STYLES.map((s) => [s.key, s])) as Record<StyleKey, DesignStyle>

// Wear a style: everything visual changes; logo, cover, wording and the
// restaurant's category preset stay.
export const applyStyle = (current: ThemeConfig, style: DesignStyle): ThemeConfig => ({
  ...current,
  ...JSON.parse(JSON.stringify(style.theme)),
  version: 1,
  preset: current.preset,
  imagery: current.imagery,
  copy: current.copy,
})

// Which style a theme currently matches exactly (for the "selected" state).
export const matchingStyle = (t: ThemeConfig): StyleKey | null => {
  const pick = (x: Partial<ThemeConfig>) =>
    JSON.stringify([
      x.colors,
      x.fonts,
      x.uppercaseHeadings,
      x.shape,
      x.hero,
      x.menuLayout,
      x.pattern,
      x.surface ?? 'outlined',
      x.backdrop ?? 'solid',
    ])
  return DESIGN_STYLES.find((s) => pick(s.theme) === pick(t))?.key ?? null
}
