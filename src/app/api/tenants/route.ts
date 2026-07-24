import { NextResponse } from 'next/server'
import { requireSuperAdminSession, platformFetch } from '@/lib/platform-api'

export async function GET() {
  if (!(await requireSuperAdminSession())) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const res = await platformFetch('/api/api/platform/tenants')
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return NextResponse.json({ message: body?.error ?? 'Failed to load apps' }, { status: res.status })
  return NextResponse.json({ data: body.data ?? [] })
}

export async function POST(req: Request) {
  if (!(await requireSuperAdminSession())) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const res = await platformFetch('/api/api/platform/tenants', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok) return NextResponse.json({ message: result?.error ?? 'Failed to register app' }, { status: res.status })
  return NextResponse.json({ data: result.data }, { status: 201 })
}
