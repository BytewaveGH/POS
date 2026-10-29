import { NextResponse } from 'next/server'
import { requireSuperAdminSession } from '@/lib/platform-api'
import { billingStore, respond } from '@/lib/subscription/server-store'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await requireSuperAdminSession())) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  return respond(() => billingStore().get(Number(params.id)))
}

// Body: one billing action (src/lib/subscription/billing.ts).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireSuperAdminSession())) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  return respond(() => billingStore().act(Number(params.id), body))
}
