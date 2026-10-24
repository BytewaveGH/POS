// Where eatery data lives.
//
// - 'api'   — the Sellix backend: owner routes under /eatery/* (scoped by the
//             signed-in business) and public routes under /public/eatery/*.
//             Contract: BACKEND_REQUIREMENTS.md §7.
// - 'local' — this browser's localStorage. For using the platform before the
//             backend ships: data (including customers' orders) only exists in
//             this browser.
//
// Selected with NEXT_PUBLIC_EATERY_DATA_SOURCE (default 'api').

import type { AxiosRequestConfig } from 'axios'
import { openState, priceOrder } from './menu'
import { presetFor } from './presets'
import { DEMO_RESTAURANTS, templateGroup, type DemoRestaurant } from './seed'
import type { CheckoutInput, Order, ResourceMap, ResourceName, Restaurant, StorefrontBundle } from './types'

export type DataSourceKind = 'api' | 'local'
export const DATA_SOURCE_KIND: DataSourceKind = process.env.NEXT_PUBLIC_EATERY_DATA_SOURCE === 'local' ? 'local' : 'api'

type Draft<R extends ResourceName> = Omit<ResourceMap[R], 'id'>
type Patch<R extends ResourceName> = Partial<Omit<ResourceMap[R], 'id'>>

// What the customer's device keeps to follow an order.
export interface OrderTicket {
  slug: string
  code: string
  accessKey: string
}

export interface EaterySource {
  kind: DataSourceKind
  // ── Public (no sign-in) ──
  directory(): Promise<Restaurant[]>
  storefront(slug: string): Promise<StorefrontBundle | null>
  // Priced by the source from the current menu; `input` carries no prices.
  placeOrder(slug: string, input: CheckoutInput): Promise<Order & { accessKey: string }>
  trackOrder(ticket: OrderTicket): Promise<Order | null>
  // ── Owner (the signed-in business only) ──
  list<R extends ResourceName>(r: R): Promise<ResourceMap[R][]>
  create<R extends ResourceName>(r: R, body: Draft<R>): Promise<ResourceMap[R]>
  update<R extends ResourceName>(r: R, id: number, body: Patch<R>): Promise<ResourceMap[R]>
  remove(r: ResourceName, id: number): Promise<void>
  // Local only: hand the example restaurants shown in the directory to this business.
  claimDemo?(): Promise<Restaurant[]>
}

// Same shape as an axios error so screens handle local and API errors alike.
export const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), { response: { status, data: { status: false, error: message } } })

// ── API ──────────────────────────────────────────────────────────────────────

const PATHS: Record<ResourceName, string> = {
  restaurants: 'restaurants',
  categories: 'menu-categories',
  items: 'menu-items',
  promotions: 'promotions',
  orders: 'orders',
}

export const EateryServices = {
  List: (r: ResourceName): AxiosRequestConfig => ({ method: 'GET', url: `/eatery/${PATHS[r]}/` }),
  Create: (r: ResourceName, data: unknown): AxiosRequestConfig => ({ method: 'POST', url: `/eatery/${PATHS[r]}/`, data }),
  Update: (r: ResourceName, id: number, data: unknown): AxiosRequestConfig => ({ method: 'PUT', url: `/eatery/${PATHS[r]}/${id}`, data }),
  Delete: (r: ResourceName, id: number): AxiosRequestConfig => ({ method: 'DELETE', url: `/eatery/${PATHS[r]}/${id}` }),
  Directory: (): AxiosRequestConfig => ({ method: 'GET', url: '/public/eatery/restaurants' }),
  Storefront: (slug: string): AxiosRequestConfig => ({ method: 'GET', url: `/public/eatery/restaurants/${encodeURIComponent(slug)}` }),
  PlaceOrder: (slug: string, data: CheckoutInput): AxiosRequestConfig => ({
    method: 'POST',
    url: `/public/eatery/restaurants/${encodeURIComponent(slug)}/orders`,
    data,
  }),
  TrackOrder: (t: OrderTicket): AxiosRequestConfig => ({
    method: 'GET',
    url: `/public/eatery/restaurants/${encodeURIComponent(t.slug)}/orders/${encodeURIComponent(t.code)}`,
    headers: { 'X-Order-Key': t.accessKey },
  }),
}

const unwrap = (res: any) => res?.data?.data ?? res?.data
const asList = (d: any) => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [])

