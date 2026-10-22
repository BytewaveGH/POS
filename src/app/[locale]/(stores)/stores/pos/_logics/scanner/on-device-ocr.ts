'use client'

// Phone-side OCR, sent to the server as the `text` field so recognition keeps
// working when server OCR is unavailable (or not configured at all).
//
// Engines, in order:
// 1. The browser's TextDetector (Shape Detection API) — fast and free, but
//    only in Chromium with an experimental flag.
// 2. tesseract.js (WASM) — works everywhere. Loaded lazily on first use: the
//    library code (~2 MB) and the language data (~10 MB for English) are
//    downloaded once, then the language data is cached in IndexedDB.
//
// Images never leave the device through this module; only text is returned.

import { RECOGNITION_CONFIG } from './config'
import { detectText, hasTextDetector } from './frame'

type TesseractWorker = {
  recognize: (image: Blob) => Promise<{ data: { text: string; lines?: { text: string; confidence: number }[] } }>
  setParameters: (params: Record<string, string>) => Promise<unknown>
  terminate: () => Promise<unknown>
}

let workerPromise: Promise<TesseractWorker | null> | null = null
let busy = false

const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      () => {
        clearTimeout(t)
        resolve(fallback)
      }
    )
  })

const createTesseract = async (): Promise<TesseractWorker | null> => {
  try {
    const { createWorker, OEM, PSM } = await import('tesseract.js')
    const base = RECOGNITION_CONFIG.onDeviceOcrAssetsBase.replace(/\/$/, '')
    const assets = base ? { workerPath: `${base}/worker.min.js`, corePath: `${base}/core`, langPath: `${base}/lang` } : {}
    const worker = await createWorker(RECOGNITION_CONFIG.onDeviceOcrLang, OEM.LSTM_ONLY, assets)
    // Packaging is scattered words, not paragraphs.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })
    return worker as unknown as TesseractWorker
  } catch (err) {
    console.warn('[scanner] on-device OCR engine failed to load', err)
    return null
  }
}

// Starts loading the engine in the background (no-op if already loading).
export const warmUpOnDeviceOcr = () => {
  if (!RECOGNITION_CONFIG.enableOnDeviceOCR || hasTextDetector()) return
  if (!workerPromise) {
    workerPromise = createTesseract()
    // A failed load can be retried on the next scan.
    void workerPromise.then((w) => {
      if (!w) workerPromise = null
    })
  }
}

export const releaseOnDeviceOcr = async () => {
  const pending = workerPromise
  workerPromise = null
  const worker = await pending
  await worker?.terminate().catch(() => {})
}

// Keeps lines that look like real words: OCR on packaging produces a lot of
// noise ("|", "~~", "1:"). Low-confidence lines are dropped when the engine
// reports confidence.
export const cleanOcrLines = (lines: { text: string; confidence?: number }[], minConfidence: number): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const { text, confidence } of lines) {
    const line = text.replace(/\s+/g, ' ').trim()
    // Latin letters incl. accents (product names here are Latin-script).
    const letters = line.replace(/[^a-zA-Z\u00C0-\u024F]/g, '').length
    if (letters < 2 || letters < line.length * 0.4) continue
    if (confidence !== undefined && confidence < minConfidence) continue
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
  }
  return out
}

// Reads text from a (compressed) photo. Never throws; returns [] when the
// engine is unavailable, still busy with a previous photo, or too slow.
export const readTextOnDevice = async (image: Blob): Promise<string[]> => {
  const cfg = RECOGNITION_CONFIG
  if (!cfg.enableOnDeviceOCR) return []

  if (hasTextDetector()) {
    try {
      const bitmap = await createImageBitmap(image)
      try {
        return cleanOcrLines(
          (await detectText(bitmap)).map((text) => ({ text })),
          0
        )
      } finally {
        bitmap.close()
      }
    } catch {
      return []
    }
  }

  // One photo at a time: if the engine is still working on an earlier photo
  // (e.g. one that timed out), skip rather than queue behind it.
  if (busy) return []
  busy = true
  warmUpOnDeviceOcr()
  const worker = await withTimeout(workerPromise ?? Promise.resolve(null), cfg.onDeviceOcrLoadTimeoutMs, null)
  if (!worker) {
    busy = false
    return []
  }
  const job = worker.recognize(image)
  void job.then(
    () => (busy = false),
    () => (busy = false)
  )
  const result = await withTimeout(job, cfg.onDeviceOcrTimeoutMs, null)
  if (!result) return []
  const lines = result.data.lines?.length
    ? result.data.lines.map((l) => ({ text: l.text, confidence: l.confidence }))
    : result.data.text.split('\n').map((text) => ({ text }))
  return cleanOcrLines(lines, cfg.onDeviceOcrMinConfidence)
}
