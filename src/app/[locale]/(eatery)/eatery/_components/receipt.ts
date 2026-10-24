'use client'

import QRCode from 'qrcode'
import { formatMoney } from '@/lib/eatery/menu'
import type { Order, Restaurant } from '@/lib/eatery/types'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

// The customer's own tracking link: scanning it on their phone shows the
// order and alerts them when it's ready.
export const trackingUrl = (origin: string, locale: string, slug: string, order: { code: string; accessKey?: string }) =>
  `${origin}/${locale}/eat/${slug}/order/${order.code}${order.accessKey ? `?k=${encodeURIComponent(order.accessKey)}` : ''}`

// 80 mm thermal-printer friendly receipt in a new window.
export const printReceipt = async (order: Order, restaurant: Restaurant, trackUrl?: string) => {
  const w = window.open('', '_blank', 'width=420,height=720')
  if (!w) return false
  const qr = trackUrl ? await QRCode.toString(trackUrl, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).catch(() => '') : ''
  const m = (n: number) => esc(formatMoney(n, restaurant.currency))
  const lines = order.lines
    .map(
      (l) =>
        `<tr><td>${l.quantity}× ${esc(l.name)}${l.summary ? `<div class="s">${esc(l.summary)}</div>` : ''}${l.note ? `<div class="s">“${esc(l.note)}”</div>` : ''}</td><td class="r">${m(l.lineTotal)}</td></tr>`
    )
    .join('')
  const when = new Date(order.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  const how =
    order.fulfilment.type === 'dine-in'
      ? `Dine-in${order.fulfilment.table ? ` · Table ${esc(order.fulfilment.table)}` : ''}`
      : order.fulfilment.type === 'delivery'
        ? 'Delivery'
        : 'Take-away'
  const paid =
    order.payment.status === 'paid'
      ? `Paid · ${order.payment.method === 'momo' ? 'MoMo' : order.payment.method === 'card' ? 'Card' : 'Cash'}`
      : 'Not paid yet'
  const change =
    order.tendered && order.tendered > order.total
      ? `<tr><td>Cash given</td><td class="r">${m(order.tendered)}</td></tr><tr><td>Change</td><td class="r">${m(order.tendered - order.total)}</td></tr>`
      : ''
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(order.code)}</title><style>
    body{font-family:ui-monospace,Menlo,Consolas,monospace;width:72mm;margin:4mm auto;color:#000;font-size:12px}
    h1{font-size:16px;text-align:center;margin:0}.c{text-align:center}.code{font-size:28px;font-weight:800;letter-spacing:4px;text-align:center;margin:6px 0}
    table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top}.r{text-align:right;white-space:nowrap;padding-left:8px}.s{font-size:10px;color:#333}
    hr{border:0;border-top:1px dashed #000;margin:6px 0}.t td{font-weight:800;font-size:14px}.qr{width:34mm;margin:6px auto 0}.qr svg{width:100%;height:auto}
  </style></head><body>
    <h1>${esc(restaurant.name)}</h1><p class="c">${esc(restaurant.address)}, ${esc(restaurant.city)}${restaurant.phone ? `<br>${esc(restaurant.phone)}` : ''}</p>
    <hr><div class="code">#${esc(order.code)}</div><p class="c">${how}<br>${esc(when)}</p><hr>
    <table>${lines}</table><hr>
    <table>${order.discount > 0 ? `<tr><td>Deals</td><td class="r">−${m(order.discount)}</td></tr>` : ''}<tr class="t"><td>Total</td><td class="r">${m(order.total)}</td></tr>${change}<tr><td>${paid}</td><td></td></tr></table>
    ${qr ? `<hr><p class="c">Scan to follow your order<br>— we’ll tell you when it’s ready</p><div class="qr">${qr}</div>` : ''}
    <hr><p class="c">Thank you!</p>
    <script>window.onload=()=>{window.print()}</script></body></html>`)
  w.document.close()
  return true
}
