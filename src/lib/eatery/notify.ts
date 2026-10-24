'use client'

// Getting someone's attention without any sound files: a short Web Audio
// chime, a system notification when allowed, and a vibration on phones.
// Every call is best-effort and silently does nothing where unsupported.

let ctx: AudioContext | null = null

export const chime = (kind: 'new' | 'ready' = 'new') => {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    const notes = kind === 'new' ? [880, 1175] : [659, 880, 1319]
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator()
      const g = ctx!.createGain()
      o.type = 'sine'
      o.frequency.value = f
      const t = ctx!.currentTime + i * 0.16
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
      o.connect(g).connect(ctx!.destination)
      o.start(t)
      o.stop(t + 0.32)
    })
  } catch {
    // no audio
  }
}

export const canNotify = () => typeof window !== 'undefined' && 'Notification' in window
export const notifyPermission = (): NotificationPermission | 'unsupported' => (canNotify() ? Notification.permission : 'unsupported')

export const askToNotify = async () => {
  if (!canNotify()) return 'unsupported' as const
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied' as const
  }
}

export const notify = (title: string, body: string, tag?: string) => {
  try {
    if (canNotify() && Notification.permission === 'granted') new Notification(title, { body, tag })
  } catch {
    // some mobile browsers only allow notifications from a service worker
  }
  try {
    navigator.vibrate?.([180, 80, 180])
  } catch {
    // no vibration
  }
}
