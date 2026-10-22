// Scanner / recognition settings. Every value can be overridden per deployment
// with a NEXT_PUBLIC_SCANNER_* env var — none of them are hard-coded in logic.

const num = (value: string | undefined, fallback: number) => {
  const n = Number(value)
  return value !== undefined && value !== '' && Number.isFinite(n) ? n : fallback
}
const bool = (value: string | undefined, fallback: boolean) => (value === undefined || value === '' ? fallback : value === 'true')

export const RECOGNITION_CONFIG = {
  // Matched results at or above this confidence are added without a tap.
  autoAddConfidence: num(process.env.NEXT_PUBLIC_SCANNER_AUTO_ADD_CONFIDENCE, 0.9),

  // Upload: longest edge, JPEG quality, hard size cap (server limit is 5 MB).
  maxUploadEdgePx: num(process.env.NEXT_PUBLIC_SCANNER_MAX_EDGE_PX, 1600),
  jpegQuality: num(process.env.NEXT_PUBLIC_SCANNER_JPEG_QUALITY, 0.8),
  maxUploadBytes: num(process.env.NEXT_PUBLIC_SCANNER_MAX_UPLOAD_BYTES, 5 * 1024 * 1024),

  // On-device helpers. Each is used only when the browser supports it.
  enableOnDeviceBarcode: bool(process.env.NEXT_PUBLIC_SCANNER_ON_DEVICE_BARCODE, true),
  enableOnDeviceOCR: bool(process.env.NEXT_PUBLIC_SCANNER_ON_DEVICE_OCR, true),
  // When to run phone-side OCR (sent to the server as `text`):
  //  'fallback' — only after server OCR answers 503, then for
  //               onDeviceOcrDegradedMs on every scan (default; no cost while
  //               server OCR works),
  //  'always'   — on every scan; for deployments without server OCR.
  onDeviceOcrMode: (process.env.NEXT_PUBLIC_SCANNER_ON_DEVICE_OCR_MODE === 'always' ? 'always' : 'fallback') as 'always' | 'fallback',
  onDeviceOcrDegradedMs: num(process.env.NEXT_PUBLIC_SCANNER_ON_DEVICE_OCR_DEGRADED_MS, 5 * 60_000),
  onDeviceOcrLang: process.env.NEXT_PUBLIC_SCANNER_ON_DEVICE_OCR_LANG || 'eng',
  // tesseract.js downloads its worker, WASM core and language data from the
  // jsDelivr CDN. To self-host, set a base URL serving worker.min.js, core/
  // (tesseract.js-core files) and lang/<lang>.traineddata.gz.
  onDeviceOcrAssetsBase: process.env.NEXT_PUBLIC_SCANNER_ON_DEVICE_OCR_ASSETS_URL || '',
  // Per photo. Slower results are dropped so a scan never hangs on the phone.
  onDeviceOcrTimeoutMs: num(process.env.NEXT_PUBLIC_SCANNER_ON_DEVICE_OCR_TIMEOUT_MS, 4000),
  // First use downloads the engine + language data (~12 MB).
  onDeviceOcrLoadTimeoutMs: num(process.env.NEXT_PUBLIC_SCANNER_ON_DEVICE_OCR_LOAD_TIMEOUT_MS, 30_000),
  // Lines below this Tesseract confidence (0–100) are dropped as noise.
  onDeviceOcrMinConfidence: num(process.env.NEXT_PUBLIC_SCANNER_ON_DEVICE_OCR_MIN_CONFIDENCE, 55),

  // Live barcode detection on the preview (free — no server OCR involved).
  barcodeScanIntervalMs: num(process.env.NEXT_PUBLIC_SCANNER_BARCODE_INTERVAL_MS, 350),
  // Same code is ignored for this long after a lookup (stops 1 tin → ×10).
  sameBarcodeCooldownMs: num(process.env.NEXT_PUBLIC_SCANNER_SAME_BARCODE_COOLDOWN_MS, 2500),

  // Auto-capture: photograph automatically when the scene changes and then
  // holds still. Off by default because every capture can use paid server OCR
  // and counts against the per-user rate limit (60/min).
  autoCaptureDefault: bool(process.env.NEXT_PUBLIC_SCANNER_AUTO_CAPTURE, false),
  autoCaptureMinIntervalMs: num(process.env.NEXT_PUBLIC_SCANNER_AUTO_CAPTURE_MIN_INTERVAL_MS, 3000),
  // Mean luminance difference (0..1) that counts as "something new in view"…
  frameChangeThreshold: num(process.env.NEXT_PUBLIC_SCANNER_FRAME_CHANGE, 0.06),
  // …and the max difference between consecutive frames that counts as "still".
  frameStillThreshold: num(process.env.NEXT_PUBLIC_SCANNER_FRAME_STILL, 0.02),

  // Client cooldown after a 429.
  rateLimitCooldownMs: num(process.env.NEXT_PUBLIC_SCANNER_RATE_LIMIT_COOLDOWN_MS, 10_000),
  // Slightly above the server's 15 s recognition timeout.
  requestTimeoutMs: num(process.env.NEXT_PUBLIC_SCANNER_TIMEOUT_MS, 20_000),
  // The one-tap confirm card hides itself after this long.
  confirmAutoDismissMs: num(process.env.NEXT_PUBLIC_SCANNER_CONFIRM_DISMISS_MS, 8000),
  // Fraction of the visible preview covered by the on-screen frame (what gets sent).
  scanRegion: { width: 0.86, height: 0.62 },
}

export type RecognitionConfig = typeof RECOGNITION_CONFIG
