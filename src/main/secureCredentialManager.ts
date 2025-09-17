import * as keytar from 'keytar'

export interface EloquaCredentials {
  siteName: string
  username: string
  password: string
  baseUrl?: string
  userId?: string
}

export class SecureCredentialManager {
  private static readonly SERVICE_NAME = 'eloqua-admin-toolbox'
  private static readonly ACCOUNT_PREFIX = 'eloqua-creds'
  
  /**
   * Securely stores credentials in the OS keychain
   * @param credentials - The credentials to store
   * @returns Promise<void>
   */
  static async storeCredentials(credentials: EloquaCredentials): Promise<void> {
    if (!credentials || !credentials.siteName || !credentials.username || !credentials.password) {
      throw new Error('Invalid credentials provided')
    }
    
    try {
      // Store credentials as encrypted JSON in keychain
      const credentialsJson = JSON.stringify({
        siteName: credentials.siteName,
        username: credentials.username,
        password: credentials.password,
        baseUrl: credentials.baseUrl,
        userId: credentials.userId,
        timestamp: Date.now() // Add timestamp for security auditing
      })
      
      const accountName = `${this.ACCOUNT_PREFIX}-${credentials.siteName}-${credentials.username}`
      
      await keytar.setPassword(this.SERVICE_NAME, accountName, credentialsJson)
      
      console.log('Credentials stored securely in OS keychain')
    } catch (error) {
      console.error('Failed to store credentials securely:', error)
      throw new Error('Failed to store credentials securely')
    }
  }
  
  /**
   * Retrieves credentials from the OS keychain
   * @param siteName - The site name to retrieve credentials for
   * @param username - The username to retrieve credentials for
   * @returns Promise<EloquaCredentials | null>
   */
  static async getCredentials(siteName: string, username: string): Promise<EloquaCredentials | null> {
    if (!siteName || !username) {
      return null
    }
    
    try {
      const accountName = `${this.ACCOUNT_PREFIX}-${siteName}-${username}`
      
      const credentialsJson = await keytar.getPassword(this.SERVICE_NAME, accountName)
      
      if (!credentialsJson) {
        return null
      }
      
      const credentials = JSON.parse(credentialsJson)
      
      // Validate stored credentials structure
      if (!credentials.siteName || !credentials.username || !credentials.password) {
        console.warn('Invalid credentials structure found in keychain')
        return null
      }
      
      return {
        siteName: credentials.siteName,
        username: credentials.username,
        password: credentials.password,
        baseUrl: credentials.baseUrl,
        userId: credentials.userId
      }
    } catch (error) {
      console.error('Failed to retrieve credentials from keychain:', error)
      return null
    }
  }
  
  /**
   * Removes credentials from the OS keychain
   * @param siteName - The site name to remove credentials for
   * @param username - The username to remove credentials for
   * @returns Promise<boolean>
   */
  static async removeCredentials(siteName: string, username: string): Promise<boolean> {
    if (!siteName || !username) {
      return false
    }
    
    try {
      const accountName = `${this.ACCOUNT_PREFIX}-${siteName}-${username}`
      
      const result = await keytar.deletePassword(this.SERVICE_NAME, accountName)
      
      if (result) {
        console.log('Credentials removed from keychain')
      }
      
      return result
    } catch (error) {
      console.error('Failed to remove credentials from keychain:', error)
      return false
    }
  }
  
  /**
   * Lists all stored credential accounts
   * @returns Promise<Array<{siteName: string, username: string}>>
   */
  static async listCredentialAccounts(): Promise<Array<{siteName: string, username: string}>> {
    try {
      const accounts = await keytar.findCredentials(this.SERVICE_NAME)
      
      return accounts
        .filter(account => account.account.startsWith(this.ACCOUNT_PREFIX))
        .map(account => {
          const parts = account.account.replace(`${this.ACCOUNT_PREFIX}-`, '').split('-')
          return {
            siteName: parts[0] || '',
            username: parts.slice(1).join('-') || ''
          }
        })
        .filter(cred => cred.siteName && cred.username)
    } catch (error) {
      console.error('Failed to list credential accounts:', error)
      return []
    }
  }
  
  /**
   * Clears all stored credentials (for security purposes)
   * @returns Promise<boolean>
   */
  static async clearAllCredentials(): Promise<boolean> {
    try {
      const accounts = await this.listCredentialAccounts()
      
      let allCleared = true
      for (const account of accounts) {
        const cleared = await this.removeCredentials(account.siteName, account.username)
        if (!cleared) {
          allCleared = false
        }
      }
      
      return allCleared
    } catch (error) {
      console.error('Failed to clear all credentials:', error)
      return false
    }
  }
  
  /**
   * Creates a secure authentication string from credentials
   * @param credentials - The credentials to create auth string from
   * @returns string - The auth string for API calls
   */
  static createAuthString(credentials: EloquaCredentials): string {
    if (!credentials || !credentials.siteName || !credentials.username || !credentials.password) {
      throw new Error('Invalid credentials for auth string creation')
    }
    
    return `${credentials.siteName}\\${credentials.username}:${credentials.password}`
  }
  
  /**
   * Validates credential structure and strength
   * @param credentials - The credentials to validate
   * @returns {valid: boolean, errors: string[]}
   */
  static validateCredentials(credentials: EloquaCredentials): {valid: boolean, errors: string[]} {
    const errors: string[] = []
    
    if (!credentials) {
      errors.push('Credentials object is required')
      return { valid: false, errors }
    }
    
    if (!credentials.siteName || credentials.siteName.trim().length === 0) {
      errors.push('Site name is required')
    }
    
    if (!credentials.username || credentials.username.trim().length === 0) {
      errors.push('Username is required')
    }
    
    if (!credentials.password || credentials.password.trim().length === 0) {
      errors.push('Password is required')
    }
    
    // Basic password strength validation
    if (credentials.password && credentials.password.length < 8) {
      errors.push('Password should be at least 8 characters long')
    }
    
    // Validate site name format (basic validation)
    if (credentials.siteName && !/^[a-zA-Z0-9-_.]+$/.test(credentials.siteName)) {
      errors.push('Site name contains invalid characters')
    }
    
    return { valid: errors.length === 0, errors }
  }
}