import { BaseTool, ToolConfig, ToolExecutionContext, ToolResult, ToolComponent, ParameterValidator } from '../shared/toolFramework'
import eloquaApiService from '../renderer/services/eloquaApi'

interface FormAssetParameters {
  // Search by ID
  searchById?: string
  
  // Search by Criteria
  formName?: string
  createdAt?: string
  createdAtOperator?: '=' | '!=' | '>' | '<' | '>=' | '<='
  updatedAt?: string
  updatedAtOperator?: '=' | '!=' | '>' | '<' | '>=' | '<='
  createdBy?: string
  createdByOperator?: '=' | '!='
  updatedBy?: string
  updatedByOperator?: '=' | '!='
  createdByUserId?: string
  createdByUserIdOperator?: '=' | '!='
  updatedByUserId?: string
  updatedByUserIdOperator?: '=' | '!='
  
  // Common parameters
  includeArchived?: boolean
  exportFormat: 'csv' | 'json'
  includeElements?: boolean
  maxResults?: number
}

interface FormAssetSchema {
  // Search by ID
  searchById: {
    type: 'string'
    required: false
    description: 'Search for specific form(s) by ID - use comma-separated values for multiple IDs'
    category: 'basic'
  }
  
  // Search by Criteria fields
  formName: {
    type: 'string'
    required: false
    description: 'Form name to search for (automatically uses wildcard matching)'
    category: 'basic'
  }
  createdAt: {
    type: 'string'
    required: false
    description: 'Created date (YYYY-MM-DD format)'
    category: 'advanced'
  }
  createdAtOperator: {
    type: 'string'
    required: false
    enum: ['=', '!=', '>', '<', '>=', '<=']
    default: '='
    description: 'Operator for created date search'
    category: 'advanced'
  }
  updatedAt: {
    type: 'string'
    required: false
    description: 'Updated date (YYYY-MM-DD format)'
    category: 'advanced'
  }
  updatedAtOperator: {
    type: 'string'
    required: false
    enum: ['=', '!=', '>', '<', '>=', '<=']
    default: '='
    description: 'Operator for updated date search'
    category: 'advanced'
  }
  createdBy: {
    type: 'string'
    required: false
    description: 'Creator username (login name)'
    category: 'advanced'
  }
  createdByOperator: {
    type: 'string'
    required: false
    enum: ['=', '!=']
    default: '='
    description: 'Operator for created by search'
    category: 'advanced'
  }
  updatedBy: {
    type: 'string'
    required: false
    description: 'Updater username (login name)'
    category: 'advanced'
  }
  updatedByOperator: {
    type: 'string'
    required: false
    enum: ['=', '!=']
    default: '='
    description: 'Operator for updated by search'
    category: 'advanced'
  }
  createdByUserId: {
    type: 'string'
    required: false
    description: 'Creator user ID'
    category: 'advanced'
  }
  createdByUserIdOperator: {
    type: 'string'
    required: false
    enum: ['=', '!=']
    default: '='
    description: 'Operator for creator user ID search'
    category: 'advanced'
  }
  updatedByUserId: {
    type: 'string'
    required: false
    description: 'Updater user ID'
    category: 'advanced'
  }
  updatedByUserIdOperator: {
    type: 'string'
    required: false
    enum: ['=', '!=']
    default: '='
    description: 'Operator for updater user ID search'
    category: 'advanced'
  }
  
