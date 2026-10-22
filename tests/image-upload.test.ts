import { decodeFile, encodeWithinLimit, fitWithin } from '@/app/[locale]/(stores)/stores/pos/_logics/scanner/image'
import { recognize } from '@/app/[locale]/(stores)/stores/pos/_logics/scanner/recognition'
import { axiosError, matchedRaw } from './fixtures'

const MB = 1024 * 1024
const OPTS = { maxEdge: 1600, quality: 0.8, maxBytes: 5 * MB }

describe('7. image compression before upload', () => {
  it('fits the longest edge within 1600px and keeps the aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 }) // never upscales
  })

  it('encodes at 1600px / 0.8 first, steps down only when over 5 MB, and gives up instead of uploading > 5 MB', async () => {
    const calls: [number, number][] = []
    const src = { source: {} as CanvasImageSource, width: 4000, height: 3000 }
    // First attempt too big, second fits.
    const sizes = [6 * MB, 4 * MB]
    const encoder = vi.fn(async (_s: unknown, edge: number, q: number) => {
      calls.push([edge, q])
      return new Blob([new Uint8Array(sizes.shift() ?? 1)], { type: 'image/jpeg' })
    })
    const blob = await encodeWithinLimit(src, OPTS, encoder)
    expect(calls[0]).toEqual([1600, 0.8])
    expect(blob!.size).toBeLessThanOrEqual(5 * MB)

    const alwaysHuge = vi.fn(async (_s: unknown, _edge: number, _q: number) => new Blob([new Uint8Array(6 * MB)]))
    expect(await encodeWithinLimit(src, OPTS, alwaysHuge)).toBeNull()
    expect(alwaysHuge.mock.calls.every(([, edge]) => edge <= 1600)).toBe(true)
  })

  it('decodes photos with EXIF orientation applied so they upload upright', async () => {
    const close = vi.fn()
    const createImageBitmap = vi.fn(async () => ({ width: 3000, height: 4000, close }))
    vi.stubGlobal('createImageBitmap', createImageBitmap)
    const file = new Blob(['x'], { type: 'image/jpeg' })
    const decoded = await decodeFile(file)
    expect(createImageBitmap).toHaveBeenCalledWith(file, { imageOrientation: 'from-image' })
    expect([decoded.width, decoded.height]).toEqual([3000, 4000])
    decoded.release?.()
    expect(close).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('on 413 recompresses and retries exactly once', async () => {
    const image = new Blob([new Uint8Array(100)], { type: 'image/jpeg' })
    const smaller = new Blob([new Uint8Array(50)], { type: 'image/jpeg' })
    const recompress = vi.fn(async () => smaller)

    const request = vi
      .fn()
      .mockRejectedValueOnce(axiosError(413))
      .mockResolvedValueOnce({ data: { status: true, data: matchedRaw() } })
    const result = await recognize(request, { image }, { recompress })
    expect(result.status).toBe('matched')
    expect(recompress).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledTimes(2)
    expect((request.mock.calls[1][0].data as FormData).get('image')).toBeInstanceOf(Blob)
    expect(((request.mock.calls[1][0].data as FormData).get('image') as Blob).size).toBe(50)

    // Still too large after the retry → error, no third attempt.
    const request2 = vi.fn().mockRejectedValue(axiosError(413))
    await expect(recognize(request2, { image }, { recompress })).rejects.toMatchObject({ kind: 'too-large', message: 'Photo too large.' })
    expect(request2).toHaveBeenCalledTimes(2)
  })

  it('sends on-device text and barcode alongside the image', async () => {
    const request = vi.fn().mockResolvedValue({ data: { status: true, data: matchedRaw() } })
    await recognize(request, { image: new Blob(['x'], { type: 'image/jpeg' }), barcode: '6001234567899', text: ['HAPPY', 'MAN'] })
    const form = request.mock.calls[0][0].data as FormData
    expect(request.mock.calls[0][0].url).toBe('/pos/products/recognize')
    expect(form.get('barcode')).toBe('6001234567899')
    expect(form.get('text')).toBe('HAPPY\nMAN')
  })
})
