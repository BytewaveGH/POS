'use client'

import React, { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Camera, ImagePlus, Loader2, Minus, Pause, Play, ScanLine, Search, ShoppingCart, X, Zap, ZapOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CartItem, CustomerType, Product, SellingUnit } from '../../_logics/types'
import { piecesHint } from '../../_logics/types'
import { RECOGNITION_CONFIG } from '../../_logics/scanner/config'
import { useCamera } from '../../_logics/scanner/use-camera'
import { useLiveScan } from '../../_logics/scanner/use-live-scan'
import { useRecognitionRequests } from '../../_logics/scanner/use-recognition-requests'
import { RecognitionError, type RecognizeInput } from '../../_logics/scanner/recognition'
import { compressFile, compressVideoRegion } from '../../_logics/scanner/image'
import { detectBarcode, isVideoReady, scanRect } from '../../_logics/scanner/frame'
import { releaseOnDeviceOcr, warmUpOnDeviceOcr } from '../../_logics/scanner/on-device-ocr'
import { primeFeedback } from '../../_logics/scanner/feedback'
import { CameraErrorView, ProductThumb } from './scanner-panels'
import { useRecognitionFlow, type CommittedItem } from './use-recognition-flow'

const CFG = RECOGNITION_CONFIG
const COMPRESS = { maxEdge: CFG.maxUploadEdgePx, quality: CFG.jpegQuality, maxBytes: CFG.maxUploadBytes }
const AUTO_KEY = 'sellix-scanner-auto-capture'

type Status = { kind: 'ready' } | { kind: 'added'; name: string } | { kind: 'error'; text: string }

type Props = {
  open: boolean
  onClose: () => void
  products: Product[]
  cart: CartItem[]
  customerType: CustomerType
  cartTotal: number
  onAdd: (product: Product, unit: SellingUnit) => void
  onUpdateQty: (cartId: string, delta: number) => void
  onReviewCart: () => void
}

