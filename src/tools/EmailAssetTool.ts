import { BaseTool, ToolConfig, ToolExecutionContext, ToolResult, ToolComponent, ParameterValidator } from '../shared/toolFramework'
import eloquaApiService from '../renderer/services/eloquaApi'

interface EmailAssetParameters {
  // Search by ID
  searchById?: string
  
  // Search by Criteria
  emailName?: string
  createdAt?: string
  createdAtOperator?: '=' | '!=' | '>' | '<' | '>=' | '<='
  updatedAt?: string
  updatedAtOperator?: '=' | '!=' | '>' | '<' | '>=' | '<='
  createdBy?: string
  createdByOperator?: '=' | '!='
  updatedBy?: string
  updatedByOperator?: '=' | '!='
  emailGroupId?: string
  emailGroupIdOperator?: '=' | '!='
  createdByUserId?: string
  createdByUserIdOperator?: '=' | '!='
  updatedByUserId?: string
  updatedByUserIdOperator?: '=' | '!='
  
  // Common parameters
  includeArchived?: boolean
  exportFormat: 'csv' | 'json'
  includeContent?: boolean
  maxResults?: number
}

interface EmailAssetSchema {
  // Search by ID
  searchById: {
    type: 'string'
    required: false
    description: 'Search for specific email(s) by ID - use comma-separated values for multiple IDs'
    category: 'basic'
  }
  
  // Search by Criteria fields
  emailName: {
    type: 'string'
    required: false
    description: 'Email name to search for'
    category: 'basic'
  }
  emailNameOperator: {
    type: 'string'
    required: false
    enum: ['=', '!=']
    default: 'contains'
    description: 'Operator for email name search'
    category: 'basic'
  }
  createdAt: {
    type: 'string'
    required: false
    description: 'Created date as Unix timestamp or date (YYYY-MM-DD)'
    category: 'basic'
  }
  createdAtOperator: {
    type: 'string'
    required: false
    enum: ['=', '!=', '>', '<', '>=', '<=']
    default: '='
    description: 'Operator for created date search'
    category: 'basic'
  }
  updatedAt: {
    type: 'string'
    required: false
    description: 'Updated date as Unix timestamp or date (YYYY-MM-DD)'
    category: 'basic'
  }
  updatedAtOperator: {
    type: 'string'
    required: false
    enum: ['=', '!=', '>', '<', '>=', '<=']
    default: '='
    description: 'Operator for updated date search'
    category: 'basic'
  }
  createdBy: {
    type: 'string'
    required: false
    description: 'Creator username (login name)'
    category: 'basic'
  }
  createdByOperator: {
    type: 'string'
    required: false
    enum: ['=', '!=']
    default: '='
    description: 'Operator for created by search'
    category: 'basic'
  }
  updatedBy: {
    type: 'string'
    required: false
    description: 'Updater username (login name)'
    category: 'basic'
  }
  updatedByOperator: {
    type: 'string'
    required: false
    enum: ['=', '!=']
    default: '='
    description: 'Operator for updated by search'
    category: 'basic'
  }
  emailGroupId: {
    type: 'string'
    required: false
    description: 'Email group ID'
    category: 'basic'
  }
  emailGroupIdOperator: {
    type: 'string'
    required: false
    enum: ['=', '!=']
    default: '='
    description: 'Operator for email group ID search'
    category: 'basic'
  }
  createdByUserId: {
    type: 'string'
    required: false
    description: 'Creator user ID'
    category: 'basic'
  }
  createdByUserIdOperator: {
    type: 'string'
    required: false
    enum: ['=', '!=']
    default: '='
    description: 'Operator for creator user ID search'
    category: 'basic'
  }
  updatedByUserId: {
    type: 'string'
    required: false
    description: 'Updater user ID'
    category: 'basic'
  }
  updatedByUserIdOperator: {
    type: 'string'
    required: false
    enum: ['=', '!=']
    default: '='
    description: 'Operator for updater user ID search'
    category: 'basic'
  }
  
  // Common parameters
  includeArchived: {
    type: 'boolean'
    required: false
    default: false
    description: 'Include archived emails in results'
    category: 'advanced'
  }
  exportFormat: {
    type: 'string'
    required: true
    enum: ['csv', 'json']
    default: 'csv'
    description: 'Export format for results'
    category: 'basic'
  }
  includeContent: {
    type: 'boolean'
    required: false
    default: true
    description: 'Include email content and convert HTML to plain text'
    category: 'basic'
  }
  maxResults: {
    type: 'number'
    required: false
    default: 25
    min: 1
    max: 10000
    description: 'Maximum number of results to return'
    category: 'basic'
  }
}

