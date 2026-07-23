'use client'

import React from 'react'
import { Ticket, Compass, CalendarCheck } from 'lucide-react'

const AMUSEMENT_MODULES = [
  { title: 'Tickets', description: 'Sell and validate entry and ride tickets', icon: Ticket, color: 'bg-endeavour' },
  { title: 'Attractions', description: 'Manage rides, attractions, and capacity', icon: Compass, color: 'bg-purple-500' },
  { title: 'Bookings', description: 'Track group bookings and reservations', icon: CalendarCheck, color: 'bg-amber-500' },
]

export default function Amusement() {
  return (
    <div className="w-full h-full">
      <div className="mb-5">
        <h1 className="bytewave-heading">Amusement Park</h1>
        <p className="bytewave-paragraph">Tickets, attractions, and bookings for your park</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {AMUSEMENT_MODULES.map(({ title, description, icon: Icon, color }) => (
          <div key={title} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="bytewave-heading text-base text-stone-800">{title}</p>
              <div className={`p-1.5 rounded-lg ${color}`}>
                <Icon className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <p className="bytewave-paragraph text-xs text-gray-400">{description}</p>
            <span className="mt-1 w-fit text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500">Coming soon</span>
          </div>
        ))}
      </div>
    </div>
  )
}
