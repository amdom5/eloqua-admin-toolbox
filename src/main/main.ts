import { app, BrowserWindow, ipcMain, dialog, globalShortcut } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import axios from 'axios'
import { isDev } from './utils'
import { SecureCredentialManager, EloquaCredentials } from './secureCredentialManager'
import { SecurityUtils } from './security'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webSecurity: true, // Keep security enabled
    },
    titleBarStyle: 'default',
    show: false,
  })

  if (isDev) {
    const port = process.env.PORT || 3001
    mainWindow.loadURL(`http://localhost:${port}`)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Register keyboard shortcuts
  mainWindow.webContents.on('did-finish-load', () => {
    // Force reload with Ctrl+Shift+R (or Cmd+Shift+R on Mac)
    globalShortcut.register('CommandOrControl+Shift+R', () => {
      if (mainWindow) {
        mainWindow.webContents.reloadIgnoringCache()
      }
    })
  })
}

app.whenReady().then(() => {
  // Initialize security utilities
  SecurityUtils.initialize()
  
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll()
})

// Utility functions
function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-z0-9.-]/gi, '_')
}

// Function removed - using SecurityUtils.arrayToSecureCSV directly

// IPC handlers for secure communication
ipcMain.handle('app:getVersion', () => {
  return app.getVersion()
})

ipcMain.handle('dialog:showSaveDialog', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow!, options)
  return result
})

ipcMain.handle('dialog:showErrorBox', (_, title: string, content: string) => {
  dialog.showErrorBox(title, content)
})

