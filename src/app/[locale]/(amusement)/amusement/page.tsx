'use client'

import React from 'react'
import Link from 'next/link'
import { Ticket, Compass, CalendarCheck, Trophy } from 'lucide-react'

const AMUSEMENT_MODULES = [
  {
    title: 'Tickets',
    description: 'Sell and validate entry and ride tickets',
    icon: Ticket,
    color: 'bg-endeavour',
    href: '/en/amusement/tickets',
  },
  {
    title: 'Attractions',
    description: 'Manage rides, attractions, and capacity',
    icon: Compass,
    color: 'bg-purple-500',
    href: '/en/amusement/attractions',
  },
  {
    title: 'Bookings',
    description: 'Track group bookings and reservations',
    icon: CalendarCheck,
    color: 'bg-amber-500',
    href: '/en/amusement/bookings',
  },
  {
    title: 'Leaderboard',
    description: 'Record top scores/times — public board at /amusement/board',
    icon: Trophy,
    color: 'bg-rose-500',
    href: '/en/amusement/leaderboard',
  },
]

export default function Amusement() {
  return (
    <div className="w-full h-full">
      <div className="mb-5">
        <h1 className="bytewave-heading">Amusement Park</h1>
        <p className="bytewave-paragraph">Tickets, attractions, bookings, and the leaderboard for your park</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {AMUSEMENT_MODULES.map(({ title, description, icon: Icon, color, href }) => (
          <Link
            key={title}
            href={href}
            className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2 hover:border-endeavour/50 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <p className="bytewave-heading text-base text-stone-800">{title}</p>
              <div className={`p-1.5 rounded-lg ${color}`}>
                <Icon className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <p className="bytewave-paragraph text-xs text-gray-400">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
