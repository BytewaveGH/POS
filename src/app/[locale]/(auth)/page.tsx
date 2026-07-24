import { headers } from 'next/headers'
import SignIn from '@/components/generals/authentication/sign-in'
import { classifyHost } from '@/lib/tenant'

async function resolveAppType(slug: string | null): Promise<string> {
  if (!slug) return 'retail'
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/platform/tenants/lookup?slug=${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    })
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.data?.exists) return 'retail'
    return body.data.appType ?? 'retail'
  } catch {
    return 'retail'
  }
}

export default async function Page() {
  const { slug } = classifyHost(headers().get('host'))
  const appType = await resolveAppType(slug)

  return (
    <main className=" max-h-screen  items-center">
      <SignIn appType={appType} />
    </main>
  )
}
