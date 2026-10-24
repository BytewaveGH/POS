'use client'

/* eslint-disable @next/next/no-img-element -- logos and covers are arbitrary owner URLs */
import React, { useMemo } from 'react'
import { Flame, GlassWater, Leaf, Sparkles, Star, TrendingUp, Users, Wine, WheatOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { patternStyle, resolveTheme, type ResolvedTheme, type ThemeConfig } from '@/lib/eatery/theme'
import { ensureContrast, mix, withAlpha } from '@/lib/eatery/color'
import type { ItemTag, Restaurant } from '@/lib/eatery/types'
import './storefront.css'

const ThemeContext = React.createContext<ResolvedTheme | null>(null)
export const useResolvedTheme = () => React.useContext(ThemeContext)

// Everything inside renders in this restaurant's brand.
export const ThemeScope = ({
  theme,
  className,
  children,
  as: Tag = 'div',
}: {
  theme: ThemeConfig
  className?: string
  children: React.ReactNode
  as?: 'div' | 'article' | 'main'
}) => {
  const resolved = useMemo(() => resolveTheme(theme), [theme])
  return (
    <ThemeContext.Provider value={resolved}>
      <Tag
        className={cn('e-scope', className)}
        style={resolved.style}
        data-shape={theme.shape}
        data-case={theme.uppercaseHeadings ? 'upper' : 'normal'}
      >
        {children}
      </Tag>
    </ThemeContext.Provider>
  )
}

const initialsOf = (name: string) =>
  name
    .replace(/&/g, ' ')
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

// The restaurant's logo, or its initials in the display face.
export const BrandMark = ({
  restaurant,
  size = 56,
  className,
}: {
  restaurant: Pick<Restaurant, 'name' | 'theme'>
  size?: number
  className?: string
}) => {
  const logo = restaurant.theme.imagery.logoUrl
  return (
    <span
      className={cn('inline-flex items-center justify-center flex-shrink-0 overflow-hidden e-display', className)}
      style={{
        width: size,
        height: size,
        borderRadius: restaurant.theme.shape === 'sharp' ? 0 : restaurant.theme.shape === 'pill' ? 999 : size * 0.28,
        background: 'var(--e-primary)',
        color: 'var(--e-on-primary)',
        fontSize: size * 0.4,
        boxShadow: '0 0 0 3px var(--e-surface)',
      }}
      aria-hidden={!logo}
    >
      {logo ? <img src={logo} alt={`${restaurant.name} logo`} className="h-full w-full object-cover" /> : initialsOf(restaurant.name)}
    </span>
  )
}

// Cover photo with a darkening overlay, or a brand-coloured backdrop with the
// pattern. Children read `--e-cover-ink`, a text colour checked against it.
export const coverColors = (r: ResolvedTheme, hasImage: boolean) => {
  const p = r.palette
  if (hasImage) return { background: '#000000', ink: '#ffffff' }
  const background =
    r.config.hero === 'poster'
      ? p.primary
      : r.config.hero === 'cinematic'
        ? mix(p.background, p.primary, 0.22)
        : r.config.hero === 'cozy'
          ? mix(p.background, p.accent, 0.28)
          : mix(p.surface, p.primary, 0.08)
  const ink = r.config.hero === 'poster' ? p.onPrimary : ensureContrast(p.text, background, 4.5)
  return { background, ink }
}

export const Cover = ({ theme, className, children }: { theme: ThemeConfig; className?: string; children?: React.ReactNode }) => {
  const scoped = useResolvedTheme()
  const r = scoped && scoped.config === theme ? scoped : resolveTheme(theme)
  const cover = theme.imagery.coverUrl
  const { background, ink } = coverColors(r, !!cover)
  const patternInk = theme.hero === 'poster' ? r.palette.accent : r.palette.primary
  return (
    <div className={cn('relative overflow-hidden', className)} style={{ background, ['--e-cover-ink' as string]: ink, color: ink }}>
      {cover ? (
        <>
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div
            className="absolute inset-0"
            style={{ background: withAlpha('#000000', Math.max(0.35, theme.imagery.coverOverlay ?? 0.45)) }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={patternStyle(theme.pattern, patternInk, theme.hero === 'poster' ? 0.5 : 0.3)}
          aria-hidden
        />
      )}
      {children && <div className="relative h-full">{children}</div>}
    </div>
  )
}

export const TAGS: Record<ItemTag, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  popular: { label: 'Popular', icon: TrendingUp },
  new: { label: 'New', icon: Sparkles },
  signature: { label: 'Signature', icon: Star },
  spicy: { label: 'Spicy', icon: Flame },
  vegetarian: { label: 'Vegetarian', icon: Leaf },
  vegan: { label: 'Vegan', icon: Leaf },
  'gluten-free': { label: 'Gluten-free', icon: WheatOff },
  alcoholic: { label: 'Contains alcohol', icon: Wine },
  'non-alcoholic': { label: 'Alcohol-free', icon: GlassWater },
  sharing: { label: 'For sharing', icon: Users },
}

export const TagList = ({ tags, className, max = 3 }: { tags: ItemTag[]; className?: string; max?: number }) => {
  // Highlights first; "contains alcohol" is said once per bar, not on every drink.
  const shown = tags.filter((t) => t !== 'alcoholic').slice(0, max)
  if (!shown.length) return null
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)} aria-label="Tags">
      {shown.map((t) => {
        const T = TAGS[t]
        return (
          <li key={t} className="inline-flex items-center gap-1 text-[11px] font-bold e-muted">
            <T.icon className="h-3.5 w-3.5" />
            {T.label}
          </li>
        )
      })}
    </ul>
  )
}

// Item picture, or a branded tile with its initials.
export const ItemArt = ({
  name,
  imageUrl,
  theme,
  className,
  size = 'md',
}: {
  name: string
  imageUrl?: string
  theme: ThemeConfig
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) => {
  const r = useResolvedTheme() ?? resolveTheme(theme)
  if (imageUrl) return <img src={imageUrl} alt="" loading="lazy" className={cn('object-cover', className)} />
  return (
    <div
      aria-hidden
      className={cn('relative flex items-center justify-center overflow-hidden', className)}
      style={{ background: `linear-gradient(145deg, ${withAlpha(r.palette.primary, 0.22)}, ${withAlpha(r.palette.accent, 0.22)})` }}
    >
      <div className="absolute inset-0" style={patternStyle(theme.pattern, r.palette.primaryText, 0.18)} />
      <span
        className={cn('relative e-display', size === 'lg' ? 'text-5xl' : size === 'sm' ? 'text-lg' : 'text-3xl')}
        style={{ color: 'var(--e-primary-text)' }}
      >
        {initialsOf(name)}
      </span>
    </div>
  )
}
