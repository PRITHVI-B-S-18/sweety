import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { formatMonthYear, todayString } from '../dates.js'
import ReportCard from '../components/ReportCard.jsx'
import ReadingsChart from '../components/ReadingsChart.jsx'

const TYPES = ['daily', 'month-to-date', 'monthly']

// '2026-11-05' -> '2026-11-01'
const monthStartOf = (date) => `${date.slice(0, 7)}-01`

function ReportsPage() {
  const [date, setDate] = useState(todayString())
  const [reports, setReports] = useState(null) // null until loaded
  const [error, setError] = useState('')

  const latestRequest = useRef(0)

  // Only the newest request may update the state, so a slow response for an
  // earlier date can never overwrite the reports for the current one.
  useEffect(() => {
    // Increment first, so clearing the date also discards any request in flight
    const requestId = ++latestRequest.current
    if (!date) return

    // The month's readings load with the three reports, so everything appears
    // together and the latestRequest guard covers all four requests.
    Promise.all([
      ...TYPES.map((type) => api(`/reports/${type}?date=${date}`)),
      api(`/readings?from=${monthStartOf(date)}&to=${date}`),
    ])
      .then(([daily, monthToDate, monthly, monthReadings]) => {
        if (requestId !== latestRequest.current) return
        setReports({ daily, monthToDate, monthly, monthReadings })
        setError('')
      })
      .catch((err) => {
        if (requestId !== latestRequest.current) return
        setError(err.message)
      })
  }, [date])

  // Reset in the handler: the old cards would otherwise sit under the new date
  const handleDateChange = (e) => {
    setDate(e.target.value)
    setReports(null)
    setError('')
  }

  let content = null
  if (!date) {
    content = <p className="muted">Choose a date to see your reports.</p>
  } else if (reports === null && !error) {
    content = <p className="muted">Loading…</p>
  } else if (reports) {
    content = (
      <>
        <div className="report-grid">
          <ReportCard
            title="Daily"
            report={reports.daily}
            emptyText="No readings on this day."
          />
          <ReportCard
            title="Month to date"
            report={reports.monthToDate}
            emptyText="No readings so far this month."
          />
          <ReportCard
            title="Last month"
            report={reports.monthly}
            emptyText="No readings last month."
          />
        </div>

        <div className="card">
          <h3>This month</h3>
          <p className="muted">{formatMonthYear(date)}</p>
          <ReadingsChart
            readings={reports.monthReadings}
            from={monthStartOf(date)}
            to={date}
          />
        </div>
      </>
    )
  }

  return (
    <section>
      <h2>Reports</h2>

      <div className="card">
        <label htmlFor="report-date">Date</label>
        <input
          id="report-date"
          type="date"
          max={todayString()}
          value={date}
          onChange={handleDateChange}
        />
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {content}
    </section>
  )
}

export default ReportsPage
