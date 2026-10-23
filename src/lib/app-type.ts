// Which vertical a signed-in user's tenant runs. Used by the auth callbacks
// (server side) and the sign-in redirects.
//
// - Admins: `user.appType` from /auth/admin-login and /auth/refresh.
// - Employees: /employees/login doesn't return it, so it comes from the tenant
//   lookup (GET /platform/tenants/lookup) — never inferred from anything else.

export const APP_TYPES = ['retail', 'eatery', 'amusement', 'real-estate'] as const
export type AppType = (typeof APP_TYPES)[number]

const isAppType = (v: unknown): v is AppType => APP_TYPES.includes(v as AppType)

// Missing/unknown values fall back to retail, with a warning so it's visible.
export const normalizeAppType = (value: unknown, source: string): AppType => {
  if (isAppType(value)) return value
  console.warn(`[auth] ${source} returned no valid appType (${JSON.stringify(value)}); falling back to "retail"`)
  return 'retail'
}

export const lookupTenantAppType = async (slug: string, fetchImpl: typeof fetch = fetch): Promise<AppType> => {
  try {
    const res = await fetchImpl(`${process.env.NEXT_PUBLIC_API_URL}/platform/tenants/lookup?slug=${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    })
    const body = await res.json().catch(() => null)
    return normalizeAppType(res.ok && body?.data?.exists ? body.data.appType : undefined, `tenant lookup for "${slug}"`)
  } catch {
    return normalizeAppType(undefined, `tenant lookup for "${slug}"`)
  }
}
