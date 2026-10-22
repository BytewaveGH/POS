'use client'

// Audible + haptic confirmation when an item is added, so the cashier doesn't
// have to look at the screen. Both are best-effort: iOS has no vibrate, and
// audio needs a prior user gesture (opening the scanner counts).

let audioCtx: AudioContext | null = null

export const primeFeedback = () => {
  try {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext
    audioCtx ??= Ctor ? new Ctor() : null
    void audioCtx?.resume()
  } catch {
    audioCtx = null
  }
}

export const playAddedFeedback = () => {
  try {
    navigator.vibrate?.(60)
  } catch {}
  if (!audioCtx) return
  try {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 1320
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.13)
  } catch {}
}
