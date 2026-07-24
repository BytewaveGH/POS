import { NextResponse } from 'next/server'
import { requireSuperAdminSession, platformFetch } from '@/lib/platform-api'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireSuperAdminSession())) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const res = await platformFetch(`/api/api/platform/tenants/${params.id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok) return NextResponse.json({ message: result?.error ?? 'Failed to update app' }, { status: res.status })
  return NextResponse.json({ data: result.data })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await requireSuperAdminSession())) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const res = await platformFetch(`/api/api/platform/tenants/${params.id}`, { method: 'DELETE' })
  const result = await res.json().catch(() => ({}))
  if (!res.ok) return NextResponse.json({ message: result?.error ?? 'Failed to delete app' }, { status: res.status })
  return NextResponse.json({ ok: true })
}
