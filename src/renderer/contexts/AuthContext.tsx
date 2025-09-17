import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import eloquaApiService from '../services/eloquaApi'

export interface EloquaCredentials {
  siteName: string
  username: string
  password: string
  baseUrl?: string
  userId?: string
}

interface AuthContextType {
  credentials: EloquaCredentials | null
  isAuthenticated: boolean
  login: (credentials: EloquaCredentials) => void
  logout: () => void
  updateCredentials: (updates: Partial<EloquaCredentials>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [credentials, setCredentials] = useState<EloquaCredentials | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const isAuthenticated = credentials !== null

  const login = useCallback(async (newCredentials: EloquaCredentials) => {
    setCredentials(newCredentials)
    
    // Store credentials in main process for tools to access
    if (window.electronAPI) {
      await window.electronAPI.setCredentials(newCredentials)
    }
    
    navigate('/', { replace: true })
  }, [navigate])

  const logout = useCallback(async () => {
    setCredentials(null)
    
    // Clear credentials in main process
    if (window.electronAPI) {
      await window.electronAPI.setCredentials(null)
    }
    
    navigate('/login', { replace: true })
  }, [navigate])

  const updateCredentials = useCallback(async (updates: Partial<EloquaCredentials>) => {
    if (credentials) {
      const updatedCredentials = { ...credentials, ...updates }
      setCredentials(updatedCredentials)
      
      // Update API service with new credentials
      if (updatedCredentials.baseUrl) {
        eloquaApiService.initialize(updatedCredentials)
      }
      
      // Update credentials in main process
      if (window.electronAPI) {
        await window.electronAPI.setCredentials(updatedCredentials)
      }
    }
  }, [credentials])

  useEffect(() => {
    // Redirect to login if not authenticated and not already on login page
    if (!isAuthenticated && location.pathname !== '/login') {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, location.pathname, navigate])

  const value = useMemo(() => ({
    credentials,
    isAuthenticated,
    login,
    logout,
    updateCredentials,
  }), [credentials, isAuthenticated, login, logout, updateCredentials])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}