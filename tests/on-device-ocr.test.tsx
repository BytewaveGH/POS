import { act, renderHook } from '@testing-library/react'
import { RECOGNITION_CONFIG } from '@/app/[locale]/(stores)/stores/pos/_logics/scanner/config'
import { recognize } from '@/app/[locale]/(stores)/stores/pos/_logics/scanner/recognition'
import { useRecognitionRequests } from '@/app/[locale]/(stores)/stores/pos/_logics/scanner/use-recognition-requests'
import { axiosError, matchedRaw } from './fixtures'

// ── tesseract.js mock ───────────────────────────────────────────────────────
const tess = vi.hoisted(() => ({
  createWorker: vi.fn(),
  recognize: vi.fn(),
  setParameters: vi.fn(async () => undefined),
  terminate: vi.fn(async () => undefined),
}))
vi.mock('tesseract.js', () => ({
  OEM: { LSTM_ONLY: 1 },
  PSM: { SPARSE_TEXT: '11' },
  createWorker: tess.createWorker,
}))

const mocks = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@/hooks/use-axios', () => ({ useAxios: () => mocks.request }))

const image = new Blob(['jpeg'], { type: 'image/jpeg' })
const ok = { data: { status: true, data: matchedRaw() } }
const formOf = (call: any[]) => call[0].data as FormData

