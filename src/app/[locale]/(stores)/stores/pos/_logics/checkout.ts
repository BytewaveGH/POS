// POST /sales — payload building and error classification.
//
// The server recomputes every price and total from the database and consumes
// stock as quantity × baseQuantity in one transaction, so the client never
// sends prices and only shows the server's numbers on the receipt.

import type { AxiosRequestConfig } from 'axios'
import { apiErrorMessage, apiStatus } from '@/lib/api-error'
import { SalesServices } from './services'
import type { CartItem, CustomerType } from './types'

export type SalePayload = {
  paymentType: 'cash' | 'momo'
  warehouseId: number
  employeeId?: number
  items: { productUnitId: number; quantity: number; pricingType: CustomerType }[]
}

export type SaleSessionUser = { accountType?: string; userId?: number } | null | undefined

// Interim contract: the server attributes a sale to an employee only via
// `employeeId` in the body (not from the token). Employees send their own id
// (data.employee.id from login, stored as session.user.userId); admins send
// nothing. This is the only place attribution is decided — if the backend
// starts reading it from the token, delete this and its use below.
export const saleAttribution = (user: SaleSessionUser): { employeeId?: number } =>
  user?.accountType === 'employee' && Number.isInteger(user.userId) && user.userId! > 0 ? { employeeId: user.userId } : {}

export const buildSalePayload = (
  cart: CartItem[],
  opts: { paymentType: 'cash' | 'momo'; warehouseId: number; customerType: CustomerType; user: SaleSessionUser }
): SalePayload => ({
  paymentType: opts.paymentType,
  warehouseId: opts.warehouseId,
  ...saleAttribution(opts.user),
  items: cart.map((i) => ({ productUnitId: Number(i.selectedUnit), quantity: i.quantity, pricingType: opts.customerType })),
})

export type ReceiptLine = {
  productUnitId: number
  productName: string
  unitName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export type SaleReceipt = {
  id?: number
  paymentType: string
  totalAmount: number
  items: ReceiptLine[]
  createdAt?: string
}

export type CheckoutFailure =
  // 409 — nothing recorded; keep the cart and highlight productId.
  | { ok: false; kind: 'stock'; message: string; productId?: string }
  // 422 — the cart itself is invalid; fix, don't retry.
  | { ok: false; kind: 'invalid'; message: string }
  | { ok: false; kind: 'network' | 'other'; message: string }

export type CheckoutResult = { ok: true; receipt: SaleReceipt } | CheckoutFailure

// "insufficient stock for product 12: have 20, need 27 base units"
export const parseInsufficientStock = (message: string) => {
  const m = /product\s+(\d+)(?:\D+have\s+(\d+)\D+need\s+(\d+))?/i.exec(message)
  return m ? { productId: m[1], have: m[2] ? Number(m[2]) : undefined, need: m[3] ? Number(m[3]) : undefined } : null
}

const toReceipt = (sale: any): SaleReceipt => ({
  id: sale?.id,
  paymentType: sale?.paymentType ?? '',
  totalAmount: Number(sale?.totalAmount ?? 0),
  createdAt: sale?.createdAt,
  items: (Array.isArray(sale?.items) ? sale.items : []).map((i: any) => ({
    productUnitId: Number(i.productUnitId),
    productName: i.productName ?? '',
    unitName: i.unitName ?? '',
    quantity: Number(i.quantity ?? 0),
    unitPrice: Number(i.unitPrice ?? 0),
    subtotal: Number(i.subtotal ?? 0),
  })),
})

export const classifyCheckoutError = (err: any): CheckoutFailure => {
  const status = apiStatus(err)
  if (!status) return { ok: false, kind: 'network', message: 'Could not reach the server. The sale was not recorded.' }
  const message = apiErrorMessage(err, 'The sale could not be completed.')
  if (status === 409) {
    const parsed = parseInsufficientStock(message)
    return { ok: false, kind: 'stock', message: `Not enough stock — nothing was charged. ${message}`, productId: parsed?.productId }
  }
  if (status === 422) return { ok: false, kind: 'invalid', message: `Some items are invalid: ${message}` }
  return { ok: false, kind: 'other', message }
}

export const submitSale = async (request: (config: AxiosRequestConfig) => Promise<any>, payload: SalePayload): Promise<CheckoutResult> => {
  try {
    const res = await request(SalesServices.Create(payload))
    return { ok: true, receipt: toReceipt(res?.data?.data ?? res?.data) }
  } catch (err) {
    return classifyCheckoutError(err)
  }
}