export const createApiSource = (
  owner: (c: AxiosRequestConfig) => Promise<any>,
  pub: (c: AxiosRequestConfig) => Promise<any>
): EaterySource => ({
  kind: 'api',
  directory: async () => asList(unwrap(await pub(EateryServices.Directory()))),
  storefront: async (slug) => {
    try {
      return unwrap(await pub(EateryServices.Storefront(slug)))
    } catch (err: any) {
      if (err?.response?.status === 404) return null
      throw err
    }
  },
  placeOrder: async (slug, input) => unwrap(await pub(EateryServices.PlaceOrder(slug, input))),
  trackOrder: async (t) => {
    try {
      return unwrap(await pub(EateryServices.TrackOrder(t)))
    } catch (err: any) {
      if (err?.response?.status === 404) return null
      throw err
    }
  },
  list: async (r) => asList(unwrap(await owner(EateryServices.List(r)))),
  create: async (r, body) => unwrap(await owner(EateryServices.Create(r, body))),
  update: async (r, id, body) => unwrap(await owner(EateryServices.Update(r, id, body))),
  remove: async (r, id) => {
    await owner(EateryServices.Delete(r, id))
  },
})

// ── Demo data (built through `create`, so it works against any source) ─────

type Creator = <R extends ResourceName>(r: R, body: Draft<R>) => Promise<ResourceMap[R]>

export const materializeDemo = async (def: DemoRestaurant, create: Creator, slug = def.restaurant.slug) => {
  const restaurant = await create('restaurants', {
    ...def.restaurant,
    slug,
    ownerScope: '',
    theme: JSON.parse(JSON.stringify(presetFor(def.restaurant.category).theme)),
    createdAt: new Date().toISOString(),
  })
  const sectionIds = new Map<string, number>()
  for (let i = 0; i < def.menu.length; i++) {
    const s = def.menu[i]
    const preset = presetFor(def.restaurant.category).sections.find((x) => x.name === s.section)
    const c = await create('categories', {
      restaurantId: restaurant.id,
      name: s.section,
      position: i,
      description: preset?.description,
      schedule: preset?.schedule,
    })
    sectionIds.set(s.section, c.id)
  }
  // Plain items first so combos can point at them.
  const itemIds = new Map<string, number>()
  const make = async (section: string, it: DemoRestaurant['menu'][number]['items'][number], position: number) => {
    const created = await create('items', {
      restaurantId: restaurant.id,
      categoryId: sectionIds.get(section)!,
      name: it.name,
      description: it.description,
      price: it.price,
      tags: it.tags ?? [],
      optionGroups: (it.options ?? []).map(templateGroup).filter((g): g is NonNullable<typeof g> => !!g),
      combo: it.combo
        ? {
            slots: it.combo.map((s, k) => ({
              id: `slot${k + 1}`,
              name: s.name,
              choices: s.choices.filter(([n]) => itemIds.has(n)).map(([n, upcharge]) => ({ itemId: itemIds.get(n)!, upcharge })),
            })),
          }
        : undefined,
      status: it.status ?? 'available',
      schedule: it.schedule,
      position,
    })
    itemIds.set(it.name, created.id)
  }
  for (const s of def.menu) for (let i = 0; i < s.items.length; i++) if (!s.items[i].combo) await make(s.section, s.items[i], i)
  for (const s of def.menu) for (let i = 0; i < s.items.length; i++) if (s.items[i].combo) await make(s.section, s.items[i], i)
  for (const p of def.promotions) {
    await create('promotions', {
      restaurantId: restaurant.id,
      name: p.name,
      description: p.description,
      percentOff: p.percentOff,
      schedule: p.schedule,
      categoryIds: p.sections.map((s) => sectionIds.get(s)!).filter(Boolean),
      itemIds: [],
      active: true,
    })
  }
  return restaurant
}

