// Pure helpers for the super-admin console (no React, no fetch) — tested.

import { format, startOfMonth, subMonths } from 'date-fns'
import { VERTICALS } from './verticals'
import type { TenantRecord, TenantStatus } from './types'

// ── Growth ───────────────────────────────────────────────────────────────────

// New registrations per calendar month for the last `months` months, oldest first.
export const registrationsByMonth = (tenants: TenantRecord[], now: Date, months = 12) => {
  const buckets = Array.from({ length: months }, (_, i) => startOfMonth(subMonths(now, months - 1 - i)))
  const counts = new Map(buckets.map((b) => [format(b, 'yyyy-MM'), 0]))
  for (const t of tenants) {
    const d = new Date(t.createdAt)
    if (Number.isNaN(d.getTime())) continue
    const k = format(d, 'yyyy-MM')
    if (counts.has(k)) counts.set(k, counts.get(k)! + 1)
  }
  return buckets.map((b) => {
    const key = format(b, 'yyyy-MM')
    return { key, label: format(b, 'MMM'), detail: format(b, 'MMMM yyyy'), value: counts.get(key) ?? 0 }
  })
}

export const registeredBetween = (tenants: TenantRecord[], from: Date, to: Date) =>
  tenants.filter((t) => {
    const d = new Date(t.createdAt).getTime()
    return d >= from.getTime() && d < to.getTime()
  }).length

// Every known vertical (zeros included, fixed order) plus any unknown ones.
export const verticalBreakdown = (tenants: TenantRecord[]) => {
  const counts = new Map<string, number>()
  for (const t of tenants) counts.set(t.appType, (counts.get(t.appType) ?? 0) + 1)
  const known = VERTICALS.map((v) => ({ value: v.value, count: counts.get(v.value) ?? 0 }))
  const unknown = Array.from(counts.entries())
    .filter(([k]) => !VERTICALS.some((v) => v.value === k))
    .map(([value, count]) => ({ value, count }))
  return [...known, ...unknown]
}

// ── List: search, filter, sort ───────────────────────────────────────────────

export type TenantSort = 'newest' | 'oldest' | 'name'

export interface TenantFilter {
  query?: string
  vertical?: string | 'all'
  status?: TenantStatus | 'all'
  sort?: TenantSort
}

export const filterTenants = (tenants: TenantRecord[], f: TenantFilter) => {
  const q = (f.query ?? '').trim().toLowerCase()
  const list = tenants.filter(
    (t) =>
      (!f.vertical || f.vertical === 'all' || t.appType === f.vertical) &&
      (!f.status || f.status === 'all' || t.status === f.status) &&
      (!q || [t.name, t.slug, t.ownerName, t.ownerEmail].some((v) => (v ?? '').toLowerCase().includes(q)))
  )
  const time = (t: TenantRecord) => new Date(t.createdAt).getTime() || 0
  switch (f.sort ?? 'newest') {
    case 'oldest':
      return list.sort((a, b) => time(a) - time(b))
    case 'name':
      return list.sort((a, b) => a.name.localeCompare(b.name))
    default:
      return list.sort((a, b) => time(b) - time(a))
  }
}

// ── URLs ─────────────────────────────────────────────────────────────────────

export const tenantHost = (slug: string, rootDomain: string) => `${slug}.${rootDomain || 'yourdomain.com'}`

// http for local development hosts, https everywhere else.
export const tenantUrl = (slug: string, rootDomain: string) => {
  const host = tenantHost(slug, rootDomain)
  const local = /(^|\.)localhost(:\d+)?$/.test(rootDomain) || /^\d+\.\d+\.\d+\.\d+(:\d+)?$/.test(rootDomain)
  return `${local ? 'http' : 'https'}://${host}/en`
}

// ── CSV export ───────────────────────────────────────────────────────────────

const csvCell = (v: unknown) => {
  const s = String(v ?? '')
  // Quote when needed; neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export const tenantsToCsv = (tenants: TenantRecord[], rootDomain: string) => {
  const header = ['Name', 'Subdomain', 'URL', 'Vertical', 'Status', 'Owner', 'Owner email', 'Registered']
  const rows = tenants.map((t) => [
    t.name,
    t.slug,
    tenantUrl(t.slug, rootDomain),
    t.appType,
    t.status,
    t.ownerName,
    t.ownerEmail,
    t.createdAt,
  ])
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
}

// ── Owner passwords (register wizard) ────────────────────────────────────────

export const passwordStrength = (pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } => {
  if (!pw) return { score: 0, label: 'Too short' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
  if (pw.length < 8) score = 0
  const s = Math.min(4, score) as 0 | 1 | 2 | 3 | 4
  return { score: s, label: ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][s] }
}

// Readable, strong, and free of look-alike characters (0/O, 1/l/I).
export const generatePassword = (length = 14, rand: (n: number) => number = cryptoRandom) => {
  const sets = ['ABCDEFGHJKMNPQRSTUVWXYZ', 'abcdefghjkmnpqrstuvwxyz', '23456789', '!@#$%*?']
  const all = sets.join('')
  const chars = sets.map((s) => s[rand(s.length)])
  while (chars.length < length) chars.push(all[rand(all.length)])
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

function cryptoRandom(n: number) {
  const buf = new Uint32Array(1)
  globalThis.crypto.getRandomValues(buf)
  return buf[0] % n
}
