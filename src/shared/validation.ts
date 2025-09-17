/**
 * Comprehensive input validation utilities for security hardening
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedValue?: any
}

export class InputValidator {
  // Regular expressions for various validation patterns
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  private static readonly URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
  private static readonly FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/
  private static readonly SITENAME_REGEX = /^[a-zA-Z0-9.-]+$/
  private static readonly HTML_TAGS_REGEX = /<[^>]*>/g
  private static readonly SCRIPT_REGEX = /<script[^>]*>.*?<\/script>/gi
  
  /**
   * Validates and sanitizes email addresses
   */
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = []
    
    if (!email || typeof email !== 'string') {
      errors.push('Email is required')
      return { isValid: false, errors }
    }
    
    const trimmedEmail = email.trim().toLowerCase()
    
    if (trimmedEmail.length === 0) {
      errors.push('Email cannot be empty')
      return { isValid: false, errors }
    }
    
    if (trimmedEmail.length > 254) {
      errors.push('Email is too long')
    }
    
    if (!this.EMAIL_REGEX.test(trimmedEmail)) {
      errors.push('Invalid email format')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: trimmedEmail
    }
  }
  
  /**
   * Validates and sanitizes URLs with whitelist check
   */
  static validateUrl(url: string, allowedDomains: string[] = []): ValidationResult {
    const errors: string[] = []
    
    if (!url || typeof url !== 'string') {
      errors.push('URL is required')
      return { isValid: false, errors }
    }
    
    const trimmedUrl = url.trim()
    
    if (trimmedUrl.length === 0) {
      errors.push('URL cannot be empty')
      return { isValid: false, errors }
    }
    
    if (!this.URL_REGEX.test(trimmedUrl)) {
      errors.push('Invalid URL format')
      return { isValid: false, errors }
    }
    
    // Check if URL uses HTTPS
    if (!trimmedUrl.startsWith('https://')) {
      errors.push('URL must use HTTPS')
    }
    
    // Domain whitelist check
    if (allowedDomains.length > 0) {
      try {
        const urlObj = new URL(trimmedUrl)
        const hostname = urlObj.hostname
        
        const isAllowed = allowedDomains.some(domain => 
          hostname === domain || hostname.endsWith('.' + domain)
        )
        
        if (!isAllowed) {
          errors.push(`Domain ${hostname} is not allowed`)
        }
      } catch (e) {
        errors.push('Invalid URL format')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: trimmedUrl
    }
  }
  
  /**
   * Validates and sanitizes filenames
   */
  static validateFilename(filename: string): ValidationResult {
    const errors: string[] = []
    
    if (!filename || typeof filename !== 'string') {
      errors.push('Filename is required')
      return { isValid: false, errors }
    }
    
    const trimmedFilename = filename.trim()
    
    if (trimmedFilename.length === 0) {
      errors.push('Filename cannot be empty')
      return { isValid: false, errors }
    }
    
    if (trimmedFilename.length > 255) {
      errors.push('Filename is too long')
    }
    
    // Check for dangerous characters
    if (!this.FILENAME_REGEX.test(trimmedFilename)) {
      errors.push('Filename contains invalid characters')
    }
    
    // Check for reserved names on Windows
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
    const nameWithoutExtension = trimmedFilename.split('.')[0].toUpperCase()
    
    if (reservedNames.includes(nameWithoutExtension)) {
      errors.push('Filename uses a reserved name')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: trimmedFilename
    }
  }
  
  /**
   * Validates and sanitizes site names
   */
  static validateSiteName(siteName: string): ValidationResult {
    const errors: string[] = []
    
    if (!siteName || typeof siteName !== 'string') {
      errors.push('Site name is required')
      return { isValid: false, errors }
    }
    
    const trimmedSiteName = siteName.trim()
    
    if (trimmedSiteName.length === 0) {
      errors.push('Site name cannot be empty')
      return { isValid: false, errors }
    }
    
    if (trimmedSiteName.length > 50) {
      errors.push('Site name is too long')
    }
    
    if (!this.SITENAME_REGEX.test(trimmedSiteName)) {
      errors.push('Site name contains invalid characters')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: trimmedSiteName
    }
  }
  
  /**
   * Sanitizes HTML input to prevent XSS attacks
   */
  static sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') {
      return ''
    }
    
    return input
      .replace(this.SCRIPT_REGEX, '') // Remove script tags
      .replace(this.HTML_TAGS_REGEX, '') // Remove all HTML tags
      .replace(/&/g, '&amp;') // Escape ampersands
      .replace(/</g, '&lt;') // Escape less than
      .replace(/>/g, '&gt;') // Escape greater than
      .replace(/"/g, '&quot;') // Escape quotes
      .replace(/'/g, '&#x27;') // Escape apostrophes
      .replace(/\//g, '&#x2F;') // Escape forward slashes
  }
  
  /**
   * Validates and sanitizes search terms
   */
  static validateSearchTerm(searchTerm: string): ValidationResult {
    const errors: string[] = []
    
    if (!searchTerm || typeof searchTerm !== 'string') {
      return { isValid: true, errors: [], sanitizedValue: '' }
    }
    
    const trimmedTerm = searchTerm.trim()
    
    if (trimmedTerm.length > 500) {
      errors.push('Search term is too long')
    }
    
    // For Eloqua search queries, we need to be very permissive since they use specific syntax
    // like name='*Newsletter*', createdAt>=1234567890, updatedBy='john.doe'
    // Only block SQL injection patterns that are clearly malicious
    // Allow: =, !=, >, <, >=, <=, *, ', ", alphanumeric, spaces, dots, underscores, hyphens
    const definitelyDangerousPatterns = /\b(drop\s+table|truncate\s+table|delete\s+from|insert\s+into|update\s+.*\s+set|alter\s+table|create\s+table|exec\s+|execute\s+|xp_|sp_cmdshell|union\s+select|or\s+1\s*=\s*1|and\s+1\s*=\s*1)/gi
    
    if (definitelyDangerousPatterns.test(trimmedTerm)) {
      errors.push('Search term contains potentially dangerous characters')
    }
    
    // Don't sanitize HTML for search terms as they need to preserve Eloqua syntax
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: trimmedTerm
    }
  }
  
  /**
   * Validates and sanitizes CSV data
   */
  static validateCsvData(csvData: string): ValidationResult {
    const errors: string[] = []
    
    if (!csvData || typeof csvData !== 'string') {
      errors.push('CSV data is required')
      return { isValid: false, errors }
    }
    
    const trimmedData = csvData.trim()
    
    if (trimmedData.length === 0) {
      errors.push('CSV data cannot be empty')
      return { isValid: false, errors }
    }
    
    // Check for maximum size (10MB)
    if (trimmedData.length > 10 * 1024 * 1024) {
      errors.push('CSV data is too large')
    }
    
    // Basic CSV structure validation
    const lines = trimmedData.split('\n')
    
    if (lines.length < 2) {
      errors.push('CSV must contain at least a header row and one data row')
    }
    
    // Check for potential injection in CSV cells
    const dangerousCells = lines.some(line => {
      const cells = line.split(',')
      return cells.some(cell => {
        const cleanCell = cell.trim().replace(/^"/, '').replace(/"$/, '')
        return cleanCell.startsWith('=') || cleanCell.startsWith('@') || cleanCell.startsWith('+') || cleanCell.startsWith('-')
      })
    })
    
    if (dangerousCells) {
      errors.push('CSV contains potentially dangerous formulas')
    }
    
    // Sanitize the CSV data
    const sanitizedLines = lines.map(line => {
      const cells = line.split(',')
      const sanitizedCells = cells.map(cell => {
        let cleanCell = cell.trim()
        
        // Remove quotes if they wrap the entire cell
        if (cleanCell.startsWith('"') && cleanCell.endsWith('"')) {
          cleanCell = cleanCell.slice(1, -1)
        }
        
        // Remove dangerous prefixes
        if (cleanCell.startsWith('=') || cleanCell.startsWith('@') || cleanCell.startsWith('+') || cleanCell.startsWith('-')) {
          cleanCell = "'" + cleanCell // Prefix with single quote to neutralize
        }
        
        // Sanitize HTML
        cleanCell = this.sanitizeHtml(cleanCell)
        
        // Re-wrap in quotes if needed
        if (cleanCell.includes(',') || cleanCell.includes('"') || cleanCell.includes('\n')) {
          cleanCell = `"${cleanCell.replace(/"/g, '""')}"`
        }
        
        return cleanCell
      })
      
      return sanitizedCells.join(',')
    })
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitizedLines.join('\n')
    }
  }
  
  /**
   * Validates numeric input
   */
  static validateNumber(value: any, min?: number, max?: number): ValidationResult {
    const errors: string[] = []
    
    if (value === null || value === undefined || value === '') {
      errors.push('Number is required')
      return { isValid: false, errors }
    }
    
    const numValue = typeof value === 'number' ? value : parseFloat(value)
    
    if (isNaN(numValue)) {
      errors.push('Invalid number format')
      return { isValid: false, errors }
    }
    
    if (min !== undefined && numValue < min) {
      errors.push(`Number must be at least ${min}`)
    }
    
    if (max !== undefined && numValue > max) {
      errors.push(`Number must be at most ${max}`)
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: numValue
    }
  }
  
  /**
   * Validates date input
   */
  static validateDate(dateValue: any): ValidationResult {
    const errors: string[] = []
    
    if (!dateValue) {
      errors.push('Date is required')
      return { isValid: false, errors }
    }
    
    const date = new Date(dateValue)
    
    if (isNaN(date.getTime())) {
      errors.push('Invalid date format')
      return { isValid: false, errors }
    }
    
    // Check for reasonable date range (1900 to 2100)
    if (date.getFullYear() < 1900 || date.getFullYear() > 2100) {
      errors.push('Date must be between 1900 and 2100')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: date.toISOString()
    }
  }
  
  /**
   * Validates password strength
   */
  static validatePassword(password: string): ValidationResult {
    const errors: string[] = []
    
    if (!password || typeof password !== 'string') {
      errors.push('Password is required')
      return { isValid: false, errors }
    }
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    
    if (password.length > 128) {
      errors.push('Password is too long')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: password // Don't sanitize passwords
    }
  }
  
  /**
   * Validates and sanitizes a generic text input
   */
  static validateText(text: string, maxLength: number = 1000): ValidationResult {
    const errors: string[] = []
    
    if (!text || typeof text !== 'string') {
      return { isValid: true, errors: [], sanitizedValue: '' }
    }
    
    const trimmedText = text.trim()
    
    if (trimmedText.length > maxLength) {
      errors.push(`Text is too long (max ${maxLength} characters)`)
    }
    
    const sanitizedText = this.sanitizeHtml(trimmedText)
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitizedText
    }
  }
}

