// Helpers for the backend's error envelope:
//   { status: false, error: "message" }        — handler error
//   { status: false, message: "Unauthorized" } — auth / rate-limit error

export const apiStatus = (err: any): number | undefined => err?.response?.status

export const apiErrorMessage = (err: any, fallback = 'Something went wrong'): string => {
  const body = err?.response?.data
  if (typeof body?.error === 'string' && body.error) return body.error
  if (typeof body?.message === 'string' && body.message) return body.message
  return fallback
}

// Tokens issued before tenant binding (401 or 403 "session is not bound to a
// tenant") or used against another tenant (403) can't be fixed by a refresh —
// the user has to sign in again.
export const isSessionRebindError = (err: any): boolean => {
  const status = apiStatus(err)
  const msg = apiErrorMessage(err, '')
  return ((status === 401 || status === 403) && /not bound to a tenant/i.test(msg)) || (status === 403 && /tenant mismatch/i.test(msg))
}
