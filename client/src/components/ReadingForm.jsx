import { useState } from 'react'
import { SLOTS } from '../slots.js'
import { todayString } from '../dates.js'

// `reading` is null for "add" and the reading being edited for "edit".
// `onSubmit(values)` should throw on failure; its message is shown here.
function ReadingForm({ reading, onSubmit, onCancel }) {
  const isEditing = reading !== null

  const [date, setDate] = useState(reading ? reading.date : todayString())
  const [slot, setSlot] = useState(reading ? reading.slot : '')
  const [value, setValue] = useState(reading ? String(reading.value) : '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)

    try {
      await onSubmit({ date, slot, value })
      if (!isEditing) {
        setDate(todayString())
        setSlot('')
        setValue('')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // noValidate: the browser must not block the submit, so the server's own
  // messages are what the user sees. The inputs have no min, max or required.
  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="reading-date">Date</label>
        <input
          id="reading-date"
          type="date"
          max={todayString()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="reading-slot">Time of day</label>
        <select
          id="reading-slot"
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
        >
          <option value="">Choose a time</option>
          {SLOTS.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="reading-value">Glucose (mg/dl)</label>
        <input
          id="reading-value"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-describedby="value-hint"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 120"
        />
        <p id="value-hint" className="muted">
          Whole number from 40 to 600.
        </p>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add reading'}
        </button>
        {isEditing && (
          <button type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default ReadingForm
