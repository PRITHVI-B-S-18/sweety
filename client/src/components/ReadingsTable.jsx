import { slotLabel } from '../slots.js'
import { formatDate } from '../dates.js'

function ReadingsTable({ readings, editingId, busyId, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time of day</th>
            <th>Glucose</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((reading) => {
            const label = slotLabel(reading.slot)
            const date = formatDate(reading.date)
            const busy = busyId === reading.id
            return (
              <tr
                key={reading.id}
                className={editingId === reading.id ? 'editing' : undefined}
              >
                <td>{date}</td>
                <td>{label}</td>
                <td>{reading.value} mg/dl</td>
                <td>
                  <div className="actions">
                    <button
                      type="button"
                      onClick={() => onEdit(reading)}
                      disabled={busy}
                      aria-label={`Edit ${label} reading on ${date}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(reading)}
                      disabled={busy}
                      aria-label={`Delete ${label} reading on ${date}`}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default ReadingsTable