  // Common parameters
  includeArchived: {
    type: 'boolean'
    required: false
    default: false
    description: 'Include archived forms in results'
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
  includeElements: {
    type: 'boolean'
    required: false
    default: true
    description: 'Include form elements and field details'
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

class FormAssetTool extends BaseTool {
  constructor() {
    const config: ToolConfig = {
      id: 'form-asset-tool',
      name: 'Form Asset Management',
      description: 'Search for form assets and export detailed API information',
      icon: 'FileText',
      path: '/form-assets',
      category: 'assets',
      features: [
        'Advanced search by multiple fields',
        'Date range filtering (created/updated)',
        'Form group and creator filtering',
        'Form elements and field analysis',
        'Export to CSV with enhanced fields',
        'Field type and validation tracking'
      ],
      requiresAuth: true,
      version: '2.0.0'
    }
    super(config)
  }

  validateParameters(parameters: FormAssetParameters): boolean {
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
    if (parameters.formName !== undefined && 
        !ParameterValidator.isString(parameters.formName)) {
      return false
    }

    if (parameters.searchById !== undefined && 
        !ParameterValidator.isString(parameters.searchById)) {
      return false
    }

    return true
  }

  getParameterSchema(): FormAssetSchema {
    return {
      // Search by ID
      searchById: {
        type: 'string',
        required: false,
        description: 'Search for specific form(s) by ID - use comma-separated values for multiple IDs',
        category: 'basic'
      },
      
      // Search by Criteria fields
      formName: {
        type: 'string',
        required: false,
        description: 'Form name to search for (automatically uses wildcard matching)',
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
        description: 'Include archived forms in results',
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
      includeElements: {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Include form elements and field details',
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

  async execute(context: ToolExecutionContext, parameters: FormAssetParameters): Promise<ToolResult> {
    try {
      // Initialize API service if needed
      if (!eloquaApiService) {
        throw new Error('Eloqua API service not initialized')
      }

      const {
        searchById,
        formName,
        createdAt,
        createdAtOperator = '=',
        updatedAt,
        updatedAtOperator = '=',
        createdBy,
        createdByOperator = '=',
        updatedBy,
        updatedByOperator = '=',
        createdByUserId,
        createdByUserIdOperator = '=',
        updatedByUserId,
        updatedByUserIdOperator = '=',
        includeArchived = false,
        exportFormat = 'csv',
        includeElements = true,
        maxResults = 25
      } = parameters

      context.showProgress('Searching for form assets...')

      // Handle ID search differently
      let forms = []
      
      if (searchById) {
        // If searching by ID, handle multiple comma-separated IDs
        const formIds = searchById.split(',').map(id => id.trim()).filter(id => id.length > 0)
        
        context.showProgress(`Fetching ${formIds.length} form(s) by ID...`)
        
        for (let i = 0; i < formIds.length; i++) {
          const formId = formIds[i]
          try {
            context.showProgress(`Fetching form ${i + 1}/${formIds.length}: ID ${formId}`)
            const formDetails = await eloquaApiService.getFormDetailsV2(formId, 'complete')
            forms.push(formDetails)
          } catch (error) {
            console.warn(`Form with ID ${formId} not found:`, error)
            // Continue with other IDs instead of failing completely
          }
        }
        
        if (forms.length === 0) {
          return {
            success: false,
            error: `No forms found for the provided ID(s): ${searchById}`
          }
        }
      } else {
        // Build search query for criteria-based search
        const searchQuery = this.buildSearchQuery({
          formName,
          createdAt,
          createdAtOperator,
          updatedAt,
          updatedAtOperator,
          createdBy,
          createdByOperator,
          updatedBy,
          updatedByOperator,
          createdByUserId,
          createdByUserIdOperator,
          updatedByUserId,
          updatedByUserIdOperator
        })

        // Fetch forms with pagination for general search
        let page = 1
        const pageSize = 100
        let hasMoreResults = true

        while (hasMoreResults && forms.length < maxResults) {
          const remaining = maxResults - forms.length
          const currentPageSize = Math.min(pageSize, remaining)

          const response = await eloquaApiService.getFormsV2(searchQuery, page, currentPageSize)

          if (response.elements && response.elements.length > 0) {
            forms.push(...response.elements)
            
            // Check if we have more results
            hasMoreResults = response.elements.length === currentPageSize && 
                            response.page < response.pageCount
            page++
          } else {
            hasMoreResults = false
          }

          context.showProgress(`Found ${forms.length} forms...`)
        }
      }

      if (forms.length === 0) {
        return {
          success: false,
          error: 'No forms found matching the specified criteria'
        }
      }

      context.showProgress('Processing form data...')

      // Process forms for export
      const processedForms = await this.processFormsForExport(
        forms,
        includeElements,
        context
      )

      // Filter results based on parameters
      let filteredForms = processedForms

      if (!includeArchived) {
        filteredForms = filteredForms.filter(form => !form.isArchived)
      }

      context.showProgress('Preparing results...')

      return {
        success: true,
        data: filteredForms,
        message: `Successfully found ${filteredForms.length} forms`
        // exportFormat is available in parameters for UI use
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private buildSearchQuery(params: any): string {
    const criteria = []

    // Form name search (automatic wildcard matching like Email Asset Tool)
    if (params.formName) {
      criteria.push(`name='*${params.formName}*'`)
    }

    // Date filters
    if (params.createdAt) {
      const timestamp = this.convertDateToTimestamp(params.createdAt)
      if (timestamp) {
        criteria.push(`createdAt${params.createdAtOperator}'${timestamp}'`)
      }
    }

    if (params.updatedAt) {
      const timestamp = this.convertDateToTimestamp(params.updatedAt)
      if (timestamp) {
        criteria.push(`updatedAt${params.updatedAtOperator}'${timestamp}'`)
      }
    }

    // User filters
    if (params.createdBy) {
      const operator = params.createdByOperator || '='
      criteria.push(`createdBy${operator}'${params.createdBy}'`)
    }

    if (params.updatedBy) {
      const operator = params.updatedByOperator || '='
      criteria.push(`updatedBy${operator}'${params.updatedBy}'`)
    }

    // ID filters
    if (params.createdByUserId) {
      criteria.push(`createdByUserId${params.createdByUserIdOperator}'${params.createdByUserId}'`)
    }

    if (params.updatedByUserId) {
      criteria.push(`updatedByUserId${params.updatedByUserIdOperator}'${params.updatedByUserId}'`)
    }

    return criteria.join(' AND ')
  }

  private convertDateToTimestamp(dateInput: string): number | null {
    try {
      // If it's already a timestamp
      if (/^\d+$/.test(dateInput)) {
        return parseInt(dateInput)
      }
      
      // If it's a date string (YYYY-MM-DD)
      const date = new Date(dateInput)
      if (!isNaN(date.getTime())) {
        return Math.floor(date.getTime() / 1000)
      }
      
      return null
    } catch {
      return null
    }
  }

  private async processFormsForExport(
    forms: any[],
    includeElements: boolean,
    context: ToolExecutionContext
  ): Promise<any[]> {
    const processedForms = []

    for (let i = 0; i < forms.length; i++) {
      const form = forms[i]
      
      context.showProgress(`Processing form ${i + 1}/${forms.length}: ${form.name}`)

      const processedForm = {
        id: form.id,
        name: form.name,
        htmlName: form.htmlName,
        description: form.description,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
        createdBy: form.createdBy,
        updatedBy: form.updatedBy,
        createdByName: form.createdByName,
        updatedByName: form.updatedByName,
        folderId: form.folderId,
        folderName: form.folderName,
        isArchived: form.archived === 'true' || form.archived === true,
        permissions: Array.isArray(form.permissions) ? form.permissions.join(', ') : '',
        currentStatus: form.currentStatus,
        depth: form.depth,
        submitMessage: form.submitFailedLandingPageId,
        isResponsive: form.isResponsive === 'true' || form.isResponsive === true,
        processingType: form.processingType,
        style: form.style,
        customCSS: form.customCSS,
        isHidden: form.isHidden === 'true' || form.isHidden === true,
        isFormSpamProtectionEnabled: form.isFormSpamProtectionEnabled === 'true' || form.isFormSpamProtectionEnabled === true,
        externalIntegrationUrl: form.externalIntegrationUrl,
        fieldCount: 0,
        requiredFieldCount: 0,
        fieldTypes: '',
        elements: '',
        processingStepsCount: 0,
        processingStepTypes: ''
      }

      // Process elements if they exist
      if (form.elements && Array.isArray(form.elements)) {
        processedForm.fieldCount = form.elements.length
        processedForm.requiredFieldCount = form.elements.filter((el: any) => 
          el.validations?.isRequired === 'true' || el.validations?.isRequired === true
        ).length
        
        // Extract field types
        const fieldTypes = [...new Set(form.elements.map((el: any) => el.type).filter(Boolean))]
        processedForm.fieldTypes = fieldTypes.join(', ')
        
        // Create summary of elements
        if (includeElements) {
          const elementSummary = form.elements.map((el: any) => {
            const required = el.validations?.isRequired ? '[REQ]' : ''
            return `${el.name || el.htmlName || 'Unnamed'} (${el.type || 'Unknown'})${required}`
          }).join('; ')
          processedForm.elements = elementSummary
        }
      }

      // Process processing steps if they exist
      if (form.processingSteps && Array.isArray(form.processingSteps)) {
        processedForm.processingStepsCount = form.processingSteps.length
        
        // Extract processing step types
        const stepTypes = [...new Set(form.processingSteps.map((step: any) => step.type).filter(Boolean))]
        processedForm.processingStepTypes = stepTypes.join(', ')
      }

      // If we need more details and don't have them, fetch the complete form
      if (includeElements && !form.elements && form.id) {
        try {
          const formDetails = await eloquaApiService.getFormDetailsV2(form.id, 'complete')
          
          if (formDetails.elements) {
            processedForm.fieldCount = formDetails.elements.length
            processedForm.requiredFieldCount = formDetails.elements.filter((el: any) => 
              el.validations?.isRequired === 'true' || el.validations?.isRequired === true
            ).length
            
            // Extract field types
            const fieldTypes = [...new Set(formDetails.elements.map((el: any) => el.type).filter(Boolean))]
            processedForm.fieldTypes = fieldTypes.join(', ')
            
            // Create summary of elements
            const elementSummary = formDetails.elements.map((el: any) => {
              const required = el.validations?.isRequired ? '[REQ]' : ''
              return `${el.name || el.htmlName || 'Unnamed'} (${el.type || 'Unknown'})${required}`
            }).join('; ')
            processedForm.elements = elementSummary
          }

          if (formDetails.processingSteps) {
            processedForm.processingStepsCount = formDetails.processingSteps.length
            const stepTypes = [...new Set(formDetails.processingSteps.map((step: any) => step.type).filter(Boolean))]
            processedForm.processingStepTypes = stepTypes.join(', ')
          }
          
        } catch (error) {
          console.error(`Error fetching form details for ${form.id}:`, error)
          processedForm.elements = 'Error fetching elements'
        }
      }

      processedForms.push(processedForm)
    }

    return processedForms
  }

  getComponent(): ToolComponent {
    return {
      render: () => null // Will be implemented with React component
    }
  }
}

export default FormAssetTool