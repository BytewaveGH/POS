import { NextResponse } from 'next/server'
import { requireSuperAdminSession } from '@/lib/platform-api'
import { billingStore, respond } from '@/lib/subscription/server-store'

export async function GET() {
  if (!(await requireSuperAdminSession())) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  return respond(() => billingStore().catalog())
}

export async function PUT(req: Request) {
  if (!(await requireSuperAdminSession())) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  return respond(() => billingStore().saveCatalog(body))
}
