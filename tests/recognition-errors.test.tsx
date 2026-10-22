import { act, renderHook } from '@testing-library/react'
import { classifyRecognitionError, recognize } from '@/app/[locale]/(stores)/stores/pos/_logics/scanner/recognition'
import { useRecognitionRequests } from '@/app/[locale]/(stores)/stores/pos/_logics/scanner/use-recognition-requests'
import { RECOGNITION_CONFIG } from '@/app/[locale]/(stores)/stores/pos/_logics/scanner/config'
import { axiosError } from './fixtures'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@/hooks/use-axios', () => ({ useAxios: () => mocks.request }))
// Phone OCR finds no text here, so a 503 surfaces as an error (covered separately in on-device-ocr.test.tsx).
vi.mock('@/app/[locale]/(stores)/stores/pos/_logics/scanner/on-device-ocr', () => ({ readTextOnDevice: async () => [] }))

const image = new Blob(['x'], { type: 'image/jpeg' })

beforeEach(() => vi.clearAllMocks())

describe('9. recognition errors', () => {
  it.each([
    [429, 'rate-limited', /slow down/i],
    [503, 'unavailable', /Recognition unavailable, use barcode or search/],
    [504, 'timeout', /Took too long, try again/],
    [415, 'unsupported-type', /JPEG\/PNG/],
    [422, 'unreadable', /Couldn’t read that photo/],
  ])('%i → %s', async (status, kind, message) => {
    const request = vi.fn().mockRejectedValue(axiosError(status))
    await expect(recognize(request, { image })).rejects.toMatchObject({ kind, message: expect.stringMatching(message) })
  })

  it('network failures and client timeouts are reported distinctly', () => {
    expect(classifyRecognitionError(new Error('Network Error')).kind).toBe('network')
    expect(classifyRecognitionError(Object.assign(new Error('timeout'), { code: 'ECONNABORTED' })).kind).toBe('timeout')
  })

  it('a 429 starts a client cooldown: the next scan is refused without hitting the server', async () => {
    mocks.request.mockRejectedValueOnce(axiosError(429, { message: 'rate limit exceeded' }))
    const { result } = renderHook(() => useRecognitionRequests(RECOGNITION_CONFIG))

    await act(async () => {
      await expect(result.current.recognizeItem({ image })).rejects.toMatchObject({ kind: 'rate-limited' })
    })
    expect(result.current.cooldownUntil).toBeGreaterThan(Date.now())

    await act(async () => {
      await expect(result.current.recognizeItem({ image })).rejects.toMatchObject({ kind: 'rate-limited' })
    })
    expect(mocks.request).toHaveBeenCalledTimes(1)
  })

  it('errors never produce a result, so nothing reaches the cart', async () => {
    for (const status of [429, 503, 504]) {
      mocks.request.mockRejectedValueOnce(axiosError(status))
      const { result } = renderHook(() => useRecognitionRequests(RECOGNITION_CONFIG))
      let value: unknown = 'unset'
      await act(async () => {
        value = await result.current.recognizeItem({ image }).catch(() => 'rejected')
      })
      expect(value).toBe('rejected')
    }
  })

  it('a response that arrives after the scanner closed is dropped', async () => {
    let resolve!: (v: unknown) => void
    mocks.request.mockImplementationOnce(() => new Promise((r) => (resolve = r)))
    const { result } = renderHook(() => useRecognitionRequests(RECOGNITION_CONFIG))
    let pending!: Promise<unknown>
    act(() => {
      pending = result.current.recognizeItem({ image })
    })
    act(() => result.current.cancelAll())
    resolve({ data: { status: true, data: { status: 'matched' } } })
    await act(async () => {
      expect(await pending).toBeNull()
    })
  })
})
