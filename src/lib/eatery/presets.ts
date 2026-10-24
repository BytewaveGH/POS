// Category presets: a complete starting point per kind of place — a theme, a
// starter menu structure and reusable option templates (pizza sizes, shawarma
// proteins, cocktail ice…). Owners customise everything afterwards.
//
// Adding a new restaurant type = adding one entry here. Nothing else in the
// app switches on the category.

import type { CategoryKey, MenuKind, OptionGroup } from './types'
import type { ThemeConfig } from './theme'

export interface OptionTemplate extends Omit<OptionGroup, 'id' | 'choices'> {
  key: string
  choices: { name: string; priceDelta: number }[]
}

export interface CategoryPreset {
  key: CategoryKey
  label: string
  // For the directory filter
  group: 'Drinks & bars' | 'Fast food' | 'Cafés & bakeries' | 'Local & grills' | 'Restaurants'
  description: string
  mood: string
  menuKind: MenuKind
  servesAlcohol: boolean
  theme: ThemeConfig
  // Suggested menu sections, created with a new restaurant (editable).
  sections: { name: string; description?: string; schedule?: { days: number[]; from: string; to: string }[] }[]
  // Option groups the owner can attach to items in one tap.
  optionTemplates: OptionTemplate[]
  fulfilment: { pickup: boolean; delivery: boolean; dineIn: boolean }
}

const variant = (key: string, name: string, choices: [string, number][]): OptionTemplate => ({
  key,
  name,
  kind: 'variant',
  min: 1,
  max: 1,
  choices: choices.map(([n, p]) => ({ name: n, priceDelta: p })),
})
const addon = (key: string, name: string, max: number, choices: [string, number][]): OptionTemplate => ({
  key,
  name,
  kind: 'addon',
  min: 0,
  max,
  choices: choices.map(([n, p]) => ({ name: n, priceDelta: p })),
})

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]

const theme = (preset: CategoryKey, t: Omit<ThemeConfig, 'version' | 'preset' | 'imagery'> & { overlay?: number }): ThemeConfig => {
  const { overlay, ...rest } = t
  return { version: 1, preset, imagery: { coverOverlay: overlay ?? 0.45 }, ...rest }
}

