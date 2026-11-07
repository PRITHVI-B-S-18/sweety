import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import ReadingForm from '../components/ReadingForm.jsx'
import ReadingsTable from '../components/ReadingsTable.jsx'

function ReadingsPage() {
  const [readings, setReadings] = useState(null) // null until the first load finishes
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [editing, setEditing] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const formRef = useRef(null)
  const latestRequest = useRef(0)

  // Only the newest request may update the state. This covers StrictMode's
  // double effect and a reload that starts before the previous one finishes.
  const loadReadings = useCallback(async () => {
    const requestId = ++latestRequest.current
    try {
      const data = await api('/readings')
      if (requestId !== latestRequest.current) return
      setReadings(data)
      setLoadError('')
    } catch (err) {
      if (requestId !== latestRequest.current) return
      setLoadError(err.message)
    }
  }, [])

  useEffect(() => {
    loadReadings()
  }, [loadReadings])

  // The form is above the list, so bring it into view when Edit is clicked.
  useEffect(() => {
    if (editing && formRef.current?.scrollIntoView) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [editing])

  // Reload from the server after every change, so its ordering stays right.
  const handleSave = async (values) => {
    if (editing) {
      await api(`/readings/${editing.id}`, { method: 'PUT', body: values })
    } else {
      await api('/readings', { method: 'POST', body: values })
    }
    setEditing(null)
    await loadReadings()
  }

  const handleDelete = async (reading) => {
    if (!window.confirm('Delete this reading?')) return
    setActionError('')
    setBusyId(reading.id)
    try {
      await api(`/readings/${reading.id}`, { method: 'DELETE' })
      if (editing && editing.id === reading.id) setEditing(null)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
      await loadReadings()
    }
  }

  const handleEdit = (reading) => {
    setActionError('')
    setEditing(reading)
  }

  let list
  if (loadError && readings === null) {
    list = (
      <div>
        <p className="error" role="alert">
          {loadError}
        </p>
        <button type="button" onClick={loadReadings}>
          Try again
        </button>
      </div>
    )
  } else if (readings === null) {
    list = <p className="muted">Loading…</p>
  } else if (readings.length === 0) {
    list = <p className="muted">No readings yet. Add your first one above.</p>
  } else {
    list = (
      <>
        {loadError && (
          <p className="error" role="alert">
            {loadError}
          </p>
        )}
        <ReadingsTable
          readings={readings}
          editingId={editing ? editing.id : null}
          busyId={busyId}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </>
    )
  }

  return (
    <section>
      <h2>My readings</h2>

      <div className="card" ref={formRef}>
        <h3>{editing ? 'Edit reading' : 'Add a reading'}</h3>
        <ReadingForm
          key={editing ? `edit-${editing.id}` : 'new'}
          reading={editing}
          onSubmit={handleSave}
          onCancel={() => setEditing(null)}
        />
      </div>

      <div className="card">
        {actionError && (
          <p className="error" role="alert">
            {actionError}
          </p>
        )}
        {list}
      </div>
    </section>
  )
}

export default ReadingsPage
