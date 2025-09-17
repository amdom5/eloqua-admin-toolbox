import { contextBridge, ipcRenderer } from 'electron'

// Basic input validation helpers
function validateString(value: any, maxLength: number = 1000): string {
  if (typeof value !== 'string') {
    throw new Error('Value must be a string')
  }
  if (value.length > maxLength) {
    throw new Error(`String exceeds maximum length of ${maxLength}`)
  }
  return value
}

function validateObject(value: any): object {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Value must be an object')
  }
  return value
}

function validateArray(value: any, maxItems: number = 10000): any[] {
  if (!Array.isArray(value)) {
    throw new Error('Value must be an array')
  }
  if (value.length > maxItems) {
    throw new Error(`Array exceeds maximum items of ${maxItems}`)
  }
  return value
}

export type IpcApi = {
  // App utilities
  getVersion: () => Promise<string>
  showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>
  showErrorBox: (title: string, content: string) => void
  
  // File operations
  writeFile: (filePath: string, data: string) => Promise<void>
  readFile: (filePath: string) => Promise<string>
  
  // CSV export
  exportCsv: (data: any[], fileName: string) => Promise<string>
  
  // System info
  getSystemInfo: () => Promise<{
    platform: string
    arch: string
    version: string
  }>
  
  // Security
  sanitizeFileName: (fileName: string) => Promise<string>
  
  // Eloqua API
  eloquaTestConnection: (credentials: any) => Promise<any>
  eloquaApiCall: (params: {
    baseUrl: string
    authString: string
    method: string
    endpoint: string
    data?: any
  }) => Promise<any>
  
  
  // Auth management  
  getCredentials: () => Promise<any>
  setCredentials: (credentials: any) => Promise<void>
  loadStoredCredentials: (siteName: string, username: string) => Promise<any>
  listStoredAccounts: () => Promise<Array<{siteName: string, username: string}>>
  clearAllCredentials: () => Promise<boolean>
}

const api: IpcApi = {
  // App utilities
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options),
  showErrorBox: (title, content) => ipcRenderer.invoke('dialog:showErrorBox', title, content),
  
  // File operations
  writeFile: (filePath, data) => {
    validateString(filePath, 500)
    validateString(data, 10000000) // 10MB limit
    return ipcRenderer.invoke('file:write', filePath, data)
  },
  readFile: (filePath) => {
    validateString(filePath, 500)
    return ipcRenderer.invoke('file:read', filePath)
  },
  
  // CSV export
  exportCsv: (data, fileName) => {
    validateArray(data)
    validateString(fileName, 255)
    return ipcRenderer.invoke('csv:export', data, fileName)
  },
  
  // System info
  getSystemInfo: () => ipcRenderer.invoke('system:getInfo'),
  
  // Security
  sanitizeFileName: (fileName) => ipcRenderer.invoke('security:sanitizeFileName', fileName),
  
  // Eloqua API
  eloquaTestConnection: (credentials) => {
    validateObject(credentials)
    return ipcRenderer.invoke('eloqua:testConnection', credentials)
  },
  eloquaApiCall: (params) => {
    validateObject(params)
    if (params.baseUrl) validateString(params.baseUrl, 500)
    if (params.authString) validateString(params.authString, 1000)
    if (params.method) validateString(params.method, 10)
    if (params.endpoint) validateString(params.endpoint, 1000)
    return ipcRenderer.invoke('eloqua:apiCall', params)
  },
  
  
  // Auth management
  getCredentials: () => ipcRenderer.invoke('auth:getCredentials'),
  setCredentials: (credentials) => ipcRenderer.invoke('auth:setCredentials', credentials),
  loadStoredCredentials: (siteName, username) => ipcRenderer.invoke('auth:loadStoredCredentials', siteName, username),
  listStoredAccounts: () => ipcRenderer.invoke('auth:listStoredAccounts'),
  clearAllCredentials: () => ipcRenderer.invoke('auth:clearAllCredentials'),
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI: IpcApi
  }
}