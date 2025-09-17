import { BaseTool, ToolConfig, ToolExecutionContext, ToolResult, ToolComponent, ParameterValidator } from '../shared/toolFramework'
import eloquaApiService from '../renderer/services/eloquaApi'
import { formTemplates, formExamples } from './FormTemplates'

interface FormManagementParameters {
  operation: 'create' | 'update' | 'delete' | 'copy' | 'analyze' | 'manage-fields' | 'export-submissions' | 'get-templates'
  formId?: string
  formData?: any
  newName?: string
  targetFolderId?: string
  fieldId?: string
  fieldData?: any
  startDate?: string
  endDate?: string
  exportFormat?: 'csv' | 'json'
  maxResults?: number
  templateType?: 'forms' | 'fields' | 'validations' | 'examples'
}

interface FormManagementSchema {
  operation: {
    type: 'string'
    required: true
    enum: ['create', 'update', 'delete', 'copy', 'analyze', 'manage-fields', 'export-submissions', 'get-templates']
    default: 'analyze'
    description: 'Form management operation to perform'
    category: 'basic'
  }
  formId: {
    type: 'string'
    required: false
    description: 'Form ID (required for update, delete, copy, analyze, manage-fields, export-submissions)'
    category: 'basic'
  }
  formData: {
    type: 'object'
    required: false
    description: 'Form data for create/update operations (JSON object)'
    category: 'advanced'
  }
  newName: {
    type: 'string'
    required: false
    description: 'New name for copy operation'
    category: 'basic'
  }
  targetFolderId: {
    type: 'string'
    required: false
    description: 'Target folder ID for copy operation'
    category: 'basic'
  }
  fieldId: {
    type: 'string'
    required: false
    description: 'Field ID for field management operations'
    category: 'basic'
  }
  fieldData: {
    type: 'object'
    required: false
    description: 'Field data for field management (JSON object)'
    category: 'advanced'
  }
  startDate: {
    type: 'string'
    required: false
    description: 'Start date for analytics/submissions (YYYY-MM-DD)'
    category: 'basic'
  }
  endDate: {
    type: 'string'
    required: false
    description: 'End date for analytics/submissions (YYYY-MM-DD)'
    category: 'basic'
  }
  exportFormat: {
    type: 'string'
    required: false
    enum: ['csv', 'json']
    default: 'json'
    description: 'Export format for results'
    category: 'basic'
  }
  maxResults: {
    type: 'number'
    required: false
    default: 1000
    min: 1
    max: 10000
    description: 'Maximum number of results'
    category: 'basic'
  }
}

class FormManagementTool extends BaseTool {
  constructor() {
    const config: ToolConfig = {
      id: 'form-management-tool',
      name: 'Form Management Center',
      description: 'Comprehensive form management: create, update, delete, copy, analyze, and manage fields',
      icon: 'Wrench',
      path: '/form-management',
      category: 'management',
      features: [
        'Create new forms with custom fields',
        'Update existing form properties',
        'Copy forms to different folders',
        'Delete forms with safety checks',
        'Form analytics and submission data',
        'Field management (add, update, remove)',
        'Submission data export',
        'Performance metrics and insights'
      ],
      requiresAuth: true,
      version: '1.0.0'
    }
    super(config)
  }

  validateParameters(parameters: FormManagementParameters): boolean {
    if (!parameters) return false

    // Validate operation
    if (!ParameterValidator.isRequired(parameters.operation) ||
        !['create', 'update', 'delete', 'copy', 'analyze', 'manage-fields', 'export-submissions', 'get-templates'].includes(parameters.operation)) {
      return false
    }

    // Validate form ID for operations that require it
    const operationsRequiringFormId = ['update', 'delete', 'copy', 'analyze', 'manage-fields', 'export-submissions']
    if (operationsRequiringFormId.includes(parameters.operation) && 
        !ParameterValidator.isRequired(parameters.formId)) {
      return false
    }

    // Validate form data for create/update operations
    if ((parameters.operation === 'create' || parameters.operation === 'update') && 
        !parameters.formData) {
      return false
    }

    // Validate new name for copy operation
    if (parameters.operation === 'copy' && !ParameterValidator.isRequired(parameters.newName)) {
      return false
    }

    return true
  }