class EmailAssetTool extends BaseTool {
  constructor() {
    const config: ToolConfig = {
      id: 'email-asset-tool',
      name: 'Email Asset Management',
      description: 'Search for email assets and export detailed API information',
      icon: 'Mail',
      path: '/email-assets',
      category: 'assets',
      features: [
        'Advanced search by multiple fields',
        'Date range filtering (created/updated)',
        'Email group and creator filtering',
        'HTML to plain text conversion',
        'Preview text extraction',
        'Export to CSV with enhanced fields'
      ],
      requiresAuth: true,
      version: '1.0.0'
    }
    super(config)
  }

  validateParameters(parameters: EmailAssetParameters): boolean {
    if (!parameters) return false

    // Validate export format
    if (!ParameterValidator.isRequired(parameters.exportFormat) ||
        !['csv', 'json'].includes(parameters.exportFormat)) {
      return false
    }

    // Validate max results
    if (parameters.maxResults !== undefined && 
        (!ParameterValidator.isNumber(parameters.maxResults) || 
         parameters.maxResults < 1 || 
         parameters.maxResults > 10000)) {
      return false
    }

    // Validate string parameters if provided
    if (parameters.emailName !== undefined && 
        !ParameterValidator.isString(parameters.emailName)) {
      return false
    }

    if (parameters.searchById !== undefined && 
        !ParameterValidator.isString(parameters.searchById)) {
      return false
    }

    return true
  }

