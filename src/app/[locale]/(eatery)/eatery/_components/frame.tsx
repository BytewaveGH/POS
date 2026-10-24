'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ExternalLink, HardDrive, Plus, RotateCw, Sparkles, Store } from 'lucide-react'
import { Button, Card, PageHeader } from '@/components/kit/ui'
import { Select } from '@/components/kit/form'
import { DATA_SOURCE_KIND, materializeDemo } from '@/lib/eatery/data-source'
import { useEateryActions, useOwnerData, type OwnerData } from '@/lib/eatery/hooks'
import { PRESETS } from '@/lib/eatery/presets'
import { DEMO_RESTAURANTS } from '@/lib/eatery/seed'
import type { CategoryKey, Restaurant } from '@/lib/eatery/types'
import { NewRestaurantForm, PresetCard } from './new-restaurant'

export const useLocalePath = () => {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  return (path: string) => `/${locale}${path}`
}

// Which restaurant you're managing, plus a link to its live storefront.
export const RestaurantSwitcher = ({ o }: { o: OwnerData }) => {
  const path = useLocalePath()
  const [adding, setAdding] = useState(false)
  if (!o.restaurant) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {o.restaurants.length > 1 && (
        <div className="w-56">
          <Select
            aria-label="Restaurant"
            value={o.restaurant.id}
            onChange={(e) => o.select(Number(e.target.value))}
            options={o.restaurants.map((r) => ({ value: r.id, label: r.name }))}
          />
        </div>
      )}
      <a href={path(`/eat/${o.restaurant.slug}`)} target="_blank" rel="noopener noreferrer">
        <Button variant="secondary" icon={ExternalLink}>
          View storefront
        </Button>
      </a>
      <Button variant="ghost" icon={Plus} onClick={() => setAdding(true)}>
        Add restaurant
      </Button>
      <NewRestaurantForm open={adding} onOpenChange={setAdding} onCreated={(r) => o.select(r.id)} />
    </div>
  )
}

const Onboarding = ({ o }: { o: OwnerData }) => {
  const actions = useEateryActions()
  const [category, setCategory] = useState<CategoryKey | null>(null)
  const [busy, setBusy] = useState(false)

  const examples = async () => {
    setBusy(true)
    try {
      let made: Restaurant[] = []
      if (actions.kind === 'local') made = await actions.claimDemo()
      else for (const def of DEMO_RESTAURANTS) made.push(await materializeDemo(def, actions.create))
      if (made[0]) o.select(made[0].id)
    } catch {
      // toast shown
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        eyebrow="Eatery"
        title="Put your restaurant online"
        description="Each restaurant gets its own branded menu site for ordering — pickup, delivery or at the table — and you run the orders from here."
      />
      <Card className="p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 bg-gradient-to-r from-amber-50 to-white">
        <span className="h-11 w-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="font-bold text-stone-900">See it with three example restaurants</p>
          <p className="text-sm text-stone-500">
            A cocktail bar, a pizza & shawarma spot and a café — each with its own design, menu, options and happy hour. Edit or delete them
            any time.
          </p>
        </div>
        <Button icon={Store} loading={busy} onClick={() => void examples()}>
          Add the examples
        </Button>
      </Card>
      <p className="text-sm font-bold text-stone-800 mb-3">Or start your own — what kind of place is it?</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {PRESETS.map((p) => (
          <PresetCard key={p.key} category={p.key} onSelect={() => setCategory(p.key)} />
        ))}
      </div>
      <NewRestaurantForm
        open={!!category}
        onOpenChange={(v) => !v && setCategory(null)}
        category={category ?? undefined}
        onCreated={(r) => o.select(r.id)}
      />
    </div>
  )
}

// Every owner page: notices, load/error states, and onboarding when the
// business has no restaurant yet. Children get the loaded data.
export const EateryFrame = ({ children }: { children: (o: OwnerData & { restaurant: Restaurant }) => React.ReactNode }) => {
  const o = useOwnerData()
  return (
    <div className="w-full max-w-[1400px] mx-auto pb-16">
      {DATA_SOURCE_KIND === 'local' && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
          <HardDrive className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-bold">Saved in this browser only.</span> Until the Sellix eatery backend is live, menus and orders —
            including orders customers place on your storefront — exist only in this browser. Open the storefront in another tab here to try
            ordering.
          </p>
        </div>
      )}
      {o.error ? (
        <Card role="alert" className="flex flex-col items-center text-center px-6 py-14">
          <p className="font-bold text-stone-900">Couldn’t load your restaurants</p>
          <p className="text-sm text-stone-500 mt-1">{o.error}</p>
          <Button className="mt-5" icon={RotateCw} onClick={o.retry}>
            Retry
          </Button>
        </Card>
      ) : o.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-stone-100" />
          ))}
        </div>
      ) : !o.restaurant ? (
        <Onboarding o={o} />
      ) : (
        children(o as OwnerData & { restaurant: Restaurant })
      )}
    </div>
  )
}

export const StorefrontLink = ({ slug, children }: { slug: string; children: React.ReactNode }) => {
  const path = useLocalePath()
  return (
    <Link href={path(`/eat/${slug}`)} target="_blank" className="font-semibold text-endeavour hover:underline">
      {children}
    </Link>
  )
}
