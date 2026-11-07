import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { register, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // After every hook, so the hook order never changes between renders
  if (isAuthenticated) {
    return <Navigate to="/readings" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)

    try {
      // register() logs the user in as well
      await register(name, email, password)
      navigate('/readings', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <h2>Create an account</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
          />
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-describedby="password-hint"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a password"
            required
          />
          <p id="password-hint" className="muted hint">
            At least 8 characters, with an uppercase letter, a lowercase letter
            and a number.
          </p>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}

export default RegisterPage
