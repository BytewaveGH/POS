import fs from 'node:fs'
import path from 'node:path'
import { mapApiUnit } from '@/app/[locale]/(stores)/stores/pos/_logics/types'
import { parseRecognition } from '@/app/[locale]/(stores)/stores/pos/_logics/scanner/recognition'
import { buildCreateProductPayload, buildUnitPayload } from '@/app/[locale]/(stores)/stores/products/inventory/_logics/product-payload'
import { matchedRaw } from './fixtures'

const RULES = ['flat', 'half-box', 'bulk-wholesale'] as const

describe('pricingRule is flat | half-box | bulk-wholesale end to end', () => {
  it.each(RULES)('%s survives form → request → API response → POS', (rule) => {
    const unit = { unitId: 1, retailPrice: 2, wholesalePrice: 1.8, pricingRule: rule, baseQuantity: 1, boxSize: 10, boxRetailPrice: 18 }
    const sent = buildUnitPayload(unit).pricingRule
    expect(sent).toBe(rule)
    expect(
      buildCreateProductPayload({ name: 'x', category: 'packs', purchasePrice: 1, units: [unit], stock: [] }).units[0].pricingRule
    ).toBe(rule)
    // The API echoes the same value back on units and recognition units.
    expect(mapApiUnit({ id: 1, unitName: 'Piece', pricingRule: sent }).pricingRule).toBe(rule)
    const rec = parseRecognition(matchedRaw({ unit: { id: 11, name: 'Piece', price: 2, pricingRule: sent, baseQuantity: 1 } }))
    expect(rec.unit?.pricingRule).toBe(rule)
  })

  it('a flat unit with a wholesale threshold is sent as bulk-wholesale (existing form rule)', () => {
    expect(buildUnitPayload({ unitId: 1, retailPrice: 2, wholesalePrice: 1.8, pricingRule: 'flat', bulkThreshold: 5 }).pricingRule).toBe(
      'bulk-wholesale'
    )
  })

  it('no source file uses the legacy standard | box | bulk pricing values', () => {
    const roots = ['src', 'tests'].map((d) => path.resolve(__dirname, '..', d))
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (/\.(ts|tsx)$/.test(entry.name) && full !== __filename) {
          const text = fs.readFileSync(full, 'utf8')
          // pricingRule assigned/compared/typed with a legacy value
          if (/pricingRule[^\n]{0,40}['"](standard|box|bulk)['"]/.test(text) || /\[\s*standard\s*,\s*box\s*,\s*bulk\s*\]/.test(text))
            offenders.push(path.relative(process.cwd(), full))
        }
      }
    }
    roots.forEach(walk)
    expect(offenders).toEqual([])
  })
})
