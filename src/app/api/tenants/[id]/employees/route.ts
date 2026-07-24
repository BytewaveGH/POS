import { NextResponse } from 'next/server'
import { requireSuperAdminSession, platformFetch } from '@/lib/platform-api'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await requireSuperAdminSession())) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const res = await platformFetch(`/api/platform/tenants/${params.id}/employees`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return NextResponse.json({ message: body?.error ?? 'Failed to load employees' }, { status: res.status })
  return NextResponse.json({ data: body.data ?? [] })
}
