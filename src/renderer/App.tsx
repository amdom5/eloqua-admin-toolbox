import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import ToolRenderer from './components/ToolRenderer'
import './styles/App.css'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="app">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="tool/:toolId" element={<ToolRenderer />} />
              <Route path="email-assets" element={<ToolRenderer />} />
              <Route path="form-assets" element={<ToolRenderer />} />
              <Route path="dependencies" element={<ToolRenderer />} />
              <Route path="bulk-sync-deletion" element={<ToolRenderer />} />
              <Route path="form-management" element={<ToolRenderer />} />
              <Route path="form-bulk-submit" element={<ToolRenderer />} />
            </Route>
          </Routes>
        </div>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App