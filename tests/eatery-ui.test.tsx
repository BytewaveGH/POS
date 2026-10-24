import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_EATERY_DATA_SOURCE = 'local'
})
const nav = vi.hoisted(() => ({ params: { locale: 'en' } as Record<string, string>, search: new URLSearchParams(), push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useParams: () => nav.params,
  useSearchParams: () => nav.search,
  useRouter: () => ({ push: nav.push }),
}))
vi.mock('next-auth/react', () => ({ useSession: () => ({ status: 'authenticated', data: { user: { tenant: 'acme' } } }) }))
vi.mock('@/hooks/use-axios', () => ({ useAxios: () => vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import EatDirectory from '@/app/[locale]/(eatery-public)/eat/page'
import RestaurantPage from '@/app/[locale]/(eatery-public)/eat/[slug]/page'
import CheckoutPage from '@/app/[locale]/(eatery-public)/eat/[slug]/checkout/page'
import OrdersBoard from '@/app/[locale]/(eatery)/eatery/orders/page'
import BrandPage from '@/app/[locale]/(eatery)/eatery/brand/page'
import { createLocalSource } from '@/lib/eatery/data-source'
import { useCart } from '@/lib/eatery/cart'
import type { StorefrontBundle } from '@/lib/eatery/types'

const withQuery = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any
  window.scrollTo = vi.fn() as any
})

beforeEach(() => {
  // Wednesday 21 Oct 2026, 13:00 — Blaze and the café are open, the bar opens at 5pm.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 21, 13, 0))
  localStorage.clear()
  useCart.setState({ carts: {}, tickets: [], prefs: {}, contact: { name: '', phone: '', address: '', landmark: '' } })
  nav.params = { locale: 'en' }
  nav.search = new URLSearchParams()
  nav.push.mockReset()
})
afterEach(() => vi.useRealTimers())

describe('eatery platform (local data)', () => {
  it('the directory shows each place in its own style and filters by kind', async () => {
    withQuery(<EatDirectory />)
    const cards = await screen.findAllByRole('article')
    expect(cards).toHaveLength(3)
    // Each card carries its own theme.
    const fonts = cards.map((c) => (c as HTMLElement).style.getPropertyValue('--e-font-display'))
    expect(new Set(fonts).size).toBe(3)
    expect(within(cards.find((c) => c.textContent?.includes('Velvet Hour'))!).getByText(/Closed/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Drinks & bars' }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Open now' }))
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })

  it('orders a large pepperoni with extra cheese for pickup, paid by MoMo', async () => {
    nav.params = { locale: 'en', slug: 'blaze-pizza-shawarma' }
    const page = withQuery(<RestaurantPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Pepperoni Feast' }))

    const sheet = await screen.findByRole('dialog')
    fireEvent.click(within(sheet).getByLabelText(/Large/))
    fireEvent.click(within(sheet).getByLabelText(/Extra cheese/))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Add · ₵187' })) // 85 + 90 + 12
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('link', { name: /View your order.*₵187/ })).toBeTruthy()
    page.unmount()

    withQuery(<CheckoutPage />)
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Ama Owusu' } })
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '024 123 4567' } })
    expect(screen.getByRole('radio', { name: /Mobile money/ }).getAttribute('aria-checked')).toBe('true')
    fireEvent.change(screen.getByLabelText(/Transaction ID/), { target: { value: 'MP2610' } })
    fireEvent.click(screen.getByRole('button', { name: 'Place order · ₵187' }))

    await waitFor(() =>
      expect(nav.push).toHaveBeenCalledWith(expect.stringMatching(/^\/en\/eat\/blaze-pizza-shawarma\/order\/[A-Z2-9]{4}$/))
    )
    const orders = JSON.parse(localStorage.getItem('sellix-eatery:v1:orders')!)
    expect(orders[0]).toMatchObject({
      total: 187,
      fulfilment: { type: 'pickup' },
      payment: { method: 'momo', status: 'pending', reference: 'MP2610' },
    })
    expect(orders[0].lines[0].summary).toMatch(/Large.*Extra cheese/)
    expect(useCart.getState().carts['blaze-pizza-shawarma']).toEqual([])
  })

  it('a table QR code makes it a dine-in order at that table', async () => {
    nav.params = { locale: 'en', slug: 'kofi-and-crumb' }
    nav.search = new URLSearchParams('table=Window%201')
    const page = withQuery(<RestaurantPage />)
    expect((await screen.findAllByText('Table Window 1')).length).toBeGreaterThan(0)
    fireEvent.click(await screen.findByRole('button', { name: 'Butter Croissant' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /^Add · / }))
    page.unmount()

    withQuery(<CheckoutPage />)
    expect((await screen.findByRole('radio', { name: /At my table/ })).getAttribute('aria-checked')).toBe('true')
    expect((screen.getByLabelText('Your table') as HTMLSelectElement).value).toBe('Window 1')
    expect(screen.getByRole('radio', { name: /Pay at the table/ })).toBeTruthy()
  })

  it('the owner sees the order arrive and moves it along', async () => {
    const owner = createLocalSource('acme')
    await owner.claimDemo!()
    const pub = createLocalSource(null)
    const bundle = (await pub.storefront('blaze-pizza-shawarma')) as StorefrontBundle
    const fries = bundle.items.find((i) => i.name === 'Fries')!
    const o = await pub.placeOrder('blaze-pizza-shawarma', {
      lines: [{ itemId: fries.id, quantity: 2, choices: {} }],
      customer: { name: 'Kwame', phone: '0551234567' },
      fulfilment: { type: 'pickup' },
      payment: { method: 'cash' },
    })
    localStorage.setItem('sellix-eatery:selected', String(bundle.restaurant.id))

    withQuery(<OrdersBoard />)
    const card = await screen.findByRole('article', { name: `Order ${o.code}` })
    expect(within(card).getByText('2× Fries')).toBeTruthy()
    fireEvent.click(within(card).getByRole('button', { name: 'Accept' }))
    await waitFor(async () => expect((await owner.list('orders'))[0].status).toBe('accepted'))
    expect((await pub.trackOrder({ slug: 'blaze-pizza-shawarma', code: o.code, accessKey: o.accessKey }))?.status).toBe('accepted')
  })

  it('the theme editor catches unreadable colours and fixes them', async () => {
    const owner = createLocalSource('acme')
    const [velvet] = await owner.claimDemo!()
    localStorage.setItem('sellix-eatery:selected', String(velvet.id))
    withQuery(<BrandPage />)

    const textHex = await screen.findByLabelText('Text hex')
    fireEvent.change(textHex, { target: { value: '#2A2A2A' } }) // dark text on a dark bar
    expect(await screen.findByText(/hard to read/)).toBeTruthy()
    expect(screen.getByTestId('theme-preview')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Fix contrast' }))
    expect(await screen.findByText('Readable for everyone (WCAG AA)')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Save theme' }))
    await waitFor(async () => {
      const saved = (await owner.list('restaurants')).find((r) => r.id === velvet.id)!
      expect(saved.theme.colors.text).not.toBe('#2A2A2A')
      expect(saved.theme.colors.text).not.toBe(velvet.theme.colors.text)
    })
  })
})
