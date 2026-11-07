import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ReadingsPage from './pages/ReadingsPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import { useAuth, RequireAuth } from './auth.jsx'

export default function App() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Sweety</h1>
        {isAuthenticated && (
          <nav>
            <Link to="/readings">Readings</Link>
            <Link to="/reports">Reports</Link>
            <span className="user-name" title={user.name}>
              Hi, {user.name}
            </span>
            <button type="button" onClick={handleLogout}>
              Log out
            </button>
          </nav>
        )}
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/readings" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/readings"
            element={
              <RequireAuth>
                <ReadingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                <ReportsPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  )
}
