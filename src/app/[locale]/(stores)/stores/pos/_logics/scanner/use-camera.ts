'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraErrorKind = 'insecure' | 'unsupported' | 'permission-denied' | 'no-camera' | 'in-use' | 'unknown'

export type CameraState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'ready'; torchSupported: boolean }
  | { status: 'error'; kind: CameraErrorKind; message: string }

const CAMERA_ERROR_MESSAGES: Record<CameraErrorKind, string> = {
  insecure: 'The camera only works over a secure (https) connection.',
  unsupported: 'This browser does not support camera access. Try Chrome on Android or Safari on iOS.',
  'permission-denied': 'Camera access was blocked. Allow camera access for this site in your browser settings, then try again.',
  'no-camera': 'No camera was found on this device.',
  'in-use': 'The camera is being used by another app. Close it and try again.',
  unknown: 'The camera could not be started.',
}

const classifyError = (err: unknown): CameraErrorKind => {
  const name = (err as DOMException)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission-denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return 'no-camera'
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'in-use'
  return 'unknown'
}

const cameraError = (kind: CameraErrorKind): CameraState => ({ status: 'error', kind, message: CAMERA_ERROR_MESSAGES[kind] })

// Opens the rear camera into a <video>, exposes torch control, and always
// releases the camera on stop/unmount (important on iOS, where a leaked track
// keeps the camera indicator on and blocks the next getUserMedia call).
export const useCamera = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const [state, setState] = useState<CameraState>({ status: 'idle' })
  const [torchOn, setTorchOn] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  // Bumped on every start/stop so a slow getUserMedia from a previous open
  // can't attach its stream after the scanner was closed.
  const generation = useRef(0)

  const stop = useCallback(() => {
    generation.current++
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setTorchOn(false)
    setState({ status: 'idle' })
  }, [videoRef])

  const start = useCallback(async () => {
    const gen = ++generation.current
    if (typeof window === 'undefined') return
    if (!window.isSecureContext) return setState(cameraError('insecure'))
    if (!navigator.mediaDevices?.getUserMedia) return setState(cameraError('unsupported'))

    setState({ status: 'starting' })
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
    } catch (err) {
      // Some desktop webcams reject the resolution/facing hints entirely.
      if ((err as DOMException)?.name === 'OverconstrainedError') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        } catch (err2) {
          if (gen === generation.current) setState(cameraError(classifyError(err2)))
          return
        }
      } else {
        if (gen === generation.current) setState(cameraError(classifyError(err)))
        return
      }
    }

    if (gen !== generation.current) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }
    streamRef.current = stream
    const video = videoRef.current
    if (video) {
      video.srcObject = stream
      try {
        await video.play()
      } catch {
        // Autoplay can be refused if the element isn't muted/inline; the
        // <video> is rendered muted + playsInline so this is rare.
      }
    }
    const track = stream.getVideoTracks()[0]
    const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean }
    if (gen === generation.current) setState({ status: 'ready', torchSupported: !!caps.torch })
  }, [videoRef])

  const setTorch = useCallback(async (on: boolean) => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] })
      setTorchOn(on)
    } catch {
      setTorchOn(false)
    }
  }, [])

  useEffect(() => () => stop(), [stop])

  return { state, start, stop, torchOn, setTorch }
}
