'use client'

import React from 'react'
import { Egg, Flag, Gift, Ghost, Heart, Moon, PartyPopper, Ribbon, Star, Tag, TreePine, type LucideIcon } from 'lucide-react'
import { FESTIVAL_BY_KEY, seasonalOf, type FestivalKey } from '@/lib/eatery/festivals'
import type { ThemeConfig } from '@/lib/eatery/theme'

export const FESTIVAL_ICONS: Record<FestivalKey, LucideIcon> = {
  'new-year': PartyPopper,
  valentines: Heart,
  independence: Flag,
  ramadan: Moon,
  'eid-al-fitr': Star,
  easter: Egg,
  'mothers-day': Heart,
  'eid-al-adha': Star,
  'fathers-day': Gift,
  'pink-october': Ribbon,
  halloween: Ghost,
  'black-friday': Tag,
  christmas: TreePine,
}

// A slim line above the menu while the storefront wears a festival look
// (unless the owner turned the ribbon off). Renders inside ThemeScope.
export const FestivalRibbon = ({ theme }: { theme: ThemeConfig }) => {
  const festival = theme.festival ? FESTIVAL_BY_KEY[theme.festival as FestivalKey] : undefined
  if (!festival || !seasonalOf(theme).banner) return null
  const Icon = FESTIVAL_ICONS[festival.key]
  return (
    <div style={{ background: 'var(--e-accent-soft)', borderBottom: '1px solid var(--e-border)' }} data-testid="festival-ribbon">
      <p className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-4 py-2 text-center text-[13px] leading-snug">
        <Icon className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--e-primary-text)' }} aria-hidden />
        <span>
          <strong className="font-extrabold">{festival.name}</strong>
          <span className="e-muted"> · {festival.tagline}</span>
        </span>
      </p>
    </div>
  )
}
