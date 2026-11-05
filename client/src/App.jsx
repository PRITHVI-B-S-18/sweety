import { Routes, Route, Navigate, Link } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ReadingsPage from './pages/ReadingsPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Sweety</h1>
        <nav>
          <Link to="/readings">Readings</Link>
          <Link to="/reports">Reports</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/readings" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/readings" element={<ReadingsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  )
}
