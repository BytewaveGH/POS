// Backs the app picker (src/components/generals/authentication/select-app.tsx).
// Public, unauthenticated lookup — matches GET /api/api/platform/tenants/lookup?slug=...
// (never 404s; returns { exists: false } for an unknown slug).
export const TenantServices = {
  async Resolve(slug: string): Promise<{ exists: boolean; appType?: string }> {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/api/platform/tenants/lookup?slug=${encodeURIComponent(slug)}`)
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.data) return { exists: false }
      return body.data
    } catch {
      return { exists: false }
    }
  },
}