// on-device-ocr.ts keeps the engine in module state — load a fresh copy per test.
const loadOcr = async () => {
  vi.resetModules()
  return import('@/app/[locale]/(stores)/stores/pos/_logics/scanner/on-device-ocr')
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  tess.createWorker.mockResolvedValue({ recognize: tess.recognize, setParameters: tess.setParameters, terminate: tess.terminate })
  tess.recognize.mockResolvedValue({
    data: {
      text: '',
      lines: [
        { text: 'HAPPY MAN\n', confidence: 91 },
        { text: '| ~ 1:', confidence: 88 }, // noise
        { text: 'menthol', confidence: 30 }, // low confidence
        { text: 'happy man', confidence: 80 }, // duplicate
        { text: 'CIGARETTES', confidence: 72 },
      ],
    },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('phone-side OCR engine (tesseract.js)', () => {
  it('cleans OCR lines: drops noise, low confidence and duplicates', async () => {
    const { cleanOcrLines } = await loadOcr()
    expect(
      cleanOcrLines(
        [
          { text: ' HAPPY  MAN ', confidence: 90 },
          { text: '|||', confidence: 99 },
          { text: 'A1', confidence: 99 },
          { text: 'mint', confidence: 20 },
          { text: 'Happy Man', confidence: 85 },
        ],
        55
      )
    ).toEqual(['HAPPY MAN'])
  })

  it('reads text from the photo, loading the engine once and reusing it', async () => {
    const { readTextOnDevice } = await loadOcr()
    expect(await readTextOnDevice(image)).toEqual(['HAPPY MAN', 'CIGARETTES'])
    expect(await readTextOnDevice(image)).toEqual(['HAPPY MAN', 'CIGARETTES'])
    expect(tess.createWorker).toHaveBeenCalledTimes(1)
    expect(tess.createWorker).toHaveBeenCalledWith('eng', 1, {}) // default CDN assets
    expect(tess.setParameters).toHaveBeenCalledWith({ tessedit_pageseg_mode: '11' })
    expect(tess.recognize).toHaveBeenCalledWith(image)
  })

  it('a slow photo times out to [] and the next photo is skipped until the engine is free', async () => {
    const { readTextOnDevice } = await loadOcr()
    // The freshly loaded module reads its own config instance.
    const { RECOGNITION_CONFIG: cfg } = await import('@/app/[locale]/(stores)/stores/pos/_logics/scanner/config')
    const saved = cfg.onDeviceOcrTimeoutMs
    cfg.onDeviceOcrTimeoutMs = 20
    let finish!: (v: unknown) => void
    tess.recognize.mockImplementationOnce(() => new Promise((r) => (finish = r)))
    try {
      expect(await readTextOnDevice(image)).toEqual([]) // timed out
      expect(await readTextOnDevice(image)).toEqual([]) // engine still busy → skipped, not queued
      expect(tess.recognize).toHaveBeenCalledTimes(1)
      finish({ data: { text: '', lines: [] } })
      await new Promise((r) => setTimeout(r, 0))
      expect(await readTextOnDevice(image)).toEqual(['HAPPY MAN', 'CIGARETTES']) // free again
    } finally {
      cfg.onDeviceOcrTimeoutMs = saved
    }
  })

  it('an engine that fails to load yields [] (and is retried on the next scan)', async () => {
    const { readTextOnDevice } = await loadOcr()
    tess.createWorker.mockRejectedValueOnce(new Error('offline'))
    expect(await readTextOnDevice(image)).toEqual([])
    await new Promise((r) => setTimeout(r, 0))
    expect(await readTextOnDevice(image)).toEqual(['HAPPY MAN', 'CIGARETTES'])
    expect(tess.createWorker).toHaveBeenCalledTimes(2)
  })

  it('prefers the browser TextDetector when available (no tesseract download)', async () => {
    vi.stubGlobal(
      'TextDetector',
      class {
        detect = async () => [{ rawValue: 'ALOMO BITTERS' }, { rawValue: '~' }]
      }
    )
    vi.stubGlobal('createImageBitmap', async () => ({ width: 10, height: 10, close: () => {} }))
    const { readTextOnDevice } = await loadOcr()
    expect(await readTextOnDevice(image)).toEqual(['ALOMO BITTERS'])
    expect(tess.createWorker).not.toHaveBeenCalled()
  })

  it('releasing frees the engine', async () => {
    const { readTextOnDevice, releaseOnDeviceOcr } = await loadOcr()
    await readTextOnDevice(image)
    await releaseOnDeviceOcr()
    expect(tess.terminate).toHaveBeenCalledTimes(1)
  })
})

describe('503 fallback in recognize()', () => {
  it('on 503 reads text on the phone and retries once with text + image', async () => {
    const request = vi.fn().mockRejectedValueOnce(axiosError(503)).mockResolvedValueOnce(ok)
    const onDeviceText = vi.fn(async () => ['HAPPY MAN'])
    const onServerOcrDown = vi.fn()
    const result = await recognize(request, { image }, { onDeviceText, onServerOcrDown })
    expect(result.status).toBe('matched')
    expect(onDeviceText).toHaveBeenCalledTimes(1)
    expect(onServerOcrDown).toHaveBeenCalled()
    expect(request).toHaveBeenCalledTimes(2)
    expect(formOf(request.mock.calls[0]).get('text')).toBeNull()
    expect(formOf(request.mock.calls[1]).get('text')).toBe('HAPPY MAN')
    expect(formOf(request.mock.calls[1]).get('image')).toBeInstanceOf(Blob)
  })

  it('no readable text → the 503 is reported, with no second request', async () => {
    const request = vi.fn().mockRejectedValue(axiosError(503))
    await expect(recognize(request, { image }, { onDeviceText: async () => [] })).rejects.toMatchObject({ kind: 'unavailable' })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('does not retry when text was already sent, or for other errors', async () => {
    const onDeviceText = vi.fn(async () => ['X'])
    await expect(recognize(vi.fn().mockRejectedValue(axiosError(503)), { image, text: ['HAPPY'] }, { onDeviceText })).rejects.toMatchObject(
      {
        kind: 'unavailable',
      }
    )
    await expect(recognize(vi.fn().mockRejectedValue(axiosError(504)), { image }, { onDeviceText })).rejects.toMatchObject({
      kind: 'timeout',
    })
    expect(onDeviceText).not.toHaveBeenCalled()
  })
})

describe('phone OCR in the scanner request hook', () => {
  it('after a 503, later scans read text up front (no extra 503 round-trip) and the badge turns on', async () => {
    mocks.request.mockRejectedValueOnce(axiosError(503)).mockResolvedValue(ok)
    const { result } = renderHook(() => useRecognitionRequests(RECOGNITION_CONFIG))
    expect(result.current.usingPhoneOcr).toBe(false)

    await act(async () => {
      await result.current.recognizeItem({ image })
    })
    expect(mocks.request).toHaveBeenCalledTimes(2) // 503, then retry with text
    expect(result.current.usingPhoneOcr).toBe(true)

    await act(async () => {
      await result.current.recognizeItem({ image })
    })
    expect(mocks.request).toHaveBeenCalledTimes(3) // straight through, text already attached
    expect(formOf(mocks.request.mock.calls[2]).get('text')).toBe('HAPPY MAN\nCIGARETTES')
  })

  it("while server OCR works, the phone engine isn't touched", async () => {
    mocks.request.mockResolvedValue(ok)
    const { result } = renderHook(() => useRecognitionRequests(RECOGNITION_CONFIG))
    await act(async () => {
      await result.current.recognizeItem({ image })
    })
    expect(tess.recognize).not.toHaveBeenCalled()
    expect(formOf(mocks.request.mock.calls[0]).get('text')).toBeNull()
  })

  it("'always' mode sends phone text on every scan", async () => {
    mocks.request.mockResolvedValue(ok)
    const config = { ...RECOGNITION_CONFIG, onDeviceOcrMode: 'always' as const }
    const { result } = renderHook(() => useRecognitionRequests(config))
    expect(result.current.usingPhoneOcr).toBe(true)
    await act(async () => {
      await result.current.recognizeItem({ image })
    })
    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(formOf(mocks.request.mock.calls[0]).get('text')).toBe('HAPPY MAN\nCIGARETTES')
  })

  it('disabled by config → never reads text on the phone', async () => {
    mocks.request.mockRejectedValue(axiosError(503))
    const config = { ...RECOGNITION_CONFIG, enableOnDeviceOCR: false }
    const { result } = renderHook(() => useRecognitionRequests(config))
    await act(async () => {
      await expect(result.current.recognizeItem({ image })).rejects.toMatchObject({ kind: 'unavailable' })
    })
    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(tess.recognize).not.toHaveBeenCalled()
  })
})
