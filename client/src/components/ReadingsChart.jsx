import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SLOTS } from '../slots.js'
import { buildChartData, yAxisTicks } from '../chartData.js'
import { formatDate } from '../dates.js'

// One per slot, in SLOTS order: pink (the theme), blue, green, orange
const COLORS = ['#c2185b', '#1565c0', '#2e7d32', '#ef6c00']

// Recharts sorts legend and tooltip entries by name unless told otherwise.
// Time-of-day order is the meaningful one, so keep the order of SLOTS.
const slotOrder = (item) => SLOTS.findIndex((slot) => slot.key === item.dataKey)

function ReadingsChart({ readings, from, to }) {
  const rows = buildChartData(readings, from, to)
  const ticks = yAxisTicks(rows)
  const hasReadings = rows.some((row) =>
    SLOTS.some((slot) => row[slot.key] !== undefined),
  )

  if (!hasReadings) {
    return <p className="muted">No readings to chart this month.</p>
  }

  return (
    <div
      role="img"
      aria-label="Line chart of this month's glucose readings by time of day"
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" minTickGap={16} />
          <YAxis
            domain={[ticks[0], ticks[ticks.length - 1]]}
            ticks={ticks}
            unit=" mg/dl"
            width={80}
          />
          <Tooltip
            itemSorter={slotOrder}
            formatter={(value) => `${value} mg/dl`}
            labelFormatter={(label, payload) =>
              payload && payload.length
                ? formatDate(payload[0].payload.date)
                : label
            }
          />
          <Legend itemSorter={null} />
          {SLOTS.map((slot, i) => (
            <Line
              key={slot.key}
              dataKey={slot.key}
              name={slot.label}
              stroke={COLORS[i]}
              connectNulls
              dot
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ReadingsChart
