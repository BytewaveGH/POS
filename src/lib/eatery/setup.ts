// Creating a restaurant from a category preset: theme, hours, ways to order
// and the starter menu sections all come from the preset.

import { presetFor } from './presets'
import type { CategoryKey, MenuCategory, Restaurant, WeeklyHours } from './types'

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

export const isSlug = (s: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length >= 3 && s.length <= 48

const everyDay = (open: string, close: string): WeeklyHours => Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, [{ open, close }]]))

// Bars open late; cafés and bakeries early.
const DEFAULT_HOURS: Partial<Record<CategoryKey, WeeklyHours>> = {
  'cocktail-bar': everyDay('17:00', '02:00'),
  cafe: everyDay('07:00', '19:00'),
  bakery: everyDay('06:30', '19:00'),
  'juice-bar': everyDay('08:00', '20:00'),
}

export interface NewRestaurantInput {
  name: string
  slug: string
  category: CategoryKey
  city: string
  address: string
  phone?: string
}

export const newRestaurantDraft = (input: NewRestaurantInput): Omit<Restaurant, 'id'> => {
  const p = presetFor(input.category)
  return {
    ownerScope: '',
    slug: input.slug,
    name: input.name.trim(),
    tagline: '',
    category: input.category,
    menuKind: p.menuKind,
    theme: JSON.parse(JSON.stringify(p.theme)),
    currency: 'GHS',
    address: input.address.trim(),
    city: input.city.trim(),
    phone: input.phone?.trim() || undefined,
    whatsapp: input.phone?.trim() || undefined,
    hours: DEFAULT_HOURS[input.category] ?? everyDay('09:00', '22:00'),
    fulfilment: {
      pickup: { enabled: p.fulfilment.pickup, prepMinutes: 15 },
      delivery: { enabled: p.fulfilment.delivery, fee: 15, minOrder: 0, etaMinutes: 40 },
      dineIn: { enabled: p.fulfilment.dineIn, tables: p.fulfilment.dineIn ? ['1', '2', '3', '4', '5', '6'] : [] },
    },
    payments: { cash: true, momo: { enabled: false, number: '', accountName: '', network: 'mtn' }, payAtTable: p.fulfilment.dineIn },
    acceptingOrders: true,
    servesAlcohol: p.servesAlcohol,
    createdAt: new Date().toISOString(),
  }
}

export const starterSections = (restaurantId: number, category: CategoryKey): Omit<MenuCategory, 'id'>[] =>
  presetFor(category).sections.map((s, i) => ({
    restaurantId,
    name: s.name,
    description: s.description,
    schedule: s.schedule,
    position: i,
  }))
