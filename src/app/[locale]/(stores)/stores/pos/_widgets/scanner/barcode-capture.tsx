'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Loader2, ScanBarcode, X } from 'lucide-react'
import { useCamera } from '../../_logics/scanner/use-camera'
import { detectBarcode, isVideoReady } from '../../_logics/scanner/frame'

// Small camera overlay that reads one barcode and hands it back — used to fill
// barcode fields in product management. Only rendered where the browser has a
// native BarcodeDetector (Chrome on Android/macOS/ChromeOS).
export const supportsBarcodeCapture = () => typeof globalThis !== 'undefined' && 'BarcodeDetector' in globalThis

const CaptureOverlay = ({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const camera = useCamera(videoRef)
  const { start, stop } = camera

  useEffect(() => {
    void start()
    return () => stop()
  }, [start, stop])

  useEffect(() => {
    if (camera.state.status !== 'ready') return
    let stopped = false
    const tick = async () => {
      if (stopped) return
      const video = videoRef.current
      const code = isVideoReady(video) ? await detectBarcode(video) : null
      if (stopped) return
      if (code) {
        onCode(code)
        onClose()
        return
      }
      setTimeout(() => void tick(), 300)
    }
    void tick()
    return () => {
      stopped = true
    }
  }, [camera.state.status, onCode, onClose])

  return (
    <div className="fixed inset-0 z-[80] bg-black flex flex-col" role="dialog" aria-label="Scan barcode">
      <video ref={videoRef} playsInline muted autoPlay className="flex-1 w-full object-cover" />
      <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-32 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] pointer-events-none" />
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white">
        <span className="text-sm font-semibold flex items-center gap-2">
          {camera.state.status === 'ready' ? <ScanBarcode className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
          {camera.state.status === 'error' ? camera.state.message : 'Point at the barcode'}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export const BarcodeCaptureButton = ({ onCode, className }: { onCode: (code: string) => void; className?: string }) => {
  const [open, setOpen] = useState(false)
  const [supported, setSupported] = useState(false)
  useEffect(() => setSupported(supportsBarcodeCapture()), [])
  if (!supported) return null
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Scan barcode with camera" className={className}>
        <ScanBarcode className="h-4 w-4" />
      </button>
      {open && <CaptureOverlay onCode={onCode} onClose={() => setOpen(false)} />}
    </>
  )
}
