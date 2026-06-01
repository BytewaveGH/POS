import type { Session } from 'next-auth'

let currentSession: Session | null = null
let isReady = false
let pendingResolvers: Array<(session: Session | null) => void> = []

export function setSession(session: Session | null): void {
  currentSession = session
  isReady = true
  if (pendingResolvers.length > 0) {
    const resolvers = pendingResolvers
    pendingResolvers = []
    resolvers.forEach((resolve) => resolve(session))
  }
}

export function getSessionSync(): Session | null {
  return currentSession
}

export function waitForSession(): Promise<Session | null> {
  if (isReady) return Promise.resolve(currentSession)
  return new Promise((resolve) => {
    pendingResolvers.push(resolve)
  })
}
