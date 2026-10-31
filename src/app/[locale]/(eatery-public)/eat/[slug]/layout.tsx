'use client'

// Every page of a restaurant's storefront (menu, checkout, order tracking)
// shows the restaurant's logo as the browser-tab icon.

import { useParams } from 'next/navigation'
import { useStorefront } from '@/lib/eatery/hooks'
import { useBrandFavicon } from '@/components/eatery/use-brand-favicon'

export default function RestaurantLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const { data } = useStorefront(String(params?.slug ?? ''))
  useBrandFavicon(data?.restaurant)
  return children
}
