// How the real-estate screens react to API errors (see the error contract in
// BACKEND_REQUIREMENTS.md §6). 4xx answers are final: never retried.

import { apiErrorMessage, apiStatus } from '@/lib/api-error'

export type LoadErrorKind =
  // Session predates tenant binding → sign in again.
  | 'rebind'
  // "unknown tenant" / "tenant mismatch" → the business isn't reachable right now.
  | 'unavailable'
  // 403 "Forbidden": missing permission for that section only.
  | 'forbidden'
  // Network failure or 5xx.
  | 'server'
  // Any other 4xx.
  | 'request'

export const classifyLoadError = (err: unknown): LoadErrorKind => {
  const status = apiStatus(err)
  const msg = apiErrorMessage(err, '')
  if ((status === 401 || status === 403) && /not bound to a tenant/i.test(msg)) return 'rebind'
  if (status === 403 && /unknown tenant|tenant mismatch/i.test(msg)) return 'unavailable'
  if (status === 403) return 'forbidden'
  if (status === undefined || status >= 500) return 'server'
  return 'request'
}

export const UNAVAILABLE_MESSAGE = 'This business isn’t available right now. Please try again in a moment or contact support.'
export const NO_ACCESS_MESSAGE = 'You don’t have access to this section.'

export const loadErrorMessage = (err: unknown): string => {
  switch (classifyLoadError(err)) {
    case 'rebind':
      return 'Your session needs to be renewed. Signing you out…'
    case 'unavailable':
      return UNAVAILABLE_MESSAGE
    case 'forbidden':
      return NO_ACCESS_MESSAGE
    case 'server':
      return apiStatus(err) === undefined
        ? 'Couldn’t reach Sellix. Check your connection and try again.'
        : apiErrorMessage(err, 'Something went wrong on our side. Please try again.')
    default:
      return apiErrorMessage(err, 'Couldn’t load your properties.')
  }
}

// Only network errors and 5xx are worth retrying, at most twice.
export const MAX_RETRIES = 2
export const shouldRetry = (failureCount: number, err: unknown) => failureCount < MAX_RETRIES && classifyLoadError(err) === 'server'
export const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 8000)

// Errors a form or dialog shows inline, keeping itself open.
export const isFormError = (err: unknown) => [400, 409, 422].includes(apiStatus(err) ?? 0)
