import { app } from 'electron'
import * as path from 'path'
import { InputValidator, EloquaApiValidator } from '../shared/validation'

export class SecurityUtils {
  private static allowedDirectories: string[] = []

  static initialize() {
    // Define allowed directories for file operations
    this.allowedDirectories = [
      app.getPath('userData'),
      app.getPath('temp'),
      app.getPath('downloads'),
      app.getPath('documents')
    ]
  }

  static isPathAllowed(filePath: string): boolean {
    try {
      // Resolve to absolute path
      const resolvedPath = path.resolve(filePath)
      
      // Check if the path is within allowed directories
      return this.allowedDirectories.some(allowedDir => 
        resolvedPath.startsWith(allowedDir)
      )
    } catch (error) {
      return false
    }
  }

  static validateFilePath(filePath: string): { valid: boolean; sanitizedPath?: string; error?: string } {
    if (!filePath || typeof filePath !== 'string') {
      return { valid: false, error: 'Invalid file path provided' }
    }

    // Prevent path traversal attempts
    if (filePath.includes('..') || filePath.includes('~')) {
      return { valid: false, error: 'Path traversal attempt detected' }
    }

    const resolvedPath = path.resolve(filePath)

    if (!this.isPathAllowed(resolvedPath)) {
      return { valid: false, error: 'Access to this path is not allowed' }
    }

    return { valid: true, sanitizedPath: resolvedPath }
  }

  static sanitizeCSVValue(value: any): string {
    if (value === null || value === undefined) return ''
    
    const stringValue = String(value)
    
    // Prevent CSV injection by prefixing dangerous characters
    const dangerousChars = ['=', '+', '-', '@', '\t', '\r']
    if (dangerousChars.some(char => stringValue.startsWith(char))) {
      // Prefix with single quote to neutralize formula
      return `'${stringValue}`
    }
    
    // Escape quotes and wrap in quotes if necessary
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    
    return stringValue
  }

  static arrayToSecureCSV(data: any[]): string {
    if (!data || data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.map(h => this.sanitizeCSVValue(h)).join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          return this.sanitizeCSVValue(value)
        }).join(',')
      )
    ].join('\n')
    
    return csvContent
  }

  static validateIpcInput(channel: string, args: any[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    switch (channel) {
      case 'file:write':
      case 'file:read':
        if (!args[0] || typeof args[0] !== 'string') {
          errors.push('File path must be a string')
        }
        break

      case 'eloqua:apiCall':
        const apiArgs = args[0]
        if (!apiArgs || typeof apiArgs !== 'object') {
          errors.push('API call arguments must be an object')
        } else {
          if (!apiArgs.baseUrl || !InputValidator.validateUrl(apiArgs.baseUrl).isValid) {
            errors.push('Invalid base URL')
          }
          if (!apiArgs.authString || typeof apiArgs.authString !== 'string') {
            errors.push('Invalid auth string')
          }
          if (!apiArgs.method || !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(apiArgs.method.toUpperCase())) {
            errors.push('Invalid HTTP method')
          }
          if (!apiArgs.endpoint || typeof apiArgs.endpoint !== 'string') {
            errors.push('Invalid endpoint')
          } else {
            const endpointValidation = EloquaApiValidator.validateApiEndpoint(apiArgs.endpoint)
            if (!endpointValidation.isValid) {
              errors.push(...endpointValidation.errors)
            }
          }
        }
        break

      case 'csv:export':
        if (!Array.isArray(args[0])) {
          errors.push('Data must be an array')
        }
        if (!args[1] || typeof args[1] !== 'string') {
          errors.push('File name must be a string')
        }
        break
    }

    return { valid: errors.length === 0, errors }
  }

  static sanitizeAuthString(authString: string): string {
    // Remove any potential script injection attempts
    return authString.replace(/[<>]/g, '')
  }

  static createRateLimiter(maxRequests: number = 100, windowMs: number = 60000) {
    const requests = new Map<string, number[]>()

    return {
      check: (identifier: string): boolean => {
        const now = Date.now()
        const userRequests = requests.get(identifier) || []
        
        // Remove old requests outside the window
        const validRequests = userRequests.filter(time => now - time < windowMs)
        
        if (validRequests.length >= maxRequests) {
          return false // Rate limit exceeded
        }
        
        validRequests.push(now)
        requests.set(identifier, validRequests)
        return true
      },
      reset: (identifier: string) => {
        requests.delete(identifier)
      }
    }
  }
}

// Initialize on module load
SecurityUtils.initialize()