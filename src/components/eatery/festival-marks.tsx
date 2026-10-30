'use client'

import React, { useId } from 'react'
import { Egg, Flag, Gift, Ghost, Heart, Moon, PartyPopper, Ribbon, Star, Tag, TreePine, type LucideIcon } from 'lucide-react'
import { ensureContrast } from '@/lib/eatery/color'
import { barColors, festivalInk, festivalOf, messageFor, seasonalOf, type Festival, type FestivalKey } from '@/lib/eatery/festivals'
import type { ThemeConfig } from '@/lib/eatery/theme'
import { useResolvedTheme } from './theme-scope'

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

// The hairline of festival colours (a flag, a season) along the bar's top.
export const FestivalStripe = ({ festival, className }: { festival: Festival; className?: string }) =>
  festival.bar.stripe ? (
    <div className={className ?? 'flex h-[3px]'} aria-hidden>
      {festival.bar.stripe.map((c, i) => (
        <span key={i} className="flex-1" style={{ background: c }} />
      ))}
    </div>
  ) : null

// A slim announcement bar at the very top of the page, in the festival's own
// colours whatever the restaurant's palette, like a store's notice bar.
export const FestivalBar = ({ theme }: { theme: ThemeConfig }) => {
  const festival = festivalOf(theme)
  const s = seasonalOf(theme)
  if (!festival || !s.banner) return null
  const Icon = FESTIVAL_ICONS[festival.key]
  const bar = barColors(festival)
  return (
    <div style={{ background: bar.background, color: bar.text }} data-testid="festival-bar">
      <FestivalStripe festival={festival} />
      <p className="mx-auto flex max-w-5xl items-center justify-center gap-2.5 px-4 py-2.5 text-center text-[13px] font-semibold leading-snug tracking-[0.01em]">
        <Icon
          className="h-4 w-4 flex-shrink-0"
          style={{ color: ensureContrast(festival.bar.stripe?.[0] ?? festival.color, bar.background, 3) }}
          aria-hidden
        />
        <span>{messageFor(s, festival)}</span>
      </p>
    </div>
  )
}

// A round seal — the festival's name and year set around the rim, its mark in
// the middle — that sits on the header like a sticker on a menu card.
// Decorative: the bar says the same in words.
export const FestivalSeal = ({
  festival,
  year,
  size = 88,
  className,
}: {
  festival: Festival
  year: number
  size?: number
  className?: string
}) => {
  const scoped = useResolvedTheme()
  const surface = scoped?.palette.surface ?? '#ffffff'
  const ink = festivalInk(festival, surface, 4.5)
  const id = `seal${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const Icon = FESTIVAL_ICONS[festival.key]
  // Like a printed stamp: the words go round the rim twice when they fit,
  // with the type sized so the ring is evenly filled.
  const unit = `${festival.name} · ${year} · `.toUpperCase()
  const label = unit.length <= 22 ? unit.repeat(2) : unit
  const fontSize = Math.min(8.2, 218 / (label.length * 0.8))
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden
      style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.22))' }}
    >
      <circle cx="50" cy="50" r="49" fill={surface} />
      <circle cx="50" cy="50" r="45" fill="none" stroke={ink} strokeWidth="1.2" />
      <circle cx="50" cy="50" r="26" fill="none" stroke={ink} strokeWidth="0.8" strokeDasharray="0.8 2.4" strokeLinecap="round" />
      <path id={id} d="M50 50m-35 0a35 35 0 1 1 70 0a35 35 0 1 1-70 0" fill="none" />
      <text fill={ink} fontSize={fontSize.toFixed(2)} fontWeight="800" style={{ fontFamily: 'var(--e-font-body)' }}>
        <textPath href={`#${id}`} textLength="218" lengthAdjust="spacing">
          {label}
        </textPath>
      </text>
      <Icon x="38" y="38" width="24" height="24" color={ink} strokeWidth={1.75} />
    </svg>
  )
}