// ── Local (browser) ──────────────────────────────────────────────────────────

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export const DEMO_SCOPE = 'demo'
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const randomCode = (n: number) => Array.from({ length: n }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')

export const createLocalSource = (
  // The signed-in business; null for anonymous customers.
  scope: string | null,
  storage: StorageLike | null = typeof window === 'undefined' ? null : window.localStorage,
  clock: () => Date = () => new Date()
): EaterySource => {
  const key = (r: ResourceName) => `sellix-eatery:v1:${r}`
  const read = <R extends ResourceName>(r: R): ResourceMap[R][] => {
    try {
      const raw = storage?.getItem(key(r))
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }
  const write = (r: ResourceName, rows: unknown[]) => storage?.setItem(key(r), JSON.stringify(rows))
  const nextId = (rows: { id: number }[]) => rows.reduce((m, x) => Math.max(m, x.id), 0) + 1

  // Raw insert, no ownership checks (seeding).
  const insert: Creator = async (r, body) => {
    const rows = read(r)
    const row = { ...(body as object), id: nextId(rows as { id: number }[]) } as ResourceMap[typeof r]
    write(r, [...rows, row])
    return row
  }

  // The examples appear in the directory the first time anyone opens it.
  let seeding: Promise<void> | null = null
  const ensureSeed = async () => {
    if (read('restaurants').length > 0 || storage?.getItem('sellix-eatery:v1:seeded')) return
    seeding ??= (async () => {
      for (const def of DEMO_RESTAURANTS) {
        const r = await materializeDemo(def, insert)
        write(
          'restaurants',
          read('restaurants').map((x) => (x.id === r.id ? { ...x, ownerScope: DEMO_SCOPE } : x))
        )
      }
      storage?.setItem('sellix-eatery:v1:seeded', '1')
    })()
    await seeding
  }

  const owned = () =>
    new Set(
      read('restaurants')
        .filter((r) => r.ownerScope === scope)
        .map((r) => r.id)
    )
  const requireOwner = () => {
    if (!scope) throw httpError(401, 'Sign in to manage restaurants')
  }
  const belongs = (r: ResourceName, row: any, ids = owned()) => (r === 'restaurants' ? row.ownerScope === scope : ids.has(row.restaurantId))

  const bundleFor = (restaurant: Restaurant): StorefrontBundle => ({
    restaurant,
    categories: read('categories')
      .filter((c) => c.restaurantId === restaurant.id)
      .sort((a, b) => a.position - b.position),
    items: read('items')
      .filter((i) => i.restaurantId === restaurant.id && i.status !== 'hidden')
      .sort((a, b) => a.position - b.position),
    promotions: read('promotions').filter((p) => p.restaurantId === restaurant.id && p.active),
  })

  // Mirrors what the backend does on delete (BACKEND_REQUIREMENTS §7).
  const cascade = (r: ResourceName, id: number) => {
    if (r === 'restaurants') {
      for (const res of ['categories', 'items', 'promotions', 'orders'] as const)
        write(
          res,
          read(res).filter((x: any) => x.restaurantId !== id)
        )
    } else if (r === 'categories') {
      const gone = new Set(
        read('items')
          .filter((i) => i.categoryId === id)
          .map((i) => i.id)
      )
      write(
        'items',
        read('items').filter((i) => i.categoryId !== id)
      )
      gone.forEach((itemId) => cascade('items', itemId))
      write(
        'promotions',
        read('promotions').map((p) => ({ ...p, categoryIds: p.categoryIds.filter((c) => c !== id) }))
      )
    } else if (r === 'items') {
      write(
        'promotions',
        read('promotions').map((p) => ({ ...p, itemIds: p.itemIds.filter((x) => x !== id) }))
      )
      // Drop the item from any combo that offered it.
      write(
        'items',
        read('items').map((i) =>
          i.combo ? { ...i, combo: { slots: i.combo.slots.map((s) => ({ ...s, choices: s.choices.filter((c) => c.itemId !== id) })) } } : i
        )
      )
    }
  }

  return {
    kind: 'local',

    directory: async () => {
      await ensureSeed()
      return read('restaurants')
    },

    storefront: async (slug) => {
      await ensureSeed()
      const r = read('restaurants').find((x) => x.slug === slug)
      return r ? bundleFor(r) : null
    },

    placeOrder: async (slug, input) => {
      const restaurant = read('restaurants').find((x) => x.slug === slug)
      if (!restaurant) throw httpError(404, 'not found')
      const now = clock()
      if (!restaurant.acceptingOrders) throw httpError(409, `${restaurant.name} isn’t taking orders right now`)
      if (!openState(restaurant.hours, now).open) throw httpError(409, `${restaurant.name} is closed right now`)
      const f = input.fulfilment
      if (f.type === 'delivery' && !f.address?.trim()) throw httpError(422, 'Add a delivery address')
      if (f.type === 'dine-in' && !restaurant.fulfilment.dineIn.tables.includes(f.table ?? '')) throw httpError(422, 'Choose your table')
      if (!input.customer.name.trim() || input.customer.phone.replace(/\D/g, '').length < 9)
        throw httpError(422, 'Add your name and phone number')
      const method = input.payment.method
      const pay = restaurant.payments
      if (
        (method === 'cash' && !pay.cash) ||
        (method === 'momo' && !pay.momo.enabled) ||
        (method === 'pay-at-table' && (!pay.payAtTable || f.type !== 'dine-in'))
      )
        throw httpError(422, 'That payment method isn’t available')

      const priced = priceOrder(bundleFor(restaurant), input.lines, f.type, now)
      if (priced.problems.length) throw httpError(422, priced.problems[0])

      const orders = read('orders')
      const taken = new Set(orders.filter((o) => o.restaurantId === restaurant.id).map((o) => o.code))
      let code = randomCode(4)
      while (taken.has(code)) code = randomCode(4)
      const at = now.toISOString()
      const order: Order & { accessKey: string } = {
        id: nextId(orders),
        code,
        accessKey: randomCode(16),
        restaurantId: restaurant.id,
        createdAt: at,
        updatedAt: at,
        customer: { name: input.customer.name.trim(), phone: input.customer.phone.trim() },
        fulfilment: f,
        payment: {
          method,
          status: method === 'momo' && input.payment.reference?.trim() ? 'pending' : 'unpaid',
          reference: input.payment.reference?.trim() || undefined,
        },
        lines: priced.lines,
        subtotal: priced.subtotal,
        discount: priced.discount,
        deliveryFee: priced.deliveryFee,
        total: priced.total,
        status: 'placed',
        history: [{ status: 'placed', at }],
        notes: input.notes?.trim() || undefined,
      }
      write('orders', [...orders, order])
      return order
    },

    trackOrder: async (t) => {
      const restaurant = read('restaurants').find((x) => x.slug === t.slug)
      const order = restaurant && read('orders').find((o) => o.restaurantId === restaurant.id && o.code === t.code)
      if (!order || (order as Order & { accessKey?: string }).accessKey !== t.accessKey) return null
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { accessKey, ...rest } = order as Order & { accessKey?: string }
      return rest
    },

    list: async (r) => {
      requireOwner()
      const ids = owned()
      return read(r).filter((row) => belongs(r, row, ids))
    },

    create: async (r, body) => {
      requireOwner()
      if (r === 'restaurants') {
        const slug = (body as unknown as Restaurant).slug
        if (read('restaurants').some((x) => x.slug === slug)) throw httpError(409, `The address /eat/${slug} is taken — try another`)
        return insert(r, { ...(body as object), ownerScope: scope } as unknown as Draft<typeof r>)
      }
      if (!owned().has((body as unknown as { restaurantId: number }).restaurantId)) throw httpError(422, 'unknown restaurantId')
      return insert(r, body)
    },

    update: async (r, id, body) => {
      requireOwner()
      const rows = read(r)
      const idx = rows.findIndex((x) => x.id === id && belongs(r, x))
      if (idx === -1) throw httpError(404, 'not found')
      if (r === 'restaurants') {
        const slug = (body as Partial<Restaurant>).slug
        if (slug && read('restaurants').some((x) => x.slug === slug && x.id !== id))
          throw httpError(409, `The address /eat/${slug} is taken — try another`)
      }
      const row = { ...rows[idx], ...(body as object), id } as ResourceMap[typeof r]
      if (r === 'restaurants') (row as Restaurant).ownerScope = scope!
      if (r === 'orders') {
        const prev = rows[idx] as Order
        const next = row as Order
        next.updatedAt = clock().toISOString()
        if (next.status !== prev.status) next.history = [...prev.history, { status: next.status, at: next.updatedAt }]
      }
      rows[idx] = row
      write(r, rows)
      return row
    },

    remove: async (r, id) => {
      requireOwner()
      const rows = read(r)
      if (!rows.some((x) => x.id === id && belongs(r, x))) throw httpError(404, 'not found')
      write(
        r,
        rows.filter((x) => x.id !== id)
      )
      cascade(r, id)
    },

    claimDemo: async () => {
      requireOwner()
      await ensureSeed()
      const demos = read('restaurants').filter((x) => x.ownerScope === DEMO_SCOPE)
      if (demos.length) {
        write(
          'restaurants',
          read('restaurants').map((x) => (x.ownerScope === DEMO_SCOPE ? { ...x, ownerScope: scope! } : x))
        )
        return demos.map((d) => ({ ...d, ownerScope: scope! }))
      }
      // Already claimed by someone else in this browser: make fresh copies.
      const out: Restaurant[] = []
      for (const def of DEMO_RESTAURANTS) {
        let slug = def.restaurant.slug
        for (let n = 2; read('restaurants').some((x) => x.slug === slug); n++) slug = `${def.restaurant.slug}-${n}`
        const r = await materializeDemo(def, insert, slug)
        write(
          'restaurants',
          read('restaurants').map((x) => (x.id === r.id ? { ...x, ownerScope: scope! } : x))
        )
        out.push({ ...r, ownerScope: scope! })
      }
      return out
    },
  }
}
