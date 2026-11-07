import { formatDate } from '../dates.js'
import { slotLabel } from '../slots.js'

// `report` is exactly what GET /reports/:type returns.
// Only the daily report has a `readings` list.
function ReportCard({ title, report, emptyText }) {
  const period =
    report.from === report.to
      ? formatDate(report.from)
      : `${formatDate(report.from)} – ${formatDate(report.to)}`

  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="muted">{period}</p>

      {report.count === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <>
          <dl className="stats">
            <div>
              <dt>Highest</dt>
              <dd>{report.highest} mg/dl</dd>
            </div>
            <div>
              <dt>Lowest</dt>
              <dd>{report.lowest} mg/dl</dd>
            </div>
            <div>
              <dt>Average</dt>
              {/* toFixed keeps 120 displayed as 120.0 */}
              <dd>{report.average.toFixed(1)} mg/dl</dd>
            </div>
            <div>
              <dt>Readings</dt>
              <dd>{report.count}</dd>
            </div>
          </dl>

          {report.readings && (
            <ul className="report-readings">
              {report.readings.map((reading) => (
                <li key={reading.id}>
                  {slotLabel(reading.slot)}: {reading.value} mg/dl
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export default ReportCard
