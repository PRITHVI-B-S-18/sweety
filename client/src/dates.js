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

// Every day from `from` to `to` inclusive, as YYYY-MM-DD strings. Steps in UTC
// (like the server's seed script), so daylight saving can't skip or repeat a day.
export function eachDay(from, to) {
  const days = []
  const day = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  for (; day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    days.push(day.toISOString().slice(0, 10))
  }
  return days
}

// '2026-11-05' -> '5 Nov'
export function formatDayMonth(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

// '2026-11-05' -> 'November 2026'
export function formatMonthYear(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
}
