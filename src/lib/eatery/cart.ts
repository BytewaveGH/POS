'use client'

// The customer's cart, per restaurant, plus their recent order tickets and
// contact details — kept on their own device only. Prices are never stored
// here; they are worked out from the live menu every time.

import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { FulfilmentType, OrderLineInput } from './types'
import type { OrderTicket } from './data-source'

export interface CartLine extends OrderLineInput {
  key: string
}

interface CartState {
  carts: Record<string, CartLine[]>
  tickets: OrderTicket[]
  contact: { name: string; phone: string; address: string; landmark: string }
  // Remembered per restaurant: table from the QR code, last fulfilment choice
  prefs: Record<string, { table?: string; fulfilment?: FulfilmentType }>
  add: (slug: string, line: OrderLineInput) => void
  setQuantity: (slug: string, key: string, quantity: number) => void
  removeLine: (slug: string, key: string) => void
  clear: (slug: string) => void
  addTicket: (t: OrderTicket) => void
  setContact: (c: Partial<CartState['contact']>) => void
  setPref: (slug: string, p: CartState['prefs'][string]) => void
}

// Same item with the same choices and note → one line with a bigger quantity.
const sameLine = (a: OrderLineInput, b: OrderLineInput) =>
  a.itemId === b.itemId &&
  (a.note ?? '') === (b.note ?? '') &&
  JSON.stringify(sortChoices(a.choices)) === JSON.stringify(sortChoices(b.choices)) &&
  JSON.stringify(a.comboPicks ?? {}) === JSON.stringify(b.comboPicks ?? {})
const sortChoices = (c: Record<string, string[]>) =>
  Object.fromEntries(
    Object.keys(c)
      .sort()
      .filter((k) => c[k].length)
      .map((k) => [k, [...c[k]].sort()])
  )

// localStorage can be missing or throw (private mode); the cart then lives in memory.
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return window.localStorage.getItem(k)
    } catch {
      return null
    }
  },
  setItem: (k, v) => {
    try {
      window.localStorage.setItem(k, v)
    } catch {
      // ignore
    }
  },
  removeItem: (k) => {
    try {
      window.localStorage.removeItem(k)
    } catch {
      // ignore
    }
  },
}

let n = 0
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      carts: {},
      tickets: [],
      contact: { name: '', phone: '', address: '', landmark: '' },
      prefs: {},
      add: (slug, line) =>
        set((s) => {
          const lines = s.carts[slug] ?? []
          const existing = lines.find((l) => sameLine(l, line))
          const next = existing
            ? lines.map((l) => (l === existing ? { ...l, quantity: l.quantity + line.quantity } : l))
            : [...lines, { ...line, key: `l${Date.now().toString(36)}${n++}` }]
          return { carts: { ...s.carts, [slug]: next } }
        }),
      setQuantity: (slug, key, quantity) =>
        set((s) => ({
          carts: {
            ...s.carts,
            [slug]: (s.carts[slug] ?? []).flatMap((l) =>
              l.key !== key ? [l] : quantity > 0 ? [{ ...l, quantity: Math.min(99, quantity) }] : []
            ),
          },
        })),
      removeLine: (slug, key) => set((s) => ({ carts: { ...s.carts, [slug]: (s.carts[slug] ?? []).filter((l) => l.key !== key) } })),
      clear: (slug) => set((s) => ({ carts: { ...s.carts, [slug]: [] } })),
      addTicket: (t) => set((s) => ({ tickets: [t, ...s.tickets.filter((x) => !(x.slug === t.slug && x.code === t.code))].slice(0, 20) })),
      setContact: (c) => set((s) => ({ contact: { ...s.contact, ...c } })),
      setPref: (slug, p) => set((s) => ({ prefs: { ...s.prefs, [slug]: { ...s.prefs[slug], ...p } } })),
    }),
    { name: 'sellix-eatery-cart', storage: createJSONStorage(() => safeStorage) }
  )
)

const EMPTY: CartLine[] = []
export const useCartLines = (slug: string) => useCart((s) => s.carts[slug] ?? EMPTY)