  getParameterSchema(): FormManagementSchema {
    return {
      operation: {
        type: 'string',
        required: true,
        enum: ['create', 'update', 'delete', 'copy', 'analyze', 'manage-fields', 'export-submissions'],
        default: 'analyze',
        description: 'Form management operation to perform',
        category: 'basic'
      },
      formId: {
        type: 'string',
        required: false,
        description: 'Form ID (required for update, delete, copy, analyze, manage-fields, export-submissions)',
        category: 'basic'
      },
      formData: {
        type: 'object',
        required: false,
        description: 'Form data for create/update operations (JSON object)',
        category: 'advanced'
      },
      newName: {
        type: 'string',
        required: false,
        description: 'New name for copy operation',
        category: 'basic'
      },
      targetFolderId: {
        type: 'string',
        required: false,
        description: 'Target folder ID for copy operation',
        category: 'basic'
      },
      fieldId: {
        type: 'string',
        required: false,
        description: 'Field ID for field management operations',
        category: 'basic'
      },
      fieldData: {
        type: 'object',
        required: false,
        description: 'Field data for field management (JSON object)',
        category: 'advanced'
      },
      startDate: {
        type: 'string',
        required: false,
        description: 'Start date for analytics/submissions (YYYY-MM-DD)',
        category: 'basic'
      },
      endDate: {
        type: 'string',
        required: false,
        description: 'End date for analytics/submissions (YYYY-MM-DD)',
        category: 'basic'
      },
      exportFormat: {
        type: 'string',
        required: false,
        enum: ['csv', 'json'],
        default: 'json',
        description: 'Export format for results',
        category: 'basic'
      },
      maxResults: {
        type: 'number',
        required: false,
        default: 1000,
        min: 1,
        max: 10000,
        description: 'Maximum number of results',
        category: 'basic'
      },
      templateType: {
        type: 'string',
        required: false,
        enum: ['forms', 'fields', 'validations', 'examples'],
        default: 'examples',
        description: 'Type of templates to retrieve',
        category: 'basic'
      }
    }
  }

