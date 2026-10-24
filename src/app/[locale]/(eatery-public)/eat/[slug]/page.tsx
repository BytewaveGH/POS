'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useCart } from '@/lib/eatery/cart'
import { useNow, useStorefront } from '@/lib/eatery/hooks'
import { apiErrorMessage } from '@/lib/api-error'
import { Storefront } from '@/components/eatery/storefront'

export default function RestaurantPage() {
  const params = useParams()
  const search = useSearchParams()
  const locale = (params?.locale as string) || 'en'
  const slug = String(params?.slug ?? '')
  const now = useNow()
  const { data, isLoading, error, refetch, isFetching } = useStorefront(slug)
  const setPref = useCart((s) => s.setPref)
  const remembered = useCart((s) => s.prefs[slug]?.table)

  // A table QR code opens /eat/<slug>?table=<name>: remember it for checkout.
  const tableParam = search?.get('table')
  const validTable =
    data && tableParam && data.restaurant.fulfilment.dineIn.enabled && data.restaurant.fulfilment.dineIn.tables.includes(tableParam)
      ? tableParam
      : null
  useEffect(() => {
    if (validTable) setPref(slug, { table: validTable, fulfilment: 'dine-in' })
  }, [validTable, slug, setPref])

  useEffect(() => {
    if (data) document.title = `${data.restaurant.name} · order online`
  }, [data])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6" aria-busy="true">
        <div className="h-72 animate-pulse rounded-3xl bg-stone-200/70" />
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-stone-200/70" />
          ))}
        </div>
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center" role={error ? 'alert' : undefined}>
        <p className="text-2xl font-extrabold text-stone-900">{error ? 'Couldn’t load this menu' : 'We can’t find that place'}</p>
        <p className="mt-2 text-stone-600">
          {error ? apiErrorMessage(error, 'Check your connection and try again.') : 'The link may be old, or the restaurant has moved.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {!!error && (
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="h-11 rounded-full bg-stone-900 px-5 text-sm font-bold text-white disabled:opacity-60"
            >
              Retry
            </button>
          )}
          <Link
            href={`/${locale}/eat`}
            className="inline-flex h-11 items-center rounded-full border border-stone-300 px-5 text-sm font-bold text-stone-800"
          >
            See all places
          </Link>
        </div>
      </div>
    )
  }

  return (
    <Storefront
      bundle={data}
      now={now}
      cartKey={slug}
      table={validTable ?? remembered ?? null}
      checkoutHref={`/${locale}/eat/${slug}/checkout`}
      directoryHref={`/${locale}/eat`}
    />
  )
}
