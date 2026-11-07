const pad = (n) => String(n).padStart(2, '0')

// Today as YYYY-MM-DD in the browser's local time. toISOString() would give
// the UTC date, which is already "tomorrow" or still "yesterday" for part of the day.
export function todayString() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// '2026-01-15' -> '15 Jan 2026'. Built from local parts, so no time zone shift.
export function formatDate(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