// File operations
ipcMain.handle('file:write', async (_, filePath: string, data: string) => {
  try {
    // Validate file path
    const validation = SecurityUtils.validateFilePath(filePath)
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid file path')
    }
    
    await fs.writeFile(validation.sanitizedPath!, data, 'utf8')
  } catch (error) {
    throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

ipcMain.handle('file:read', async (_, filePath: string) => {
  try {
    // Validate file path
    const validation = SecurityUtils.validateFilePath(filePath)
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid file path')
    }
    
    const data = await fs.readFile(validation.sanitizedPath!, 'utf8')
    return data
  } catch (error) {
    throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

// CSV export
ipcMain.handle('csv:export', async (_, data: any[], fileName: string) => {
  try {
    // Validate input
    const validation = SecurityUtils.validateIpcInput('csv:export', [data, fileName])
    if (!validation.valid) {
      throw new Error(`Invalid CSV export parameters: ${validation.errors.join(', ')}`)
    }
    
    const csvContent = SecurityUtils.arrayToSecureCSV(data)
    const sanitizedFileName = sanitizeFileName(fileName)
    
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: sanitizedFileName,
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    
    if (!result.canceled && result.filePath) {
      await fs.writeFile(result.filePath, csvContent, 'utf8')
      return result.filePath
    }
    
    throw new Error('Export cancelled')
  } catch (error) {
    throw new Error(`Failed to export CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

// System info
ipcMain.handle('system:getInfo', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.version,
  }
})

// Security
ipcMain.handle('security:sanitizeFileName', (_, fileName: string) => {
  return sanitizeFileName(fileName)
})

// Eloqua API calls
ipcMain.handle('eloqua:testConnection', async (_, credentials: EloquaCredentials) => {
  try {
    // Validate credentials before use
    const validation = SecureCredentialManager.validateCredentials(credentials)
    if (!validation.valid) {
      throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`)
    }
    
    // Create the authentication string using secure method
    const authString = SecureCredentialManager.createAuthString(credentials)
    
    // Base64 encode the authentication string
    const encodedAuth = Buffer.from(authString).toString('base64')
    
    
    const response = await axios.get('https://login.eloqua.com/id', {
      headers: {
        'Authorization': `Basic ${encodedAuth}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000,
    })
    
    // Validate response structure before returning
    if (!response.data) {
      console.error('Main process - No response data from Eloqua')
      throw new Error('No response received from Eloqua API. Please check your internet connection.')
    }
    
    // Check if Eloqua returned an error in the response body
    if (response.data.error || response.data.errors) {
      console.error('Main process - Eloqua API error in response:', response.data)
      const errorMessage = response.data.error || (response.data.errors && response.data.errors[0])
      if (typeof errorMessage === 'string') {
        if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('unauthorized')) {
          throw new Error('Invalid credentials. Please check your username and password.')
        }
        if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('site')) {
          throw new Error('Site not found. Please check your site name.')
        }
        throw new Error(`Eloqua API error: ${errorMessage}`)
      }
    }
    
    // Check for missing URLs structure (indicates invalid site/credentials)
    if (!response.data.urls || !response.data.urls.base) {
      console.error('Main process - Invalid Eloqua response structure:', {
        status: response.status,
        hasData: !!response.data,
        hasUrls: !!(response.data && response.data.urls),
        hasBase: !!(response.data && response.data.urls && response.data.urls.base),
        responseData: response.data
      })
      
      // This usually means invalid site name or credentials
      if (!response.data.urls) {
        throw new Error('Invalid credentials or site name. Please verify your login information.')
      } else {
        throw new Error('Invalid response from Eloqua API. Please verify your site name is correct.')
      }
    }
    
    console.log('Main process - Returning valid response data:', {
      hasData: !!response.data,
      dataType: typeof response.data,
      hasUrls: !!(response.data && response.data.urls),
      hasBase: !!(response.data && response.data.urls && response.data.urls.base)
    })
    
    return response.data
  } catch (error) {
    console.error('Main process - Login error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      isAxiosError: axios.isAxiosError(error),
      status: axios.isAxiosError(error) ? error.response?.status : 'N/A',
      code: axios.isAxiosError(error) ? error.code : 'N/A',
      fullError: error
    })
    
    if (axios.isAxiosError(error)) {
      console.error('Main process - Axios error details:', {
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      })
      
      if (error.response?.status === 401) {
        throw new Error('Invalid credentials. Please check your username and password.')
      }
      if (error.response?.status === 403) {
        throw new Error('Access denied. You may not have the required "Advanced Users - Marketing" permissions.')
      }
      if (error.response?.status === 404) {
        throw new Error('Site not found. Please check your site name.')
      }
      if (error.code === 'ENOTFOUND') {
        throw new Error('DNS lookup failed. Please check your internet connection and DNS settings.')
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Connection refused. Please check your firewall and internet connection.')
      }
      if (error.code === 'ETIMEDOUT') {
        throw new Error('Connection timeout. The server took too long to respond.')
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('Connection aborted. Please try again.')
      }
      
      // Generic network error
      throw new Error(`Network error (${error.code || error.response?.status}): ${error.message}`)
    }
    
    throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

// Eloqua API calls with authenticated session
ipcMain.handle('eloqua:apiCall', async (_, { baseUrl, authString, method, endpoint, data }) => {
  try {
    // Validate input parameters
    const validation = SecurityUtils.validateIpcInput('eloqua:apiCall', [{ baseUrl, authString, method, endpoint, data }])
    if (!validation.valid) {
      throw new Error(`Invalid API call parameters: ${validation.errors.join(', ')}`)
    }
    
    // Sanitize auth string
    const sanitizedAuthString = SecurityUtils.sanitizeAuthString(authString)
    const encodedAuth = Buffer.from(sanitizedAuthString).toString('base64')
    
    const config: any = {
      method,
      url: `${baseUrl}${endpoint}`,
      headers: {
        'Authorization': `Basic ${encodedAuth}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000,
    }
    
    if (data) {
      config.data = data
    }
    
    const response = await axios(config)
    return response.data
  } catch (error) {
    console.error('Main process - API call error:', error)
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.')
      }
      if (error.response?.status === 403) {
        throw new Error('Access denied for this operation.')
      }
      
      throw new Error(`API error (${error.response?.status}): ${error.message}`)
    }
    
    throw new Error(`API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})


// Secure credential storage using OS keychain
// Note: We no longer store credentials in memory for security
let currentSessionInfo: { siteName?: string; username?: string } | null = null

ipcMain.handle('auth:getCredentials', async () => {
  // Always fetch from keychain instead of memory
  if (currentSessionInfo?.siteName && currentSessionInfo?.username) {
    try {
      return await SecureCredentialManager.getCredentials(
        currentSessionInfo.siteName,
        currentSessionInfo.username
      )
    } catch (error) {
      console.error('Failed to fetch credentials from keychain:', error)
      return null
    }
  }
  return null
})

ipcMain.handle('auth:setCredentials', async (_, credentials: EloquaCredentials | null) => {
  try {
    if (credentials) {
      // Validate credentials before storing
      const validation = SecureCredentialManager.validateCredentials(credentials)
      if (!validation.valid) {
        throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`)
      }
      
      // Store credentials securely in OS keychain
      await SecureCredentialManager.storeCredentials(credentials)
      // Only store session info, not actual credentials
      currentSessionInfo = { 
        siteName: credentials.siteName, 
        username: credentials.username 
      }
      
      // Credentials stored securely
    } else {
      // Clear credentials
      if (currentSessionInfo?.siteName && currentSessionInfo?.username) {
        await SecureCredentialManager.removeCredentials(
          currentSessionInfo.siteName,
          currentSessionInfo.username
        )
      }
      currentSessionInfo = null
      
      // Credentials cleared
    }
  } catch (error) {
    console.error('Failed to handle credential storage:', error)
    throw error
  }
})

// Additional secure credential management handlers
ipcMain.handle('auth:loadStoredCredentials', async (_, siteName: string, username: string) => {
  try {
    const credentials = await SecureCredentialManager.getCredentials(siteName, username)
    if (credentials) {
      // Only store session info, not actual credentials
      currentSessionInfo = { siteName, username }
      return credentials
    }
    return null
  } catch (error) {
    console.error('Failed to load stored credentials:', error)
    return null
  }
})

ipcMain.handle('auth:listStoredAccounts', async () => {
  try {
    return await SecureCredentialManager.listCredentialAccounts()
  } catch (error) {
    console.error('Failed to list stored accounts:', error)
    return []
  }
})

ipcMain.handle('auth:clearAllCredentials', async () => {
  try {
    const result = await SecureCredentialManager.clearAllCredentials()
    currentSessionInfo = null
    return result
  } catch (error) {
    console.error('Failed to clear all credentials:', error)
    return false
  }
})