  getParameterSchema(): EmailAssetSchema {
    return {
      // Search by ID
      searchById: {
        type: 'string',
        required: false,
        description: 'Search for specific email(s) by ID - use comma-separated values for multiple IDs',
        category: 'basic'
      },
      
      // Search by Criteria fields
      emailName: {
        type: 'string',
        required: false,
        description: 'Email name to search for (automatically uses wildcard matching)',
        category: 'basic'
      },
      createdAt: {
        type: 'string',
        required: false,
        description: 'Created date (YYYY-MM-DD format)',
        category: 'advanced'
      },
      createdAtOperator: {
        type: 'string',
        required: false,
        enum: ['=', '!=', '>', '<', '>=', '<='],
        default: '=',
        description: 'Operator for created date search',
        category: 'advanced'
      },
      updatedAt: {
        type: 'string',
        required: false,
        description: 'Updated date (YYYY-MM-DD format)',
        category: 'advanced'
      },
      updatedAtOperator: {
        type: 'string',
        required: false,
        enum: ['=', '!=', '>', '<', '>=', '<='],
        default: '=',
        description: 'Operator for updated date search',
        category: 'advanced'
      },
      createdBy: {
        type: 'string',
        required: false,
        description: 'Creator username (login name)',
        category: 'advanced'
      },
      createdByOperator: {
        type: 'string',
        required: false,
        enum: ['=', '!='],
        default: '=',
        description: 'Operator for created by search',
        category: 'advanced'
      },
      updatedBy: {
        type: 'string',
        required: false,
        description: 'Updater username (login name)',
        category: 'advanced'
      },
      updatedByOperator: {
        type: 'string',
        required: false,
        enum: ['=', '!='],
        default: '=',
        description: 'Operator for updated by search',
        category: 'advanced'
      },
      emailGroupId: {
        type: 'string',
        required: false,
        description: 'Email group ID',
        category: 'advanced'
      },
      emailGroupIdOperator: {
        type: 'string',
        required: false,
        enum: ['=', '!='],
        default: '=',
        description: 'Operator for email group ID search',
        category: 'advanced'
      },
      createdByUserId: {
        type: 'string',
        required: false,
        description: 'Creator user ID',
        category: 'advanced'
      },
      createdByUserIdOperator: {
        type: 'string',
        required: false,
        enum: ['=', '!='],
        default: '=',
        description: 'Operator for creator user ID search',
        category: 'advanced'
      },
      updatedByUserId: {
        type: 'string',
        required: false,
        description: 'Updater user ID',
        category: 'advanced'
      },
      updatedByUserIdOperator: {
        type: 'string',
        required: false,
        enum: ['=', '!='],
        default: '=',
        description: 'Operator for updater user ID search',
        category: 'advanced'
      },
      
      // Common parameters
      includeArchived: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Include archived emails in results',
        category: 'advanced'
      },
      exportFormat: {
        type: 'string',
        required: true,
        enum: ['csv', 'json'],
        default: 'csv',
        description: 'Export format for results',
        category: 'basic'
      },
      includeContent: {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Include email content and convert HTML to plain text',
        category: 'basic'
      },
      maxResults: {
        type: 'number',
        required: false,
        default: 25,
        min: 1,
        max: 10000,
        description: 'Maximum number of results to return',
        category: 'basic'
      }
    }
  }

  async execute(context: ToolExecutionContext, parameters: EmailAssetParameters): Promise<ToolResult> {
    try {
      // Initialize API service if needed
      if (!eloquaApiService) {
        throw new Error('Eloqua API service not initialized')
      }

      const {
        searchById,
        emailName,
        createdAt,
        createdAtOperator = '=',
        updatedAt,
        updatedAtOperator = '=',
        createdBy,
        createdByOperator = '=',
        updatedBy,
        updatedByOperator = '=',
        emailGroupId,
        emailGroupIdOperator = '=',
        createdByUserId,
        createdByUserIdOperator = '=',
        updatedByUserId,
        updatedByUserIdOperator = '=',
        includeArchived = false,
        exportFormat = 'csv',
        includeContent = true,
        maxResults = 25
      } = parameters

      context.showProgress('Searching for email assets...')

      // Handle ID search differently
      let emails = []
      
      if (searchById) {
        // If searching by ID, handle multiple comma-separated IDs
        const emailIds = searchById.split(',').map(id => id.trim()).filter(id => id.length > 0)
        
        context.showProgress(`Fetching ${emailIds.length} email(s) by ID...`)
        
        for (let i = 0; i < emailIds.length; i++) {
          const emailId = emailIds[i]
          try {
            context.showProgress(`Fetching email ${i + 1}/${emailIds.length}: ID ${emailId}`)
            const emailDetails = await eloquaApiService.getEmailDetails(emailId)
            emails.push(emailDetails)
          } catch (error) {
            console.warn(`Email with ID ${emailId} not found:`, error)
            // Continue with other IDs instead of failing completely
          }
        }
        
        if (emails.length === 0) {
          return {
            success: false,
            error: `No emails found for the provided ID(s): ${searchById}`
          }
        }
      } else {
        // Build search query for criteria-based search
        const searchQuery = this.buildSearchQuery({
          emailName,
          createdAt,
          createdAtOperator,
          updatedAt,
          updatedAtOperator,
          createdBy,
          createdByOperator,
          updatedBy,
          updatedByOperator,
          emailGroupId,
          emailGroupIdOperator,
          createdByUserId,
          createdByUserIdOperator,
          updatedByUserId,
          updatedByUserIdOperator
        })

        // Fetch emails with pagination for general search
        let page = 1
        const pageSize = 100
        let hasMoreResults = true

        while (hasMoreResults && emails.length < maxResults) {
          const remaining = maxResults - emails.length
          const currentPageSize = Math.min(pageSize, remaining)

          const response = await eloquaApiService.getEmails(searchQuery, page, currentPageSize)

          if (response.elements && response.elements.length > 0) {
            emails.push(...response.elements)
            
            // Check if we have more results
            hasMoreResults = response.elements.length === currentPageSize && 
                            response.page < response.pageCount
            page++
          } else {
            hasMoreResults = false
          }

          context.showProgress(`Found ${emails.length} emails...`)
        }
      }

      if (emails.length === 0) {
        return {
          success: false,
          error: 'No emails found matching the specified criteria'
        }
      }

      context.showProgress('Processing email data...')

      // Fetch email groups to map IDs to names
      let emailGroupMap: Record<string, string> = {}
      try {
        context.showProgress('Fetching email groups...')
        const emailGroupsResponse = await eloquaApiService.getEmailGroups()
        if (emailGroupsResponse.elements) {
          emailGroupMap = emailGroupsResponse.elements.reduce((map: Record<string, string>, group: any) => {
            map[group.id] = group.name
            return map
          }, {})
        }
      } catch (error) {
        console.warn('Failed to fetch email groups:', error)
        // Continue without group names
      }

      // Process emails for export
      const processedEmails = await this.processEmailsForExport(
        emails,
        includeContent,
        context,
        emailGroupMap
      )

      // Filter results based on parameters
      let filteredEmails = processedEmails

      if (!includeArchived) {
        filteredEmails = filteredEmails.filter(email => !email.isArchived)
      }

      context.showProgress('Preparing results...')

      return {
        success: true,
        data: filteredEmails,
        message: `Successfully found ${filteredEmails.length} emails`
        // exportFormat is available in parameters for UI use
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private async processEmailsForExport(
    emails: any[],
    includeContent: boolean,
    context: ToolExecutionContext,
    emailGroupMap: Record<string, string> = {}
  ): Promise<any[]> {
    const processedEmails = []

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i]
      
      context.showProgress(`Processing email ${i + 1}/${emails.length}: ${email.name}`)

      // Debug: Log available fields for the first email to understand the data structure
      if (i === 0) {
        console.log('Debug - Available email fields:', Object.keys(email))
        console.log('Debug - Email object sample:', email)
      }

      const processedEmail = {
        // Core identification
        type: email.type || '',
        id: email.id || '',
        currentStatus: email.currentStatus || '',
        name: email.name || '',
        description: email.description || '',
        permissions: Array.isArray(email.permissions) ? email.permissions.join(', ') : (email.permissions || ''),
        folderId: email.folderId || '',
        sourceTemplateId: email.sourceTemplateId || '',
        
        // User and timestamp info
        createdBy: email.createdBy || '',
        createdByName: email.createdByName || email.createdBy || '',
        createdAt: email.createdAt || '',
        updatedBy: email.updatedBy || '',
        updatedByName: email.updatedByName || email.updatedBy || '',
        updatedAt: email.updatedAt || '',
        scheduledFor: email.scheduledFor || '',
        depth: email.depth || '',
        
        // Email content
        subject: email.subject || '',
        previewText: email.previewText || '',
        senderName: email.senderName || '',
        senderEmail: email.senderEmail || '',
        replyToName: email.replyToName || '',
        replyToEmail: email.replyToEmail || '',
        bounceBackEmail: email.bounceBackEmail || '',
        
        // Configuration
        virtualMTAId: email.virtualMTAId || '',
        brandId: email.brandId || '',
        htmlContent: '',
        plainText: email.plainText || '',
        isPlainTextEditable: email.isPlainTextEditable || '',
        sendPlainTextOnly: email.sendPlainTextOnly || '',
        isTracked: email.isTracked || '',
        isPrivate: email.isPrivate || '',
        layout: email.layout || '',
        style: email.style || '',
        
        // Asset references
        emailHeaderId: email.emailHeaderId || '',
        emailFooterId: email.emailFooterId || '',
        emailGroupId: email.emailGroupId || '',
        emailGroupName: email.emailGroupId ? (emailGroupMap[email.emailGroupId] || `Group ${email.emailGroupId}`) : '',
        encodingId: email.encodingId || '',
        
        // Additional properties
        isContentProtected: email.isContentProtected || '',
        renderMode: email.renderMode || '',
        archived: email.archived || '',
        isArchived: email.archived === 'true' || email.archived === true,
        
        // Complex objects (serialize arrays/objects as JSON strings for export)
        forms: email.forms ? JSON.stringify(email.forms) : '',
        images: email.images ? JSON.stringify(email.images) : '',
        hyperlinks: email.hyperlinks ? JSON.stringify(email.hyperlinks) : '',
        contentSections: email.contentSections ? JSON.stringify(email.contentSections) : '',
        dynamicContents: email.dynamicContents ? JSON.stringify(email.dynamicContents) : '',
        files: email.files ? JSON.stringify(email.files) : '',
        contentServiceInstances: email.contentServiceInstances ? JSON.stringify(email.contentServiceInstances) : '',
        fieldMerges: email.fieldMerges ? JSON.stringify(email.fieldMerges) : '',
        attachments: email.attachments ? JSON.stringify(email.attachments) : '',
        
        // Processed content (will be filled in below if includeContent is true)
        bodyText: '',
        plainTextContent: ''
      }

      // Include content if requested
      if (includeContent && email.id) {
        try {
          const emailDetails = await eloquaApiService.getEmailDetails(email.id)
          const htmlContent = emailDetails.htmlContent?.contentSource || ''
          const plainTextContent = emailDetails.plainText || ''
          const apiPreviewText = emailDetails.previewText || ''
          
          // Use API preview text if available, otherwise extract from HTML
          processedEmail.previewText = apiPreviewText || this.extractPreviewText(htmlContent)
          processedEmail.bodyText = this.convertHtmlToPlainText(htmlContent)
          
          // Store the actual HTML content and plain text
          processedEmail.htmlContent = htmlContent
          processedEmail.plainTextContent = plainTextContent
        } catch (error) {
          processedEmail.previewText = processedEmail.previewText || 'Error fetching content'
          processedEmail.bodyText = 'Error fetching content'
          processedEmail.htmlContent = 'Error fetching content'
          processedEmail.plainTextContent = 'Error fetching content'
        }
      } else {
        // If not including content, use basic HTML content if available
        processedEmail.htmlContent = email.htmlContent?.contentSource || ''
      }

      processedEmails.push(processedEmail)
    }

    return processedEmails
  }

  private buildSearchQuery(params: {
    emailName?: string
    createdAt?: string
    createdAtOperator?: string
    updatedAt?: string
    updatedAtOperator?: string
    createdBy?: string
    createdByOperator?: string
    updatedBy?: string
    updatedByOperator?: string
    emailGroupId?: string
    emailGroupIdOperator?: string
    createdByUserId?: string
    createdByUserIdOperator?: string
    updatedByUserId?: string
    updatedByUserIdOperator?: string
  }): string {
    const searchTerms: string[] = []

    // Helper function to format search value
    const formatValue = (value: string, operator: string) => {
      if (operator === 'contains') {
        return `'*${value}*'`
      }
      // For values with spaces or special characters, use quotes
      if (value.includes(' ') || value.includes('*')) {
        return `'${value}'`
      }
      return value
    }

    // Helper function to convert date to Unix timestamp if needed
    const formatDate = (dateStr: string) => {
      // If it's already a Unix timestamp (all digits), return as is
      if (/^\d+$/.test(dateStr)) {
        return dateStr
      }
      
      // Try to parse as date and convert to Unix timestamp
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) {
          return dateStr // Return original if invalid date
        }
        return Math.floor(date.getTime() / 1000).toString()
      } catch {
        return dateStr // Return original if parsing fails
      }
    }

    // Build search terms based on provided parameters
    if (params.emailName) {
      // Always use contains behavior for email name (add wildcards automatically)
      const value = `'*${params.emailName}*'`
      searchTerms.push(`name=${value}`)
    }

    if (params.createdAt) {
      const operator = params.createdAtOperator || '='
      const value = formatDate(params.createdAt)
      searchTerms.push(`createdAt${operator}${value}`)
    }

    if (params.updatedAt) {
      const operator = params.updatedAtOperator || '='
      const value = formatDate(params.updatedAt)
      searchTerms.push(`updatedAt${operator}${value}`)
    }

    if (params.createdBy) {
      const operator = params.createdByOperator || '='
      const value = formatValue(params.createdBy, params.createdByOperator || '=')
      searchTerms.push(`createdBy${operator}${value}`)
    }

    if (params.updatedBy) {
      const operator = params.updatedByOperator || '='
      const value = formatValue(params.updatedBy, params.updatedByOperator || '=')
      searchTerms.push(`updatedBy${operator}${value}`)
    }

    if (params.emailGroupId) {
      const operator = params.emailGroupIdOperator || '='
      searchTerms.push(`emailGroupId${operator}${params.emailGroupId}`)
    }

    if (params.createdByUserId) {
      const operator = params.createdByUserIdOperator || '='
      searchTerms.push(`createdByUserId${operator}${params.createdByUserId}`)
    }

    if (params.updatedByUserId) {
      const operator = params.updatedByUserIdOperator || '='
      searchTerms.push(`updatedByUserId${operator}${params.updatedByUserId}`)
    }

    return searchTerms.join('')
  }

  private convertHtmlToPlainText(html: string): string {
    if (!html) return ''

    let text = html
      // Remove scripts and styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Convert line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, '\t')
      // Remove all HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple line breaks to double
      .replace(/[ \t]+/g, ' ') // Multiple spaces to single
      .trim()

    return text
  }

  private extractPreviewText(html: string): string {
    if (!html) return ''

    // Look for common preview text patterns
    let previewText = ''

    // Try to find preview text in meta tags or special divs
    const previewRegex = /<meta[^>]*name=["']?previewText["']?[^>]*content=["']([^"']*?)["'][^>]*>/i
    const previewMatch = html.match(previewRegex)
    
    if (previewMatch) {
      previewText = previewMatch[1]
    } else {
      // Fall back to first text content
      const plainText = this.convertHtmlToPlainText(html)
      previewText = plainText.substring(0, 150).trim()
      if (plainText.length > 150) {
        previewText += '...'
      }
    }

    return previewText
  }

  getComponent(): ToolComponent {
    return {
      render: () => null // Will be implemented with React component
    }
  }
}

export default EmailAssetTool