const ProductScanner = ({ open, onClose, products, cart, customerType, cartTotal, onAdd, onUpdateQty, onReviewCart }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const camera = useCamera(videoRef)
  const requests = useRecognitionRequests(CFG)

  const [paused, setPaused] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [status, setStatus] = useState<Status>({ kind: 'ready' })
  const [recent, setRecent] = useState<CommittedItem[]>([])
  const [autoCapture, setAutoCapture] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTO_KEY)
      return saved === null ? CFG.autoCaptureDefault : saved === 'true'
    } catch {
      return CFG.autoCaptureDefault
    }
  })

  const flow = useRecognitionFlow({
    products,
    customerType,
    onAdd,
    onUndo: (cartId) => onUpdateQty(cartId, -1),
    onCommitted: (item) => {
      setStatus({ kind: 'added', name: item.product.name })
      setRecent((prev) => [item, ...prev.filter((r) => r.cartId !== item.cartId)].slice(0, 12))
    },
  })

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const qtyOf = (cartId: string) => cart.find((i) => i.cartId === cartId)?.quantity ?? 0
  const cameraReady = camera.state.status === 'ready'
  const working = requests.busy || capturing

  // ── Session lifecycle ───────────────────────────────────────────────────
  const { start: startCamera, stop: stopCamera } = camera
  const { cancelAll } = requests
  const closePromptRef = useRef(flow.closePrompt)
  closePromptRef.current = flow.closePrompt
  useEffect(() => {
    if (!open) return
    primeFeedback()
    setRecent([])
    setPaused(false)
    setStatus({ kind: 'ready' })
    void startCamera()
    // Without server OCR every scan needs the phone engine — load it now.
    if (CFG.enableOnDeviceOCR && CFG.onDeviceOcrMode === 'always') warmUpOnDeviceOcr()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      // Closing: abort in-flight recognition, release the camera, drop prompts.
      cancelAll()
      stopCamera()
      closePromptRef.current()
      // Frees the OCR engine's memory; its language data stays cached for next time.
      void releaseOnDeviceOcr()
      document.body.style.overflow = prevOverflow
    }
  }, [open, startCamera, stopCamera, cancelAll])

  // ── Recognition ─────────────────────────────────────────────────────────
  const run = async (prepare: () => Promise<RecognizeInput>) => {
    setCapturing(true)
    try {
      const result = await requests.recognizeItem(await prepare())
      if (result) flow.handleResult(result)
    } catch (err) {
      const e = err instanceof RecognitionError ? err : null
      if (e?.kind === 'bad-request') console.error('Recognition request had nothing to send', err)
      setStatus({ kind: 'error', text: e?.message ?? 'Recognition failed, try again.' })
    } finally {
      setCapturing(false)
    }
  }

  // Still frame from the live preview, plus an on-device barcode when available.
  // Phone-side OCR (when needed) runs on the compressed photo in useRecognitionRequests.
  const captureFromCamera = () => {
    const video = videoRef.current
    if (!isVideoReady(video) || working) return
    live.markCaptured()
    void run(async () => {
      const image = await compressVideoRegion(video, scanRect(video, containerRef.current, CFG.scanRegion), COMPRESS)
      if (!image) throw new RecognitionError('too-large', 'Photo too large.')
      const barcode = CFG.enableOnDeviceBarcode ? await detectBarcode(video) : null
      return { image, barcode: barcode ?? undefined }
    })
  }

  // Fallback: the native camera app / photo library via <input type="file">.
  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // don't keep the file around
    if (!file) return
    void run(async () => {
      const image = await compressFile(file, COMPRESS).catch(() => {
        throw new RecognitionError('unreadable', 'Couldn’t read that photo, try again.')
      })
      if (!image) throw new RecognitionError('too-large', 'Photo too large.')
      return { image }
    })
  }

  const onBarcode = async (code: string) => {
    setCapturing(true)
    try {
      const result = await requests.lookup(code)
      if (result) flow.handleResult(result)
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof RecognitionError ? err.message : 'Barcode lookup failed.' })
    } finally {
      setCapturing(false)
    }
  }

  const live = useLiveScan({
    videoRef,
    containerRef,
    enabled: open && cameraReady && !paused && !flow.prompt && !working,
    autoCapture,
    config: CFG,
    onBarcode: (code) => void onBarcode(code),
    onAutoCapture: captureFromCamera,
  })

  const toggleAuto = () => {
    setAutoCapture((v) => {
      try {
        localStorage.setItem(AUTO_KEY, String(!v))
      } catch {}
      return !v
    })
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (flow.prompt) flow.closePrompt()
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, flow, onClose])

  if (!open) return null

  const coolingDown = requests.cooldownUntil > Date.now()
  const renderStatus = () => {
    if (working) return <StatusPill tone="neutral" icon={<Loader2 className="h-4 w-4 animate-spin" />} text="Identifying…" />
    if (paused) return <StatusPill tone="neutral" icon={<Pause className="h-4 w-4" />} text="Scanning paused" />
    if (status.kind === 'added')
      return <StatusPill tone="success" icon={<ScanLine className="h-4 w-4" />} text={`Added ${status.name} — next item`} />
    if (status.kind === 'error') return <StatusPill tone="error" icon={<AlertTriangle className="h-4 w-4" />} text={status.text} />
    return (
      <StatusPill
        tone="neutral"
        icon={<ScanLine className="h-4 w-4" />}
        text={autoCapture ? 'Hold the item steady in the frame' : 'Frame the item, then tap the button'}
      />
    )
  }

  const cameraError = camera.state.status === 'error' ? camera.state : null
  const recentInCart = recent.filter((r) => qtyOf(r.cartId) > 0)

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col select-none" role="dialog" aria-modal="true" aria-label="Product scanner">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChosen}
      />

      {/* ── Top bar ── */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-6 bg-gradient-to-b from-black/70 to-transparent">
        <RoundButton onClick={onClose} label="Close scanner">
          <X className="h-5 w-5" />
        </RoundButton>
        <button
          onClick={toggleAuto}
          disabled={!cameraReady}
          aria-pressed={autoCapture}
          className={cn(
            'h-9 px-3 rounded-full text-xs font-bold transition-colors disabled:opacity-40',
            autoCapture ? 'bg-cornflowerBlue text-white' : 'bg-white/15 text-white'
          )}
        >
          Auto {autoCapture ? 'on' : 'off'}
        </button>
        {requests.usingPhoneOcr && (
          <span
            title="Server text recognition is unavailable — text is being read on this device"
            className="h-7 px-2.5 rounded-full bg-amber-400/90 text-black text-[10px] font-bold flex items-center"
          >
            Phone OCR
          </span>
        )}
        <div className="flex gap-2">
          {camera.state.status === 'ready' && camera.state.torchSupported && (
            <RoundButton
              onClick={() => void camera.setTorch(!camera.torchOn)}
              label={camera.torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
              active={camera.torchOn}
            >
              {camera.torchOn ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
            </RoundButton>
          )}
          <RoundButton onClick={() => setPaused((p) => !p)} label={paused ? 'Resume scanning' : 'Pause scanning'} disabled={!cameraReady}>
            {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </RoundButton>
        </div>
      </div>

      {/* ── Camera preview ── */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-cover" />

        {cameraReady && (
          <>
            {/* Only the area inside the frame is sent */}
            <div
              className={cn(
                'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-3xl pointer-events-none transition-colors duration-300',
                'shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] border-2',
                status.kind === 'added' ? 'border-green-400' : paused ? 'border-white/30' : 'border-white/80'
              )}
              style={{ width: `${CFG.scanRegion.width * 100}%`, height: `${CFG.scanRegion.height * 100}%` }}
            >
              {working && (
                <div className="absolute inset-x-6 h-0.5 bg-cornflowerBlue/80 shadow-[0_0_12px_2px_rgba(89,176,242,0.6)] animate-scanline" />
              )}
            </div>
            <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-3">{renderStatus()}</div>
          </>
        )}

        {camera.state.status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
            <Loader2 className="h-7 w-7 animate-spin" />
            <p className="text-sm">Starting camera…</p>
          </div>
        )}

        {cameraError && (
          <CameraErrorView
            message={cameraError.message}
            canRetry={cameraError.kind !== 'insecure' && cameraError.kind !== 'unsupported'}
            onRetry={() => void camera.start()}
            onSearch={() => flow.openSearch()}
            onTakePhoto={() => fileRef.current?.click()}
          />
        )}
      </div>

      {/* ── Recent scans + actions ── */}
      <div className="z-20 bg-black px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
        {recentInCart.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-3 px-3">
            {recentInCart.map((r) => {
              const pcs = piecesHint(r.unit.baseQuantity)
              return (
                <div
                  key={r.cartId}
                  className="flex-shrink-0 flex items-center gap-2 bg-white/10 rounded-2xl pl-1.5 pr-1 py-1.5 max-w-[230px]"
                >
                  <ProductThumb src={r.product.imageUrl} name={r.product.name} className="w-9 h-9 rounded-lg bg-white/10" />
                  <div className="min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{r.product.name}</p>
                    <p className="text-white/60 text-[11px] truncate">
                      {r.unit.label}
                      {pcs ? ` (${pcs})` : ''} · ×{qtyOf(r.cartId)}
                    </p>
                  </div>
                  <button
                    onClick={() => onUpdateQty(r.cartId, -1)}
                    aria-label={`Remove one ${r.product.name}`}
                    className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center flex-shrink-0 active:bg-white/20"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex items-center gap-2">
          <SideButton onClick={() => flow.openSearch()} label="Search">
            <Search className="h-5 w-5" />
          </SideButton>
          <SideButton onClick={() => fileRef.current?.click()} label="Photo" disabled={working}>
            <ImagePlus className="h-5 w-5" />
          </SideButton>
          {/* Shutter */}
          <button
            onClick={captureFromCamera}
            disabled={!cameraReady || paused || working || coolingDown}
            aria-label="Identify item"
            className="mx-auto w-[72px] h-[72px] rounded-full border-4 border-white/80 flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
          >
            <span className="w-[56px] h-[56px] rounded-full bg-white flex items-center justify-center text-stone-800">
              {working ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
            </span>
          </button>
          <button
            onClick={onReviewCart}
            className={cn(
              'h-14 min-w-[112px] px-3 rounded-2xl font-semibold text-xs flex flex-col items-center justify-center transition-colors',
              cartCount > 0 ? 'bg-endeavour text-white active:bg-veniceBlue' : 'bg-white/10 text-white/60'
            )}
          >
            <span className="flex items-center gap-1.5">
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 ? `${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Cart empty'}
            </span>
            {cartCount > 0 && <span className="font-bold text-sm">≈ ₵{cartTotal.toFixed(2)}</span>}
          </button>
        </div>
      </div>

      {flow.prompts}
    </div>
  )
}

// ── Small presentational helpers ────────────────────────────────────────────

const RoundButton = ({
  children,
  onClick,
  label,
  active,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  active?: boolean
  disabled?: boolean
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    disabled={disabled}
    className={cn(
      'w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors disabled:opacity-40',
      active ? 'bg-amber-400 text-black' : 'bg-white/15 text-white active:bg-white/30'
    )}
  >
    {children}
  </button>
)

const SideButton = ({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  disabled?: boolean
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-14 h-14 rounded-2xl bg-white/10 text-white text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5 active:bg-white/20 disabled:opacity-40"
  >
    {children}
    {label}
  </button>
)

const PILL_TONES = {
  neutral: 'bg-black/60 text-white',
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
} as const

const StatusPill = ({ tone, icon, text }: { tone: keyof typeof PILL_TONES; icon: React.ReactNode; text: string }) => (
  <div
    role="status"
    aria-live="polite"
    className={cn('flex items-center gap-2 rounded-full px-3 py-2 backdrop-blur-md shadow-lg max-w-full min-h-[40px]', PILL_TONES[tone])}
  >
    <span className="flex-shrink-0">{icon}</span>
    <span className="text-sm font-semibold truncate">{text}</span>
  </div>
)

export default ProductScanner
