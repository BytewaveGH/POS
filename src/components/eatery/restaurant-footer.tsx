'use client'

import React from 'react'
import Link from 'next/link'
import { MapPin, MessageCircle, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DAY_NAMES, clockLabel } from '@/lib/eatery/menu'
import type { Restaurant } from '@/lib/eatery/types'
import { BrandMark } from './theme-scope'
import { mapLink, waNumber } from './hero'

const WEEK = [1, 2, 3, 4, 5, 6, 0]

// Opening hours for the week, where to find them, how to reach them.
export const RestaurantFooter = ({ restaurant: r, now, directoryHref }: { restaurant: Restaurant; now: Date; directoryHref?: string }) => (
  <footer className="border-t" style={{ borderColor: 'var(--e-border)', background: 'var(--e-surface)' }}>
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-2">
      <div>
        <div className="flex items-center gap-3">
          <BrandMark restaurant={r} size={44} />
          <p className="e-display text-2xl">{r.name}</p>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <a
              href={mapLink(r)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-2 hover:underline e-focus"
            >
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: 'var(--e-primary-text)' }} aria-hidden />
              {r.address}, {r.city}
            </a>
          </li>
          {r.phone && (
            <li>
              <a href={`tel:${r.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 hover:underline e-focus">
                <Phone className="h-4 w-4" style={{ color: 'var(--e-primary-text)' }} aria-hidden /> {r.phone}
              </a>
            </li>
          )}
          {r.whatsapp && (
            <li>
              <a
                href={`https://wa.me/${waNumber(r.whatsapp)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:underline e-focus"
              >
                <MessageCircle className="h-4 w-4" style={{ color: 'var(--e-primary-text)' }} aria-hidden /> Chat on WhatsApp
              </a>
            </li>
          )}
        </ul>
      </div>
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] e-muted">Opening hours</h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {WEEK.map((d) => {
              const today = d === now.getDay()
              const periods = r.hours[d] ?? []
              return (
                <tr key={d} className={cn(today && 'font-extrabold')}>
                  <th scope="row" className="py-1 pr-4 text-left font-[inherit]">
                    {DAY_NAMES[d]}
                    {today && <span className="sr-only"> (today)</span>}
                  </th>
                  <td className="py-1 text-right tabular-nums">
                    {periods.length ? (
                      periods.map((p) => `${clockLabel(p.open)} – ${clockLabel(p.close)}`).join(', ')
                    ) : (
                      <span className="e-muted">Closed</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
    <p className="border-t py-4 text-center text-xs e-muted" style={{ borderColor: 'var(--e-border)' }}>
      Ordering by{' '}
      {directoryHref ? (
        <Link href={directoryHref} className="font-bold underline-offset-2 hover:underline">
          sellix eats
        </Link>
      ) : (
        <span className="font-bold">sellix eats</span>
      )}
    </p>
  </footer>
)