/**
 * Eloqua-specific API validation
 */
export class EloquaApiValidator {
  /**
   * Validates Eloqua API endpoint paths
   */
  static validateApiEndpoint(endpoint: string): ValidationResult {
    const errors: string[] = []
    
    if (!endpoint || typeof endpoint !== 'string') {
      errors.push('API endpoint is required')
      return { isValid: false, errors }
    }
    
    const trimmedEndpoint = endpoint.trim()
    
    if (!trimmedEndpoint.startsWith('/')) {
      errors.push('API endpoint must start with /')
    }
    
    // Check for directory traversal attempts
    if (trimmedEndpoint.includes('..')) {
      errors.push('API endpoint contains invalid path traversal')
    }
    
    // Validate allowed API paths
    const allowedPaths = [
      '/api/REST/1.0/',
      '/api/REST/2.0/',
      '/api/bulk/1.0/',
      '/api/bulk/2.0/'
    ]
    
    const isAllowedPath = allowedPaths.some(path => trimmedEndpoint.startsWith(path))
    
    if (!isAllowedPath) {
      errors.push('API endpoint is not in allowed paths')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: trimmedEndpoint
    }
  }
  
  /**
   * Validates Eloqua asset IDs
   */
  static validateAssetId(assetId: any): ValidationResult {
    const errors: string[] = []
    
    if (!assetId && assetId !== 0) {
      errors.push('Asset ID is required')
      return { isValid: false, errors }
    }
    
    const numId = typeof assetId === 'number' ? assetId : parseInt(assetId)
    
    if (isNaN(numId)) {
      errors.push('Asset ID must be a valid number')
      return { isValid: false, errors }
    }
    
    if (numId < 0) {
      errors.push('Asset ID must be a positive number')
    }
    
    if (numId > 999999999) {
      errors.push('Asset ID is too large')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: numId
    }
  }
}