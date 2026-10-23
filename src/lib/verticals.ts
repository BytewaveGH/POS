import { Building2, FerrisWheel, ShoppingBag, UtensilsCrossed, Boxes, type LucideIcon } from 'lucide-react'

// One entry per appType. Colours are a validated categorical palette
// (distinct under colour-blindness, ≥3:1 on white) — always shown with the
// label and icon, never on their own.
export interface VerticalMeta {
  value: string
  label: string
  short: string
  description: string
  icon: LucideIcon
  color: string
}

export const VERTICALS: VerticalMeta[] = [
  {
    value: 'retail',
    label: 'Retail / POS',
    short: 'Retail',
    description: 'Shops, POS, inventory and sales',
    icon: ShoppingBag,
    color: '#0865AC',
  },
  {
    value: 'eatery',
    label: 'Eatery',
    short: 'Eatery',
    description: 'Restaurants, cafés and food spots',
    icon: UtensilsCrossed,
    color: '#D97706',
  },
  {
    value: 'amusement',
    label: 'Amusement Park',
    short: 'Amusement',
    description: 'Tickets, attractions, bookings',
    icon: FerrisWheel,
    color: '#7C3AED',
  },
  {
    value: 'real-estate',
    label: 'Real Estate',
    short: 'Real estate',
    description: 'Properties, tenants, rent and short stays',
    icon: Building2,
    color: '#0D9488',
  },
]

export const verticalMeta = (value: string): VerticalMeta =>
  VERTICALS.find((v) => v.value === value) ?? { value, label: value, short: value, description: '', icon: Boxes, color: '#78716C' }
