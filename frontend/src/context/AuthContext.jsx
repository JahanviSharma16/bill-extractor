import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || token === 'undefined') {
      localStorage.removeItem('token')
      setLoading(false)
      return
    }

    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('user')
      }
    }

    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user)
        localStorage.setItem('user', JSON.stringify(res.data.user))
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const persistSession = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    persistSession(res.data.token, res.data.user)
    return res.data.user
  }

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password })
    persistSession(res.data.token, res.data.user)
    return res.data.user
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
