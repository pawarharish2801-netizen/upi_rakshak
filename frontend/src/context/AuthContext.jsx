import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'upi_rakshak_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [user])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      // API integration point — replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 800))
      if (!email || !password) throw new Error('Email and password are required')
      const userData = {
        id: crypto.randomUUID(),
        email,
        name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        createdAt: new Date().toISOString(),
      }
      setUser(userData)
      return userData
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (name, email, password) => {
    setLoading(true)
    try {
      // API integration point — replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      if (!name || !email || !password) throw new Error('All fields are required')
      if (password.length < 8) throw new Error('Password must be at least 8 characters')
      const userData = {
        id: crypto.randomUUID(),
        email,
        name,
        createdAt: new Date().toISOString(),
      }
      setUser(userData)
      return userData
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (updates) => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 600))
      setUser(prev => ({ ...prev, ...updates }))
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
