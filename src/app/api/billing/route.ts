import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { BillingError } from '@/lib/subscription/billing'
import { billingStore, ownerMayDo, respond } from '@/lib/subscription/server-store'

// The signed-in business's own subscription. Owners and staff can read it (the
// dashboard gates pages on it); only owners can ask for a plan change.

const tenantUser = async () => {
  const user = (await auth())?.user
  if (!user || user.accountType === 'super-admin' || !user.tenant) return null
  return user
}

export async function GET() {
  const user = await tenantUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  return respond(() => billingStore().forTenant(user))
}

export async function POST(req: Request) {
  const user = await tenantUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  return respond(async () => {
    if (user.accountType === 'employee' || !ownerMayDo(body)) {
      throw new BillingError(403, 'Only the business owner can change the plan')
    }
    return billingStore().actForTenant(user, body)
  })
}
