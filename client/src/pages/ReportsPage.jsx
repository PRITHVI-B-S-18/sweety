import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { todayString } from '../dates.js'
import ReportCard from '../components/ReportCard.jsx'

const TYPES = ['daily', 'month-to-date', 'monthly']

function ReportsPage() {
  const [date, setDate] = useState(todayString())
  const [reports, setReports] = useState(null) // null until loaded
  const [error, setError] = useState('')

  const latestRequest = useRef(0)

  // Only the newest request may update the state,
  // so a slow response for an earlier date can never overwrite the reports for the current one.
  useEffect(() => {
    // Increment first, so clearing the date also discards any request in flight
    const requestId = ++latestRequest.current
    if (!date) return

    Promise.all(TYPES.map((type) => api(`/reports/${type}?date=${date}`)))
      .then(([daily, monthToDate, monthly]) => {
        if (requestId !== latestRequest.current) return
        setReports({ daily, monthToDate, monthly })
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
