import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { testConnection } from '../services/eloquaApi'
import '../styles/Login.css'
import logoImage from '../assets/elqtoolbox.png'

function Login() {
  const { login } = useAuth()
  const [credentials, setCredentials] = useState({
    siteName: '',
    username: '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Test connection and get base URL
      const loginData = await testConnection(credentials)
      
      // Validate loginData structure (should not happen after our fixes, but safety check)
      if (!loginData || !loginData.urls || !loginData.urls.base) {
        console.error('Login component received invalid loginData:', loginData)
        throw new Error('Invalid response from authentication service')
      }
      
      // Update credentials with base URL and user info
      const updatedCredentials = {
        ...credentials,
        baseUrl: loginData.urls.base,
        userId: loginData.user?.id,
      }
      
      login(updatedCredentials)
    } catch (err) {
      console.error('Login component error:', err)
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCredentials(prev => ({
      ...prev,
      [name]: value,
    }))
  }


  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src={logoImage} alt="Eloqua Admin Toolbox" className="logo-image" />
          </div>
          <h1>Eloqua Admin Toolbox</h1>
          <p>Enter your Eloqua credentials to connect</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="siteName" className="form-label">
              Site Name
            </label>
            <input
              type="text"
              id="siteName"
              name="siteName"
              value={credentials.siteName}
              onChange={handleChange}
              className="form-input"
              placeholder="Your Eloqua site name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Your Eloqua username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Your Eloqua password"
              required
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Connecting...' : 'Connect to Eloqua'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            This application connects directly to your Eloqua instance using the REST API.
            Your credentials are stored only in this session and are not saved to disk.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login