export const PRESETS: CategoryPreset[] = [
  {
    key: 'cocktail-bar',
    label: 'Cocktail bar & lounge',
    group: 'Drinks & bars',
    description: 'Drinks-first menus: cocktails, mocktails, spirits and bar bites.',
    mood: 'Dark, intimate and elegant — gold on midnight, a serif with presence, art-deco fans.',
    menuKind: 'drinks',
    servesAlcohol: true,
    theme: theme('cocktail-bar', {
      colors: { background: '#0E0B12', surface: '#1A1520', text: '#F5EFE6', muted: '#B9AFC2', primary: '#D4A84F', accent: '#B4527A' },
      fonts: { display: 'playfair', body: 'dm-sans' },
      uppercaseHeadings: false,
      shape: 'soft',
      hero: 'cinematic',
      menuLayout: 'elegant-list',
      pattern: 'deco',
      copy: { add: 'Add to tab', cart: 'Your tab' },
      overlay: 0.6,
    }),
    sections: [
      { name: 'Signature cocktails', description: 'Our own recipes' },
      { name: 'Classics' },
      { name: 'Mocktails', description: 'All the craft, none of the alcohol' },
      { name: 'Spirits' },
      { name: 'Wine & bubbles' },
      { name: 'Beers' },
      { name: 'Bar bites' },
    ],
    optionTemplates: [
      variant('serve', 'Serve', [
        ['Single', 0],
        ['Double', 35],
      ]),
      variant('ice', 'Ice', [
        ['Regular ice', 0],
        ['Light ice', 0],
        ['Crushed ice', 0],
        ['No ice', 0],
      ]),
      variant('mixer', 'Mixer', [
        ['Tonic', 0],
        ['Soda water', 0],
        ['Cola', 0],
        ['Ginger ale', 0],
        ['Lemonade', 0],
      ]),
      variant('glass', 'Size', [
        ['Glass', 0],
        ['Bottle', 260],
      ]),
      addon('garnish', 'Extras', 2, [
        ['Extra shot', 30],
        ['Premium garnish', 10],
      ]),
    ],
    fulfilment: { pickup: true, delivery: false, dineIn: true },
  },
  {
    key: 'fast-food',
    label: 'Pizza, shawarma & fast food',
    group: 'Fast food',
    description: 'Build-your-own food: sizes, crusts, proteins, sauces, extras and combos.',
    mood: 'Loud and hungry — fire-engine red and mustard, poster capitals, halftone dots.',
    menuKind: 'food',
    servesAlcohol: false,
    theme: theme('fast-food', {
      colors: { background: '#FFF6E8', surface: '#FFFFFF', text: '#1C1410', muted: '#5E4E44', primary: '#D7261E', accent: '#FFC21A' },
      fonts: { display: 'bebas', body: 'outfit' },
      uppercaseHeadings: true,
      shape: 'rounded',
      hero: 'poster',
      menuLayout: 'bold-grid',
      pattern: 'halftone',
      copy: { add: 'Add', cart: 'Your order' },
    }),
    sections: [
      { name: 'Combos' },
      { name: 'Pizzas' },
      { name: 'Shawarma' },
      { name: 'Burgers' },
      { name: 'Fries & sides' },
      { name: 'Drinks' },
    ],
    optionTemplates: [
      variant('pizza-size', 'Size', [
        ['Small (8")', 0],
        ['Medium (12")', 45],
        ['Large (16")', 90],
      ]),
      variant('crust', 'Crust', [
        ['Classic hand-tossed', 0],
        ['Thin & crispy', 0],
        ['Cheese-stuffed crust', 20],
      ]),
      addon('toppings', 'Extra toppings', 5, [
        ['Extra cheese', 12],
        ['Pepperoni', 15],
        ['Chicken', 15],
        ['Mushrooms', 8],
        ['Sweet corn', 6],
        ['Green pepper', 6],
        ['Jalapeños', 8],
      ]),
      variant('protein', 'Protein', [
        ['Chicken', 0],
        ['Beef', 10],
        ['Mixed (chicken & beef)', 15],
      ]),
      addon('sauces', 'Sauces', 3, [
        ['Garlic mayo', 0],
        ['Chilli sauce', 0],
        ['Tahini', 0],
        ['BBQ', 0],
      ]),
      addon('shawarma-extras', 'Extras', 4, [
        ['Extra meat', 18],
        ['Cheese', 8],
        ['Fries inside', 6],
        ['Hotdog', 8],
      ]),
      variant('pepper', 'Pepper', [
        ['No pepper', 0],
        ['Mild', 0],
        ['Hot', 0],
        ['Ghana hot', 0],
      ]),
    ],
    fulfilment: { pickup: true, delivery: true, dineIn: false },
  },
  {
    key: 'cafe',
    label: 'Café & coffee shop',
    group: 'Cafés & bakeries',
    description: 'Coffee, tea, breakfast and pastries — with milk, size and sweetness choices.',
    mood: 'Warm and slow — cream paper, espresso brown, a soft serif, curls of steam.',
    menuKind: 'mixed',
    servesAlcohol: false,
    theme: theme('cafe', {
      colors: { background: '#F6EEE3', surface: '#FFFBF5', text: '#2B1D14', muted: '#6B5646', primary: '#7A4A2A', accent: '#C8794A' },
      fonts: { display: 'fraunces', body: 'nunito' },
      uppercaseHeadings: false,
      shape: 'rounded',
      hero: 'cozy',
      menuLayout: 'cozy-cards',
      pattern: 'steam',
      copy: { add: 'Add', cart: 'Your order' },
      overlay: 0.25,
    }),
    sections: [
      { name: 'Breakfast', description: 'Served until 11:30', schedule: [{ days: EVERY_DAY, from: '07:00', to: '11:30' }] },
      { name: 'Coffee' },
      { name: 'Tea & chocolate' },
      { name: 'Iced & blended' },
      { name: 'Pastries & cakes' },
      { name: 'Sandwiches' },
    ],
    optionTemplates: [
      variant('cup', 'Size', [
        ['Small', 0],
        ['Regular', 6],
        ['Large', 12],
      ]),
      variant('milk', 'Milk', [
        ['Whole milk', 0],
        ['Skimmed', 0],
        ['Oat milk', 6],
        ['Almond milk', 6],
        ['No milk', 0],
      ]),
      variant('sweetness', 'Sweetness', [
        ['No sugar', 0],
        ['Less sweet', 0],
        ['Regular', 0],
        ['Extra sweet', 0],
      ]),
      addon('coffee-extras', 'Extras', 3, [
        ['Extra espresso shot', 8],
        ['Vanilla syrup', 5],
        ['Caramel syrup', 5],
        ['Whipped cream', 5],
      ]),
      variant('temp', 'Served', [
        ['Hot', 0],
        ['Iced', 4],
      ]),
    ],
    fulfilment: { pickup: true, delivery: true, dineIn: true },
  },
  {
    key: 'local-dishes',
    label: 'Local dishes & chop bar',
    group: 'Local & grills',
    description: 'Jollof, waakye, fufu and light soup, banku and tilapia — with proteins and pepper levels.',
    mood: 'Proud and generous — forest green and gold, kente stripes, big friendly type.',
    menuKind: 'food',
    servesAlcohol: false,
    theme: theme('local-dishes', {
      colors: { background: '#FFFBF0', surface: '#FFFFFF', text: '#1B1A14', muted: '#57524A', primary: '#0B6E4F', accent: '#E8A317' },
      fonts: { display: 'outfit', body: 'nunito' },
      uppercaseHeadings: false,
      shape: 'soft',
      hero: 'poster',
      menuLayout: 'cozy-cards',
      pattern: 'kente',
      copy: { add: 'Add', cart: 'Your order' },
    }),
    sections: [
      { name: 'Rice dishes' },
      { name: 'Soups & fufu' },
      { name: 'Banku & kenkey' },
      { name: 'Waakye & breakfast', schedule: [{ days: EVERY_DAY, from: '06:30', to: '12:00' }] },
      { name: 'Sides' },
      { name: 'Local drinks' },
    ],
    optionTemplates: [
      variant('portion', 'Portion', [
        ['Regular', 0],
        ['Large', 15],
      ]),
      variant('local-protein', 'Protein', [
        ['Chicken', 0],
        ['Beef', 5],
        ['Goat', 12],
        ['Tilapia', 20],
        ['Eggs only', -10],
      ]),
      variant('starch', 'With', [
        ['Fufu', 0],
        ['Banku', 0],
        ['Omo tuo (rice balls)', 0],
        ['Kenkey', 0],
      ]),
      variant('local-pepper', 'Pepper', [
        ['No pepper', 0],
        ['A little', 0],
        ['Normal', 0],
        ['Plenty pepper', 0],
      ]),
      addon('local-extras', 'Extras', 4, [
        ['Boiled egg', 4],
        ['Wele', 6],
        ['Fried plantain', 6],
        ['Avocado', 6],
        ['Extra shito', 3],
      ]),
    ],
    fulfilment: { pickup: true, delivery: true, dineIn: true },
  },
  {
    key: 'grill',
    label: 'Grill & barbecue',
    group: 'Local & grills',
    description: 'Charcoal grills, kebabs and platters — doneness, portions and sides.',
    mood: 'Smoky and fierce — charcoal with ember orange, condensed capitals, sparks.',
    menuKind: 'mixed',
    servesAlcohol: true,
    theme: theme('grill', {
      colors: { background: '#121110', surface: '#1E1C1A', text: '#F4EDE4', muted: '#B5A99B', primary: '#F26B1D', accent: '#F2C14E' },
      fonts: { display: 'oswald', body: 'dm-sans' },
      uppercaseHeadings: true,
      shape: 'soft',
      hero: 'cinematic',
      menuLayout: 'bold-grid',
      pattern: 'ember',
      copy: { add: 'Add', cart: 'Your order' },
      overlay: 0.55,
    }),
    sections: [{ name: 'From the grill' }, { name: 'Kebabs' }, { name: 'Platters' }, { name: 'Sides' }, { name: 'Drinks' }],
    optionTemplates: [
      variant('grill-portion', 'Portion', [
        ['Quarter', 0],
        ['Half', 40],
        ['Full', 95],
      ]),
      variant('doneness', 'Cooked', [
        ['Medium', 0],
        ['Well done', 0],
      ]),
      variant('grill-side', 'Side', [
        ['Jollof', 0],
        ['Fries', 0],
        ['Fried yam', 0],
        ['Kelewele', 5],
      ]),
      addon('grill-sauces', 'Sauces', 2, [
        ['Suya spice', 0],
        ['Shito', 0],
        ['Peri-peri', 3],
      ]),
    ],
    fulfilment: { pickup: true, delivery: true, dineIn: true },
  },
  {
    key: 'bakery',
    label: 'Bakery & pastry',
    group: 'Cafés & bakeries',
    description: 'Breads, cakes by the slice or whole, pastries and custom orders.',
    mood: 'Sweet and cheerful — berry pink on blush, a playful script, sprinkles.',
    menuKind: 'food',
    servesAlcohol: false,
    theme: theme('bakery', {
      colors: { background: '#FFF4F6', surface: '#FFFFFF', text: '#3A2228', muted: '#6E5259', primary: '#B5174F', accent: '#F49AB8' },
      fonts: { display: 'pacifico', body: 'nunito' },
      uppercaseHeadings: false,
      shape: 'pill',
      hero: 'cozy',
      menuLayout: 'bold-grid',
      pattern: 'sprinkles',
      copy: { add: 'Add', cart: 'Your box' },
      overlay: 0.2,
    }),
    sections: [{ name: 'Fresh bread' }, { name: 'Cakes' }, { name: 'Pastries' }, { name: 'Celebration cakes' }, { name: 'Drinks' }],
    optionTemplates: [
      variant('cake-size', 'Size', [
        ['Slice', 0],
        ['Half cake', 120],
        ['Whole cake', 230],
      ]),
      variant('flavour', 'Flavour', [
        ['Vanilla', 0],
        ['Chocolate', 0],
        ['Red velvet', 15],
        ['Carrot', 10],
      ]),
      addon('bakery-extras', 'Extras', 3, [
        ['Message on top', 10],
        ['Candles', 5],
        ['Gift box', 8],
      ]),
    ],
    fulfilment: { pickup: true, delivery: true, dineIn: false },
  },
  {
    key: 'juice-bar',
    label: 'Juice & smoothie bar',
    group: 'Drinks & bars',
    description: 'Fresh juices, smoothies and shots — sizes, boosters and sweeteners.',
    mood: 'Fresh and bright — leaf green with mango orange, rounded geometry, citrus slices.',
    menuKind: 'drinks',
    servesAlcohol: false,
    theme: theme('juice-bar', {
      colors: { background: '#F2FAEE', surface: '#FFFFFF', text: '#13261A', muted: '#4A5E50', primary: '#1F7A1F', accent: '#FF8A1F' },
      fonts: { display: 'outfit', body: 'outfit' },
      uppercaseHeadings: false,
      shape: 'pill',
      hero: 'poster',
      menuLayout: 'bold-grid',
      pattern: 'citrus',
      copy: { add: 'Add', cart: 'Your order' },
    }),
    sections: [{ name: 'Fresh juices' }, { name: 'Smoothies' }, { name: 'Wellness shots' }, { name: 'Bowls' }],
    optionTemplates: [
      variant('juice-size', 'Size', [
        ['350 ml', 0],
        ['500 ml', 8],
        ['1 litre', 20],
      ]),
      addon('boosters', 'Boosters', 3, [
        ['Ginger shot', 6],
        ['Chia seeds', 5],
        ['Protein', 10],
        ['Moringa', 5],
      ]),
      variant('sweetener', 'Sweetener', [
        ['No sweetener', 0],
        ['Honey', 3],
        ['Dates', 4],
      ]),
    ],
    fulfilment: { pickup: true, delivery: true, dineIn: false },
  },
  {
    key: 'general',
    label: 'Restaurant (sells a bit of everything)',
    group: 'Restaurants',
    description: 'A neutral, very legible starting point for mixed menus — food and drinks.',
    mood: 'Clean and confident — lets the food and your logo do the talking.',
    menuKind: 'mixed',
    servesAlcohol: false,
    theme: theme('general', {
      colors: { background: '#F7F7F5', surface: '#FFFFFF', text: '#1A1A1A', muted: '#5C5C5C', primary: '#0865AC', accent: '#F59E0B' },
      fonts: { display: 'dm-sans', body: 'dm-sans' },
      uppercaseHeadings: false,
      shape: 'soft',
      hero: 'minimal',
      menuLayout: 'compact-list',
      pattern: 'dots',
      copy: { add: 'Add', cart: 'Your order' },
    }),
    sections: [{ name: 'Starters' }, { name: 'Mains' }, { name: 'Sides' }, { name: 'Desserts' }, { name: 'Drinks' }],
    optionTemplates: [
      variant('general-portion', 'Portion', [
        ['Regular', 0],
        ['Large', 15],
      ]),
      variant('general-side', 'Side', [
        ['Rice', 0],
        ['Chips', 0],
        ['Salad', 0],
      ]),
      addon('general-extras', 'Extras', 3, [
        ['Extra sauce', 3],
        ['Egg', 4],
      ]),
    ],
    fulfilment: { pickup: true, delivery: true, dineIn: true },
  },
]

export const PRESET_BY_KEY = Object.fromEntries(PRESETS.map((p) => [p.key, p])) as Record<CategoryKey, CategoryPreset>
export const presetFor = (key: CategoryKey | string | undefined) => PRESET_BY_KEY[key as CategoryKey] ?? PRESET_BY_KEY.general

export const DIRECTORY_GROUPS = ['Drinks & bars', 'Fast food', 'Cafés & bakeries', 'Local & grills', 'Restaurants'] as const

// Every option template, from every preset — owners of a "general" place can
// still borrow the pizza sizes.
export const ALL_OPTION_TEMPLATES = PRESETS.flatMap((p) => p.optionTemplates.map((t) => ({ ...t, from: p.label })))

let seq = 0
export const uid = (prefix = 'o') => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

export const optionGroupFromTemplate = (t: OptionTemplate): OptionGroup => ({
  id: uid('g'),
  name: t.name,
  kind: t.kind,
  min: t.min,
  max: t.max,
  choices: t.choices.map((c) => ({ id: uid('c'), name: c.name, priceDelta: c.priceDelta })),
})
