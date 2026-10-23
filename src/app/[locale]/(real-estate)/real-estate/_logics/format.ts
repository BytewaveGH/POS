import { format, formatDistanceToNowStrict } from 'date-fns'
import { parseDate } from './calc'

export const money = (n: number, opts: { compact?: boolean } = {}) => {
  if (opts.compact && Math.abs(n) >= 10_000) {
    return `₵${new Intl.NumberFormat('en-GH', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}`
  }
  return `₵${new Intl.NumberFormat('en-GH', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n)}`
}

export const shortDate = (iso?: string | null) => (iso ? format(parseDate(iso), 'd MMM yyyy') : '—')
export const dayMonth = (iso?: string | null) => (iso ? format(parseDate(iso), 'd MMM') : '—')
export const relative = (iso: string) => formatDistanceToNowStrict(parseDate(iso), { addSuffix: true })

export const percent = (ratio: number) => `${Math.round(ratio * 100)}%`

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?'

export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`
