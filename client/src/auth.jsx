import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api, getToken, setToken } from './api.js'

const AuthContext = createContext(null)

const USER_KEY = 'sweety_user'

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSavedUser)

  async function login(email, password) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { email, password },
    })

    setToken(data.token)
    setUser(data.user)

    localStorage.setItem(USER_KEY, JSON.stringify(data.user))

    return data.user
  }

  async function register(name, email, password) {
    await api('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    })

    return login(email, password)
  }

  function logout() {
    setToken(null)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  // Listen for expired or invalid JWT responses.
  useEffect(() => {
    function handleUnauthorized() {
      logout()
    }

    window.addEventListener('sweety:unauthorized', handleUnauthorized)

    return () => {
      window.removeEventListener('sweety:unauthorized', handleUnauthorized)
    }
  }, [])

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: Boolean(user && getToken()),
  }

  return <AuthContext.Provider value={value}> {children} </AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  )
}
