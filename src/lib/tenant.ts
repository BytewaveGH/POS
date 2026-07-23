// Multi-tenant subdomain routing helpers.
//
// The whole feature is inert until NEXT_PUBLIC_ROOT_DOMAIN is set: with no root
// domain configured, classifyHost() always returns 'disabled' and every caller
// (middleware, auth.config) falls back to today's single-tenant behavior.

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || ''

export function isTenancyEnabled(): boolean {
  return !!ROOT_DOMAIN
}

export type HostKind = 'disabled' | 'root' | 'tenant' | 'unknown'

export interface HostClassification {
  kind: HostKind
  slug: string | null
}

// Strips the port so "acme.localhost:3000" and "acme.bytewave.app" compare the same way.
const bare = (host: string) => host.split(':')[0].toLowerCase()

export function classifyHost(host: string | null | undefined): HostClassification {
  if (!ROOT_DOMAIN || !host) return { kind: 'disabled', slug: null }

  const bareHost = bare(host)
  const bareRoot = bare(ROOT_DOMAIN)

  if (bareHost === bareRoot || bareHost === `www.${bareRoot}`) {
    return { kind: 'root', slug: null }
  }

  const suffix = `.${bareRoot}`
  if (bareHost.endsWith(suffix)) {
    const slug = bareHost.slice(0, -suffix.length)
    return slug ? { kind: 'tenant', slug } : { kind: 'root', slug: null }
  }

  // Unrecognized host (e.g. a raw preview deployment URL) — never lock anyone out over this.
  return { kind: 'unknown', slug: null }
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildTenantUrl(slug: string, path: string, protocol: string = 'https'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${protocol}://${slug}.${ROOT_DOMAIN}${cleanPath}`
}

export function redirectPathForAppType(appType: string | undefined | null, locale: string): string {
  switch (appType) {
    case 'eatery':
      return `/${locale}/eatery`
    case 'amusement':
      return `/${locale}/amusement`
    default:
      return `/${locale}/stores/overview`
  }
}
