'use client'

import { useEffect, useRef } from 'react'
import type { RecognitionConfig } from './config'
import { detectBarcode, frameDifference, frameSignature, isVideoReady, scanRect } from './frame'

type Options = {
  videoRef: React.RefObject<HTMLVideoElement>
  containerRef: React.RefObject<HTMLElement>
  // False while a request is in flight, a prompt is open, paused or closed.
  enabled: boolean
  autoCapture: boolean
  config: RecognitionConfig
  onBarcode: (code: string) => void
  onAutoCapture: () => void
}

// Lightweight loop over the live preview — never touches the network itself.
//
// Barcodes: decoded on-device every ~350 ms. The same code only fires again
// after it has left the view AND the cooldown passed, so one tin held in front
// of the camera is counted once.
//
// Auto-capture (opt-in): fires when the scene has changed noticeably since the
// last capture and has then held still for two ticks, at most once per
// autoCaptureMinIntervalMs — well under the server's per-user rate limit.
export const useLiveScan = ({ videoRef, containerRef, enabled, autoCapture, config, onBarcode, onAutoCapture }: Options) => {
  const onBarcodeRef = useRef(onBarcode)
  const onAutoCaptureRef = useRef(onAutoCapture)
  onBarcodeRef.current = onBarcode
  onAutoCaptureRef.current = onAutoCapture

  const lastCode = useRef<{ code: string; at: number; absentSince: number | null } | null>(null)
  const lastCaptureSig = useRef<Uint8Array | null>(null)
  const lastCaptureAt = useRef(0)
  const prevSig = useRef<Uint8Array | null>(null)
  const stillTicks = useRef(0)

  useEffect(() => {
    if (!enabled) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      if (stopped) return
      const video = videoRef.current
      if (!document.hidden && isVideoReady(video)) {
        let fired = false
        if (config.enableOnDeviceBarcode) {
          const code = await detectBarcode(video)
          if (stopped) return
          const now = Date.now()
          const last = lastCode.current
          if (code) {
            const isRepeat = last?.code === code && (last.absentSince === null || now - last.at < config.sameBarcodeCooldownMs)
            if (isRepeat) {
              last!.absentSince = null
            } else {
              lastCode.current = { code, at: now, absentSince: null }
              // The caller disables the loop (enabled=false) while it looks the code up.
              onBarcodeRef.current(code)
              fired = true
            }
          } else if (last && last.absentSince === null) {
            last.absentSince = now
          }
        }

        if (autoCapture && !fired) {
          const sig = frameSignature(video, scanRect(video, containerRef.current, config.scanRegion))
          const motion = frameDifference(sig, prevSig.current)
          prevSig.current = sig
          stillTicks.current = motion < config.frameStillThreshold ? stillTicks.current + 1 : 0
          const isNewScene = frameDifference(sig, lastCaptureSig.current) >= config.frameChangeThreshold
          const due = Date.now() - lastCaptureAt.current >= config.autoCaptureMinIntervalMs
          if (isNewScene && stillTicks.current >= 2 && due) {
            lastCaptureSig.current = sig
            lastCaptureAt.current = Date.now()
            stillTicks.current = 0
            onAutoCaptureRef.current()
          }
        }
      }
      timer = setTimeout(() => void tick(), config.barcodeScanIntervalMs)
    }

    timer = setTimeout(() => void tick(), 200)
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [enabled, autoCapture, config, videoRef, containerRef])

  // Called after a manual capture so auto-capture doesn't immediately re-shoot the same scene.
  const markCaptured = () => {
    const video = videoRef.current
    if (isVideoReady(video)) lastCaptureSig.current = frameSignature(video, scanRect(video, containerRef.current, config.scanRegion))
    lastCaptureAt.current = Date.now()
  }

  return { markCaptured }
}
