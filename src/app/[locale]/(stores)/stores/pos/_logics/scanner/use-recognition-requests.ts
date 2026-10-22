'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAxios } from '@/hooks/use-axios'
import type { RecognitionConfig } from './config'
import { lookupBarcode, recognize, RecognitionError, type RecognitionResult, type RecognizeInput } from './recognition'
import { recompressSmaller } from './image'
import { readTextOnDevice } from './on-device-ocr'

// Owns every recognition request the scanner makes:
// - one request at a time (a new one aborts the previous),
// - a sequence number so a late response from an older request is dropped,
// - everything aborted when the scanner closes,
// - a client cooldown after 429 so the cashier can't hammer the rate limit,
// - phone-side OCR: after server OCR answers 503, text is read on the phone and
//   sent with the photo (retry once now, then up front for a while), or on
//   every scan when onDeviceOcrMode is 'always'.
// Resolves to null when the result is stale/aborted; throws RecognitionError.
export const useRecognitionRequests = (config: RecognitionConfig) => {
  const request = useAxios()
  const requestRef = useRef(request)
  requestRef.current = request

  const [busy, setBusy] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const cooldownRef = useRef(0)
  const seq = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  // Until when server OCR is considered down (phone OCR runs up front).
  const ocrDownUntil = useRef(0)
  const [phoneOcr, setPhoneOcr] = useState(config.onDeviceOcrMode === 'always')

  const cancelAll = useCallback(() => {
    seq.current++
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
  }, [])

  useEffect(() => cancelAll, [cancelAll])

  const run = useCallback(
    async (fn: (signal: AbortSignal) => Promise<RecognitionResult>): Promise<RecognitionResult | null> => {
      if (Date.now() < cooldownRef.current) {
        throw new RecognitionError('rate-limited', 'Slow down — too many scans. Wait a few seconds.', 429)
      }
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const mySeq = ++seq.current
      setBusy(true)
      try {
        const result = await fn(controller.signal)
        return mySeq === seq.current && !controller.signal.aborted ? result : null
      } catch (err) {
        if (mySeq !== seq.current || controller.signal.aborted) return null
        if (err instanceof RecognitionError && err.kind === 'rate-limited') {
          cooldownRef.current = Date.now() + config.rateLimitCooldownMs
          setCooldownUntil(cooldownRef.current)
        }
        throw err
      } finally {
        if (mySeq === seq.current) {
          setBusy(false)
          abortRef.current = null
        }
      }
    },
    [config.rateLimitCooldownMs]
  )

  const recognizeItem = useCallback(
    (input: RecognizeInput) =>
      run(async (signal) => {
        const phoneOcrUpFront = config.enableOnDeviceOCR && (config.onDeviceOcrMode === 'always' || Date.now() < ocrDownUntil.current)
        let payload = input
        if (phoneOcrUpFront && payload.image && !payload.text?.length) {
          payload = { ...payload, text: await readTextOnDevice(payload.image) }
        }
        return recognize((c) => requestRef.current(c), payload, {
          signal,
          timeout: config.requestTimeoutMs,
          recompress: (img) =>
            recompressSmaller(img, { maxEdge: config.maxUploadEdgePx, quality: config.jpegQuality, maxBytes: config.maxUploadBytes }),
          onDeviceText: config.enableOnDeviceOCR ? readTextOnDevice : undefined,
          onServerOcrDown: () => {
            ocrDownUntil.current = Date.now() + config.onDeviceOcrDegradedMs
            setPhoneOcr(true)
          },
        })
      }),
    [run, config]
  )

  const lookup = useCallback((code: string) => run((signal) => lookupBarcode((c) => requestRef.current(c), code, signal)), [run])

  // True while scans use phone-side OCR (server OCR down, or 'always' mode).
  const usingPhoneOcr = config.enableOnDeviceOCR && (config.onDeviceOcrMode === 'always' || (phoneOcr && Date.now() < ocrDownUntil.current))

  return { busy, cooldownUntil, usingPhoneOcr, recognizeItem, lookup, cancelAll }
}
