// Date ranges for the /stats endpoints.
//
// The backend parses a bare "YYYY-MM-DD" as midnight at the start of that day,
// so `to=2026-10-31` would leave out all of the 31st. Date pickers mean whole
// days: send the start of `from` and the end of `to`, in the user's time zone.

const parts = (ymd: string) => ymd.split('-').map(Number) as [number, number, number]

export const startOfDayIso = (ymd: string) => {
  const [y, m, d] = parts(ymd)
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString()
}

export const endOfDayIso = (ymd: string) => {
  const [y, m, d] = parts(ymd)
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString()
}

export const rangeParams = (from?: string, to?: string) => ({
  ...(from ? { from: startOfDayIso(from) } : {}),
  ...(to ? { to: endOfDayIso(to) } : {}),
})

// "YYYY-MM-DD" in local time (toISOString would shift late-evening dates in UTC+ zones).
export const localYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
