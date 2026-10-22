'use client'

// Live-preview helpers: scan-frame geometry, cheap change detection, and the
// browser's on-device detectors (Shape Detection API).

export type Region = { width: number; height: number }
export type SourceRect = { sx: number; sy: number; w: number; h: number }

export const isVideoReady = (video: HTMLVideoElement | null): video is HTMLVideoElement =>
  !!video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0

// Rectangle (in video pixels) under the on-screen scan frame. The preview uses
// object-fit: cover, so the visible part of the video is computed first and the
// frame fraction applied to that — what the cashier sees in the frame is
// exactly what gets sent.
export const scanRect = (video: HTMLVideoElement, container: HTMLElement | null, region: Region): SourceRect => {
  const vw = video.videoWidth
  const vh = video.videoHeight
  let visW = vw
  let visH = vh
  if (container && container.clientWidth > 0 && container.clientHeight > 0) {
    const scale = Math.max(container.clientWidth / vw, container.clientHeight / vh)
    visW = Math.min(vw, container.clientWidth / scale)
    visH = Math.min(vh, container.clientHeight / scale)
  }
  const w = Math.round(visW * region.width)
  const h = Math.round(visH * region.height)
  return { sx: Math.round((vw - w) / 2), sy: Math.round((vh - h) / 2), w, h }
}

// 24×24 grayscale thumbnail of the scan frame, for auto-capture's
// "something new arrived and is now holding still" check.
const SIG = 24
let sigCanvas: HTMLCanvasElement | null = null

export const frameSignature = (video: HTMLVideoElement, rect: SourceRect): Uint8Array | null => {
  sigCanvas ??= document.createElement('canvas')
  sigCanvas.width = SIG
  sigCanvas.height = SIG
  const ctx = sigCanvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(video, rect.sx, rect.sy, rect.w, rect.h, 0, 0, SIG, SIG)
  const { data } = ctx.getImageData(0, 0, SIG, SIG)
  const out = new Uint8Array(SIG * SIG)
  for (let i = 0; i < out.length; i++) out[i] = (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) / 1000
  return out
}

// Mean absolute luminance difference, 0..1.
export const frameDifference = (a: Uint8Array | null, b: Uint8Array | null): number => {
  if (!a || !b || a.length !== b.length) return 1
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i])
  return sum / a.length / 255
}

// ── Barcode (BarcodeDetector) ───────────────────────────────────────────────
// Chrome/Edge on Android, ChromeOS and macOS. Not in iOS Safari, Firefox or
// Chrome on Windows — there the server decodes barcodes from the photo.

type DetectedBarcode = { rawValue: string; format: string }
type BarcodeDetectorLike = { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> }

const RETAIL_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code']

let barcodeDetector: Promise<BarcodeDetectorLike | null> | null = null

export const getBarcodeDetector = (): Promise<BarcodeDetectorLike | null> => {
  barcodeDetector ??= (async () => {
    const Ctor = (globalThis as any).BarcodeDetector
    if (!Ctor) return null
    try {
      const supported: string[] = (await Ctor.getSupportedFormats?.()) ?? RETAIL_FORMATS
      const formats = RETAIL_FORMATS.filter((f) => supported.includes(f))
      return formats.length > 0 ? (new Ctor({ formats }) as BarcodeDetectorLike) : null
    } catch {
      return null
    }
  })()
  return barcodeDetector
}

// Codes the backend accepts: 1–64 printable ASCII characters.
export const isValidBarcode = (code: string) => /^[\x21-\x7E]{1,64}$/.test(code)

export const detectBarcode = async (source: CanvasImageSource): Promise<string | null> => {
  const detector = await getBarcodeDetector()
  if (!detector) return null
  try {
    const codes = await detector.detect(source)
    const code = codes.map((c) => c.rawValue?.trim()).find((v) => v && isValidBarcode(v))
    return code ?? null
  } catch {
    return null
  }
}

// ── Text (TextDetector) ─────────────────────────────────────────────────────
// Experimental: Chrome with the "Experimental Web Platform features" flag, and
// some Chromium-based POS devices. When present, its lines are sent as `text`
// alongside the photo so recognition still works if server OCR is down (503).

type TextDetectorLike = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> }

let textDetector: TextDetectorLike | null | undefined

export const hasTextDetector = () => {
  if (textDetector === undefined) {
    const Ctor = (globalThis as any).TextDetector
    try {
      textDetector = Ctor ? (new Ctor() as TextDetectorLike) : null
    } catch {
      textDetector = null
    }
  }
  return !!textDetector
}

export const detectText = async (source: CanvasImageSource): Promise<string[]> => {
  if (!hasTextDetector()) return []
  try {
    return (await textDetector!.detect(source)).map((t) => t.rawValue?.trim()).filter(Boolean)
  } catch {
    return []
  }
}
