import { SLOTS, SLOT_LABELS } from './slots.js'
import { eachDay, formatDayMonth } from './dates.js'

// One row per day in [from, to], oldest first
export function buildChartData(readings, from, to) {
  const rows = new Map(
    eachDay(from, to).map((date) => [
      date,
      { date, label: formatDayMonth(date) },
    ]),
  )

  for (const reading of readings) {
    const row = rows.get(reading.date)
    // Readings outside the range or with an unknown slot are ignored
    if (row && Object.hasOwn(SLOT_LABELS, reading.slot)) {
      row[reading.slot] = reading.value
    }
  }

  return [...rows.values()]
}

const STEPS = [20, 25, 30, 40, 50, 60, 75, 100, 125, 150]

// Five round y-axis ticks starting at 40 (the lowest value the app accepts),
// with the smallest step that reaches the highest reading. Left to itself,
// Recharts rounds the axis down to 0 and wastes a quarter of the chart.
export function yAxisTicks(rows) {
  const values = rows.flatMap((row) =>
    SLOTS.map((slot) => row[slot.key]).filter((v) => v !== undefined),
  )
  const max = values.length > 0 ? Math.max(...values) : 0
  const step = STEPS.find((s) => 40 + 4 * s >= max) ?? STEPS[STEPS.length - 1]
  return Array.from({ length: 5 }, (_, i) => 40 + i * step)
}
