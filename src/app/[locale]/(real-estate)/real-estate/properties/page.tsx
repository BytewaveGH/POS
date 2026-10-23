'use client'

import React, { useMemo, useState } from 'react'
import { Building, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortfolio } from '../_logics/hooks'
import { todayISO } from '../_logics/calc'
import { propertyStats } from '../_logics/selectors'
import { PROPERTY_TYPES } from '../_logics/constants'
import { Button, EmptyState, ErrorNote, LoadingGrid, PageHeader } from '../_components/ui'
import { PropertyCard } from '../_components/cards'
import { PropertyForm } from '../_components/forms/property-form'

export default function PropertiesPage() {
  const p = usePortfolio()
  const today = todayISO()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<string>('all')

  const types = useMemo(() => PROPERTY_TYPES.filter((t) => p.properties.some((x) => x.type === t.value)), [p.properties])
  const list = p.properties.filter(
    (x) =>
      (type === 'all' || x.type === type) &&
      (!query.trim() || `${x.name} ${x.address} ${x.city} ${x.region ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
  )

  return (
    <>
      <PageHeader
        eyebrow="Real estate"
        title="Properties"
        description="Every building you own or manage, with its rooms and how they’re let."
        actions={
          <Button icon={Plus} onClick={() => setOpen(true)}>
            Add property
          </Button>
        }
      />
      {p.error && <ErrorNote message={p.error} />}

      {p.isLoading ? (
        <LoadingGrid count={3} className="xl:grid-cols-3" />
      ) : p.properties.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No properties yet"
          description="Add a compound house, apartment block or Airbnb — you’ll set up its rooms in the same step."
          action={
            <Button icon={Plus} onClick={() => setOpen(true)}>
              Add property
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or location"
                aria-label="Search properties"
                className="w-full h-10 rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-base sm:text-sm focus:outline-none focus:border-endeavour focus:ring-2 focus:ring-endeavour/15"
              />
            </div>
            {types.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {[{ value: 'all', label: 'All' }, ...types].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={cn(
                      'h-10 px-4 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors',
                      type === t.value
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {list.length === 0 ? (
            <p className="text-sm text-stone-500 py-10 text-center">No properties match.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((prop) => (
                <PropertyCard key={prop.id} property={prop} stats={propertyStats(p, prop.id, today)} />
              ))}
            </div>
          )}
        </>
      )}
      <PropertyForm open={open} onOpenChange={setOpen} />
    </>
  )
}
