'use client'

import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Printer } from 'lucide-react'
import { Button } from '@/components/kit/ui'
import type { Restaurant } from '@/lib/eatery/types'

export const tableUrl = (origin: string, locale: string, slug: string, table: string) =>
  `${origin}/${locale}/eat/${slug}?table=${encodeURIComponent(table)}`

const useQrSvgs = (urls: string[]) => {
  const [svgs, setSvgs] = useState<Record<string, string>>({})
  const key = urls.join('|')
  useEffect(() => {
    let alive = true
    Promise.all(urls.map((u) => QRCode.toString(u, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then((s) => [u, s] as const)))
      .then((pairs) => alive && setSvgs(Object.fromEntries(pairs)))
      .catch(() => alive && setSvgs({}))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return svgs
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

// One QR per table: scanning opens the menu with the table pre-filled.
export const TableQrCodes = ({ restaurant, locale }: { restaurant: Restaurant; locale: string }) => {
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])
  const tables = restaurant.fulfilment.dineIn.tables
  const urls = origin ? tables.map((t) => tableUrl(origin, locale, restaurant.slug, t)) : []
  const svgs = useQrSvgs(urls)

  const print = () => {
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    const cards = tables
      .map(
        (t, i) =>
          `<div class="card"><div class="qr">${svgs[urls[i]] ?? ''}</div><p class="t">Table ${escapeHtml(t)}</p><p class="s">Scan to see the menu and order</p><p class="n">${escapeHtml(restaurant.name)}</p></div>`
      )
      .join('')
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(restaurant.name)} — table QR codes</title><style>body{font-family:system-ui,sans-serif;margin:24px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.card{border:1px dashed #999;border-radius:12px;padding:16px;text-align:center;break-inside:avoid}.qr svg{width:100%;height:auto}.t{font-size:22px;font-weight:800;margin:8px 0 2px}.s{font-size:12px;color:#444;margin:0}.n{font-size:12px;font-weight:700;margin:6px 0 0}</style></head><body><div class="grid">${cards}</div><script>window.onload=()=>window.print()</script></body></html>`
    )
    w.document.close()
  }

  if (!tables.length) return <p className="text-sm text-stone-500">Add tables to get a QR code for each.</p>
  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {tables.map((t, i) => (
          <figure key={t} className="rounded-xl border border-stone-200 p-2 text-center">
            <div
              className="aspect-square w-full [&_svg]:h-full [&_svg]:w-full"
              role="img"
              aria-label={`QR code for table ${t}`}
              dangerouslySetInnerHTML={{ __html: svgs[urls[i]] ?? '' }}
            />
            <figcaption className="mt-1 text-xs font-bold text-stone-700">{t}</figcaption>
          </figure>
        ))}
      </div>
      <Button variant="secondary" icon={Printer} className="mt-3" onClick={print} disabled={!Object.keys(svgs).length}>
        Print table cards
      </Button>
    </div>
  )
}
