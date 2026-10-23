'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { addMonths, startOfMonth, subDays } from 'date-fns'
import { ArrowRight, Ban, Building2, CheckCircle2, Info, Plus, Sparkles, TrendingUp, Users } from 'lucide-react'
import { BarChart, Button, Card, EmptyState, ErrorNote, LoadingGrid, PageHeader, Ring, SectionTitle, StatCard } from '@/components/kit/ui'
import { useTenants, useTenantsStats, usePlatformActions } from './_logics/api'
import { registeredBetween, registrationsByMonth, verticalBreakdown } from './_logics/insights'
import { verticalMeta } from './_logics/verticals'
import { AppAvatar, StatusPill, VerticalBadge, fullDate, timeAgo } from './_components/bits'
import { useConsole } from './_components/console-context'

const pct = (n: number) => `${Math.round(n * 100)}%`
const cedis = (n: number, opts?: { compact?: boolean }) =>
  `₵${new Intl.NumberFormat('en-GH', opts?.compact && Math.abs(n) >= 10_000 ? { notation: 'compact', maximumFractionDigits: 1 } : { maximumFractionDigits: 0 }).format(n)}`

export default function SuperAdminOverview() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const base = `/${locale}/super-admin`
  const { openRegister } = useConsole()
  const actions = usePlatformActions()
  const { data: tenants = [], isLoading, error } = useTenants()
  const statsResults = useTenantsStats(tenants.map((t) => t.id))

  const view = useMemo(() => {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const lastMonthStart = startOfMonth(addMonths(now, -1))
    const active = tenants.filter((t) => t.status === 'active').length
    const thisMonth = registeredBetween(tenants, monthStart, addMonths(monthStart, 1))
    const lastMonth = registeredBetween(tenants, lastMonthStart, monthStart)
    const weekAgo = subDays(now, 7)
    return {
      total: tenants.length,
      active,
      suspended: tenants.length - active,
      thisMonth,
      lastMonth,
      growth: registrationsByMonth(tenants, now, 12),
      verticals: verticalBreakdown(tenants),
      recent: [...tenants].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 6),
      suspendedList: tenants.filter((t) => t.status === 'suspended'),
      newThisWeek: tenants.filter((t) => new Date(t.createdAt) >= weekAgo && t.status === 'active'),
    }
  }, [tenants])

  const leaderboard = useMemo(
    () =>
      tenants
        .map((t, i) => ({ tenant: t, stats: statsResults[i]?.data }))
        .filter((r) => r.stats)
        .sort((a, b) => (b.stats!.salesVolume ?? 0) - (a.stats!.salesVolume ?? 0))
        .slice(0, 5),
    [tenants, statsResults]
  )
  const statsLoading = statsResults.some((r) => r.isLoading)

  if (isLoading) {
    return (
      <>
        <PageHeader eyebrow="Platform" title="Overview" />
        <LoadingGrid />
        <LoadingGrid count={2} className="mt-4 xl:grid-cols-2" />
      </>
    )
  }

  const change = view.lastMonth > 0 ? (view.thisMonth - view.lastMonth) / view.lastMonth : null

  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        title="Platform overview"
        description="Every business running on Bytewave, at a glance."
        actions={
          <>
            <Link href={`${base}/apps`}>
              <Button variant="secondary">All apps</Button>
            </Link>
            <Button icon={Plus} onClick={openRegister}>
              Register app
            </Button>
          </>
        }
      />
      {error && <ErrorNote message={error.message} />}

      {view.total === 0 ? (
        <EmptyState
          icon={Building2}
          title="No businesses yet"
          description="Register the first app to give a business its own subdomain and owner login."
          action={
            <Button icon={Plus} onClick={openRegister}>
              Register app
            </Button>
          }
        />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Registered apps" value={view.total} icon={Building2} hint={`${view.thisMonth} new this month`} />
            <Card className="p-4 sm:p-5 flex items-center gap-4">
              <Ring value={view.total ? view.active / view.total : 0} size={68}>
                <span className="text-sm font-extrabold text-stone-900 tabular-nums">{pct(view.total ? view.active / view.total : 0)}</span>
              </Ring>
              <div>
                <p className="text-xs font-semibold text-stone-500">Active</p>
                <p className="text-[26px] font-extrabold tracking-tight text-stone-900 tabular-nums leading-none mt-1">{view.active}</p>
                <p className="text-xs text-stone-500 mt-1.5 inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> able to sign in
                </p>
              </div>
            </Card>
            <Link
              href={`${base}/apps?status=suspended`}
              className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-endeavour/40"
            >
              <StatCard
                label="Suspended"
                value={view.suspended}
                icon={Ban}
                tone={view.suspended > 0 ? 'rose' : 'stone'}
                hint={view.suspended > 0 ? 'Owners & staff are locked out — review' : 'Nobody is locked out'}
              />
            </Link>
            <StatCard
              label="New this month"
              value={view.thisMonth}
              icon={TrendingUp}
              tone="green"
              hint={change === null ? `${view.lastMonth} last month` : `${change >= 0 ? '▲' : '▼'} ${pct(Math.abs(change))} vs last month`}
            />
          </div>

          {/* Growth + verticals */}
          <div className="grid gap-4 xl:grid-cols-3 mt-4">
            <Card className="p-5 xl:col-span-2">
              <SectionTitle title="Registrations" hint="New businesses per month, last 12 months" />
              <BarChart ariaLabel="New registrations per month" data={view.growth} format={(n) => String(Math.round(n))} />
            </Card>
            <Card className="p-5">
              <SectionTitle
                title="By vertical"
                hint={`${view.total} apps across ${view.verticals.filter((v) => v.count > 0).length} verticals`}
              />
              <div
                className="flex h-3 w-full gap-[2px] rounded-full overflow-hidden bg-stone-100"
                role="img"
                aria-label={view.verticals.map((v) => `${verticalMeta(v.value).short}: ${v.count}`).join(', ')}
              >
                {view.verticals
                  .filter((v) => v.count > 0)
                  .map((v) => (
                    <div
                      key={v.value}
                      style={{ width: `${(v.count / view.total) * 100}%`, background: verticalMeta(v.value).color }}
                      title={`${verticalMeta(v.value).short}: ${v.count}`}
                    />
                  ))}
              </div>
              <ul className="mt-5 flex flex-col gap-3">
                {view.verticals.map((v) => {
                  const meta = verticalMeta(v.value)
                  const Icon = meta.icon
                  return (
                    <li key={v.value} className="flex items-center gap-3">
                      <span
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: meta.color, opacity: v.count ? 1 : 0.35 }}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-stone-900">{meta.label}</span>
                        <span className="block text-[11px] text-stone-500 truncate">{meta.description}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-sm font-extrabold text-stone-900 tabular-nums">{v.count}</span>
                        <span className="block text-[11px] text-stone-400 tabular-nums">{pct(view.total ? v.count / view.total : 0)}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>

          {/* Leaderboard + attention */}
          <div className="grid gap-4 xl:grid-cols-3 mt-4">
            <Card className="p-5 xl:col-span-2">
              <SectionTitle
                title="Top businesses"
                hint="By sales volume reported by each app"
                action={
                  <span
                    className="inline-flex items-center gap-1 text-[11px] text-stone-400"
                    title="Figures come from each app’s stats endpoint. If tenant data isn’t isolated on the backend yet, apps may show the same totals."
                  >
                    <Info className="h-3.5 w-3.5" /> About these numbers
                  </span>
                }
              />
              {statsLoading && leaderboard.length === 0 ? (
                <LoadingGrid count={1} className="sm:grid-cols-1 xl:grid-cols-1" />
              ) : leaderboard.length === 0 ? (
                <p className="text-sm text-stone-500 py-6">Stats aren’t available for any app yet.</p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {leaderboard.map(({ tenant, stats }, i) => (
                    <Link
                      key={tenant.id}
                      href={`${base}/apps/${tenant.id}`}
                      className="flex items-center gap-3 py-3 hover:bg-stone-50 -mx-2 px-2 rounded-xl"
                    >
                      <span className="w-5 text-xs font-bold text-stone-400 tabular-nums">{i + 1}</span>
                      <AppAvatar name={tenant.name} appType={tenant.appType} status={tenant.status} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-stone-900 truncate">{tenant.name}</span>
                        <span className="block text-xs text-stone-500">
                          <Users className="inline h-3 w-3 -mt-0.5" /> {stats!.employeeCount} staff · {stats!.productCount} products
                        </span>
                      </span>
                      <span className="text-sm font-extrabold text-stone-900 tabular-nums">
                        {cedis(stats!.salesVolume ?? 0, { compact: true })}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <SectionTitle title="Needs attention" />
              {view.suspendedList.length === 0 && view.newThisWeek.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-semibold text-stone-900">All clear</p>
                  <p className="text-xs text-stone-500 mt-1">No suspended apps or new sign-ups to check on.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {view.suspendedList.slice(0, 4).map((t) => (
                    <div key={t.id} className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-2.5">
                      <AppAvatar name={t.name} appType={t.appType} status={t.status} size="sm" />
                      <Link href={`${base}/apps/${t.id}`} className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-stone-900 truncate">{t.name}</span>
                        <span className="block text-[11px] text-rose-700">Suspended — owner locked out</span>
                      </Link>
                      <Button size="sm" variant="secondary" onClick={() => void actions.setStatus(t, 'active')}>
                        Reactivate
                      </Button>
                    </div>
                  ))}
                  {view.newThisWeek.slice(0, 4).map((t) => (
                    <Link
                      key={t.id}
                      href={`${base}/apps/${t.id}`}
                      className="flex items-center gap-3 rounded-xl border border-stone-200 p-2.5 hover:bg-stone-50"
                    >
                      <span className="h-8 w-8 rounded-lg bg-endeavour/10 text-endeavour flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-stone-900 truncate">{t.name}</span>
                        <span className="block text-[11px] text-stone-500">New {timeAgo(t.createdAt)} — check they’ve signed in</span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-stone-300" />
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Recent */}
          <div className="mt-8">
            <SectionTitle
              title="Recently registered"
              action={
                <Link href={`${base}/apps`} className="text-xs font-semibold text-endeavour hover:underline inline-flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
            <Card className="divide-y divide-stone-100 overflow-hidden">
              {view.recent.map((t) => (
                <Link
                  key={t.id}
                  href={`${base}/apps/${t.id}`}
                  className="flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-stone-50 transition-colors"
                >
                  <AppAvatar name={t.name} appType={t.appType} status={t.status} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-stone-900 truncate">{t.name}</span>
                    <span className="block text-xs text-stone-500 truncate">
                      {t.ownerName} · {t.ownerEmail}
                    </span>
                  </span>
                  <span className="hidden sm:flex items-center gap-2">
                    <VerticalBadge appType={t.appType} />
                    <StatusPill status={t.status} />
                  </span>
                  <span className="text-right w-28 hidden md:block">
                    <span className="block text-xs font-semibold text-stone-700">{timeAgo(t.createdAt)}</span>
                    <span className="block text-[11px] text-stone-400">{fullDate(t.createdAt)}</span>
                  </span>
                </Link>
              ))}
            </Card>
          </div>
        </>
      )}
    </>
  )
}