  async execute(context: ToolExecutionContext, parameters: FormManagementParameters): Promise<ToolResult> {
    try {
      if (!eloquaApiService) {
        throw new Error('Eloqua API service not initialized')
      }

      const { operation } = parameters

      switch (operation) {
        case 'create':
          return await this.createForm(context, parameters)
        case 'update':
          return await this.updateForm(context, parameters)
        case 'delete':
          return await this.deleteForm(context, parameters)
        case 'copy':
          return await this.copyForm(context, parameters)
        case 'analyze':
          return await this.analyzeForm(context, parameters)
        case 'manage-fields':
          return await this.manageFields(context, parameters)
        case 'export-submissions':
          return await this.exportSubmissions(context, parameters)
        case 'get-templates':
          return await this.getTemplates(context, parameters)
        default:
          throw new Error(`Unknown operation: ${operation}`)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private async createForm(context: ToolExecutionContext, parameters: FormManagementParameters): Promise<ToolResult> {
    context.showProgress('Creating new form...')
    
    const result = await eloquaApiService.createForm(parameters.formData)
    
    return {
      success: true,
      data: result,
      message: `Successfully created form: ${result.name} (ID: ${result.id})`
    }
  }

  private async updateForm(context: ToolExecutionContext, parameters: FormManagementParameters): Promise<ToolResult> {
    context.showProgress(`Updating form ${parameters.formId}...`)
    
    const result = await eloquaApiService.updateForm(parameters.formId!, parameters.formData)
    
    return {
      success: true,
      data: result,
      message: `Successfully updated form: ${result.name} (ID: ${result.id})`
    }
  }

  private async deleteForm(context: ToolExecutionContext, parameters: FormManagementParameters): Promise<ToolResult> {
    context.showProgress(`Deleting form ${parameters.formId}...`)
    
    // Get form details first for confirmation
    const form = await eloquaApiService.getFormDetails(parameters.formId!)
    
    // Perform deletion
    await eloquaApiService.deleteForm(parameters.formId!)
    
    return {
      success: true,
      data: { deletedFormId: parameters.formId, formName: form.name },
      message: `Successfully deleted form: ${form.name} (ID: ${parameters.formId})`
    }
  }

  private async copyForm(context: ToolExecutionContext, parameters: FormManagementParameters): Promise<ToolResult> {
    context.showProgress(`Copying form ${parameters.formId}...`)
    
    const result = await eloquaApiService.copyForm(
      parameters.formId!,
      parameters.newName!,
      parameters.targetFolderId
    )
    
    return {
      success: true,
      data: result,
      message: `Successfully copied form to: ${result.name} (ID: ${result.id})`
    }
  }

  private async analyzeForm(context: ToolExecutionContext, parameters: FormManagementParameters): Promise<ToolResult> {
    context.showProgress(`Analyzing form ${parameters.formId}...`)
    
    // Get form details
    const form = await eloquaApiService.getFormDetails(parameters.formId!)
    
    // Get form analytics
    context.showProgress('Fetching form analytics...')
    const analytics = await eloquaApiService.getFormAnalytics(
      parameters.formId!,
      parameters.startDate,
      parameters.endDate
    )
    
    // Get form fields
    context.showProgress('Analyzing form fields...')
    const fields = await eloquaApiService.getFormFields(parameters.formId!)
    
    // Calculate field statistics
    const fieldStats = {
      totalFields: fields.length,
      requiredFields: fields.filter((field: any) => field.validations?.isRequired).length,
      fieldTypes: this.getFieldTypeDistribution(fields),
      fieldsWithValidation: fields.filter((field: any) => field.validations && Object.keys(field.validations).length > 0).length
    }
    
    const analysisResult = {
      form: {
        id: form.id,
        name: form.name,
        htmlName: form.htmlName,
        description: form.description,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
        isResponsive: form.isResponsive,
        processingType: form.processingType
      },
      analytics,
      fieldStats,
      fields: fields.map((field: any) => ({
        id: field.id,
        name: field.name,
        type: field.type,
        htmlName: field.htmlName,
        isRequired: field.validations?.isRequired || false,
        validations: field.validations || {},
        options: field.options || []
      }))
    }
    
    return {
      success: true,
      data: analysisResult,
      message: `Successfully analyzed form: ${form.name} (${fieldStats.totalFields} fields, ${analytics.totalSubmissions} submissions)`
    }
  }

  private async manageFields(context: ToolExecutionContext, parameters: FormManagementParameters): Promise<ToolResult> {
    context.showProgress(`Managing fields for form ${parameters.formId}...`)
    
    if (!parameters.fieldData) {
      // Just return current fields
      const fields = await eloquaApiService.getFormFields(parameters.formId!)
      return {
        success: true,
        data: { fields },
        message: `Form has ${fields.length} fields`
      }
    }
    
    let result
    const { fieldData } = parameters
    
    if (fieldData.action === 'add') {
      context.showProgress('Adding new field...')
      result = await eloquaApiService.addFormField(parameters.formId!, fieldData.field)
    } else if (fieldData.action === 'update' && parameters.fieldId) {
      context.showProgress('Updating field...')
      result = await eloquaApiService.updateFormField(parameters.formId!, parameters.fieldId, fieldData.field)
    } else if (fieldData.action === 'remove' && parameters.fieldId) {
      context.showProgress('Removing field...')
      result = await eloquaApiService.removeFormField(parameters.formId!, parameters.fieldId)
    } else {
      throw new Error('Invalid field management action or missing fieldId')
    }
    
    return {
      success: true,
      data: result,
      message: `Successfully ${fieldData.action}d field`
    }
  }

  private async exportSubmissions(context: ToolExecutionContext, parameters: FormManagementParameters): Promise<ToolResult> {
    context.showProgress(`Exporting submissions for form ${parameters.formId}...`)
    
    const submissions = await eloquaApiService.getFormSubmissions(
      parameters.formId!,
      parameters.startDate,
      parameters.endDate,
      1,
      parameters.maxResults || 1000
    )
    
    // Process submissions for export
    const processedSubmissions = this.processSubmissionsForExport(submissions.elements || [])
    
    return {
      success: true,
      data: {
        submissions: processedSubmissions,
        totalCount: submissions.totalResults || 0,
        exportFormat: parameters.exportFormat || 'json',
        dateRange: {
          startDate: parameters.startDate,
          endDate: parameters.endDate
        }
      },
      message: `Successfully exported ${processedSubmissions.length} submissions`
    }
  }

  private getFieldTypeDistribution(fields: any[]): Record<string, number> {
    const distribution: Record<string, number> = {}
    
    fields.forEach(field => {
      const type = field.type || 'Unknown'
      distribution[type] = (distribution[type] || 0) + 1
    })
    
    return distribution
  }

  private processSubmissionsForExport(submissions: any[]): any[] {
    return submissions.map(submission => ({
      id: submission.id,
      submittedAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      contactId: submission.contactId,
      fields: submission.fieldValues ? submission.fieldValues.reduce((acc: any, field: any) => {
        acc[field.name || field.id] = field.value
        return acc
      }, {}) : {},
      rawData: submission
    }))
  }

  private async getTemplates(context: ToolExecutionContext, parameters: FormManagementParameters): Promise<ToolResult> {
    context.showProgress('Retrieving form templates...')
    
    const { templateType = 'examples' } = parameters
    
    let templateData
    switch (templateType) {
      case 'forms':
        templateData = formTemplates.basicForm
        break
      case 'fields':
        templateData = formTemplates.fieldTemplates
        break
      case 'validations':
        templateData = formTemplates.validationTemplates
        break
      case 'examples':
        templateData = formExamples
        break
      default:
        templateData = formExamples
    }
    
    return {
      success: true,
      data: {
        templateType,
        templates: templateData,
        description: this.getTemplateDescription(templateType)
      },
      message: `Retrieved ${templateType} templates successfully`
    }
  }

  private getTemplateDescription(templateType: string): string {
    switch (templateType) {
      case 'forms':
        return 'Basic form structure template for creating new forms'
      case 'fields':
        return 'Field templates for common form field types (text, email, select, etc.)'
      case 'validations':
        return 'Common validation patterns for form fields'
      case 'examples':
        return 'Complete examples of form management operations'
      default:
        return 'Form templates and examples'
    }
  }

  getComponent(): ToolComponent {
    return {
      render: () => null // Will be implemented with React component
    }
  }
}

export default FormManagementTool