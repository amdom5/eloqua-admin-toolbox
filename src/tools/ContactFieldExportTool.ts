import { BaseTool, ToolConfig, ToolExecutionContext, ToolResult, ToolComponent, ParameterValidator } from '../shared/toolFramework'
import eloquaApiService from '../renderer/services/eloquaApi'

interface ContactFieldExportParameters {
  operation?: 'export-fields' | 'get-usage-guide'
  filename?: string
  includeSystemFields?: boolean
  format?: 'csv' | 'json'
}

interface ContactField {
  id: string
  name: string
  internalName: string
  dataType: string
  displayType: string
  isRequired: boolean
  isReadOnly: boolean
  isSystem: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
  defaultValue?: string
  optionListId?: string
}

interface ContactFieldExportSummary {
  totalFields: number
  systemFields: number
  customFields: number
  exportedFields: number
  filename: string
  format: string
}

interface ContactFieldExportSchema {
  operation: {
    type: 'string'
    required: false
    enum: ['export-fields', 'get-usage-guide']
    default: 'export-fields'
    description: 'Operation to perform'
    category: 'basic'
  }
  filename: {
    type: 'string'
    required: false
    default: 'contact-fields-export'
    description: 'Name for the exported file (without extension)'
    category: 'basic'
  }
  includeSystemFields: {
    type: 'boolean'
    required: false
    default: true
    description: 'Include system fields in the export'
    category: 'basic'
  }
  format: {
    type: 'string'
    required: false
    enum: ['csv', 'json']
    default: 'csv'
    description: 'Export format'
    category: 'basic'
  }
}

class ContactFieldExportTool extends BaseTool {
  constructor() {
    const config: ToolConfig = {
      id: 'contact-field-export-tool',
      name: 'Contact Field Export',
      description: 'Export all Eloqua contact fields to CSV or JSON format',
      icon: 'Download',
      path: '/contact-field-export',
      category: 'data-export',
      features: [
        'Export all contact fields to CSV or JSON',
        'Filter system vs custom fields',
        'Detailed field information including data types and properties',
        'Custom filename support',
        'Progress tracking for large datasets',
        'Comprehensive field metadata export'
      ],
      requiresAuth: true,
      version: '1.0.0'
    }
    super(config)
  }

  validateParameters(parameters: ContactFieldExportParameters): boolean {
    if (!parameters) return false

    // Validate filename if provided
    if (parameters.filename !== undefined && 
        (!ParameterValidator.isString(parameters.filename) || 
         parameters.filename.trim().length === 0)) {
      return false
    }

    return true
  }

  getParameterSchema(): ContactFieldExportSchema {
    return {
      operation: {
        type: 'string',
        required: false,
        enum: ['export-fields', 'get-usage-guide'],
        default: 'export-fields',
        description: 'Operation to perform',
        category: 'basic'
      },
      filename: {
        type: 'string',
        required: false,
        default: 'contact-fields-export',
        description: 'Name for the exported file (without extension)',
        category: 'basic'
      },
      includeSystemFields: {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Include system fields in the export',
        category: 'basic'
      },
      format: {
        type: 'string',
        required: false,
        enum: ['csv', 'json'],
        default: 'csv',
        description: 'Export format',
        category: 'basic'
      }
    }
  }

  async execute(context: ToolExecutionContext, parameters: ContactFieldExportParameters): Promise<ToolResult> {
    try {
      // Initialize API service if needed
      if (!eloquaApiService) {
        throw new Error('Eloqua API service not initialized')
      }

      const {
        operation = 'export-fields',
        filename = 'contact-fields-export',
        includeSystemFields = true,
        format = 'csv'
      } = parameters

      switch (operation) {
        case 'export-fields':
          return await this.exportContactFields(context, {
            filename,
            includeSystemFields,
            format
          })
        case 'get-usage-guide':
          return this.getUsageGuide()
        default:
          return await this.exportContactFields(context, {
            filename,
            includeSystemFields,
            format
          })
      }
    } catch (error) {
      console.error('Contact Field Export Tool Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private async exportContactFields(context: ToolExecutionContext, parameters: {
    filename: string
    includeSystemFields: boolean
    format: string
  }): Promise<ToolResult> {
    const startTime = Date.now()
    
    try {
      context.showProgress('Fetching contact fields from Eloqua...')
      
      // Fetch all contact fields
      const response = await eloquaApiService.makeRequest('GET', '/api/REST/1.0/assets/contact/fields', {
        depth: 'complete',
        count: 1000, // Get up to 1000 fields
        orderBy: 'name'
      })

      if (!response.elements || !Array.isArray(response.elements)) {
        throw new Error('Invalid response format from Eloqua API')
      }

      let fields: ContactField[] = response.elements.map((field: any) => ({
        id: field.id || '',
        name: field.name || '',
        internalName: field.internalName || '',
        dataType: field.dataType || '',
        displayType: field.displayType || '',
        isRequired: field.isRequired || false,
        isReadOnly: field.isReadOnly || false,
        isSystem: field.isSystem || false,
        createdAt: field.createdAt || '',
        updatedAt: field.updatedAt || '',
        createdBy: field.createdBy || '',
        updatedBy: field.updatedBy || '',
        defaultValue: field.defaultValue || '',
        optionListId: field.optionListId || ''
      }))

      // Filter fields based on includeSystemFields setting
      if (!parameters.includeSystemFields) {
        fields = fields.filter(field => !field.isSystem)
      }

      context.showProgress(`Processing ${fields.length} contact fields...`)

      // Generate export data
      let exportData: string
      let fileExtension: string
      
      if (parameters.format === 'json') {
        exportData = JSON.stringify(fields, null, 2)
        fileExtension = 'json'
      } else {
        // Generate CSV
        const csvHeaders = [
          'ID',
          'Name',
          'Internal Name',
          'Data Type',
          'Display Type',
          'Is Required',
          'Is Read Only',
          'Is System',
          'Created At',
          'Updated At',
          'Created By',
          'Updated By',
          'Default Value',
          'Option List ID'
        ]

        const csvRows = fields.map(field => [
          field.id,
          `"${field.name.replace(/"/g, '""')}"`,
          `"${field.internalName.replace(/"/g, '""')}"`,
          field.dataType,
          field.displayType,
          field.isRequired,
          field.isReadOnly,
          field.isSystem,
          field.createdAt,
          field.updatedAt,
          field.createdBy,
          field.updatedBy,
          `"${(field.defaultValue || '').replace(/"/g, '""')}"`,
          field.optionListId || ''
        ])

        exportData = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n')
        fileExtension = 'csv'
      }

      // Create filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')
      const finalFilename = `${parameters.filename}-${timestamp}.${fileExtension}`

      context.showProgress('Generating export file...')

      // Calculate summary statistics
      const summary: ContactFieldExportSummary = {
        totalFields: response.elements.length,
        systemFields: response.elements.filter((f: any) => f.isSystem).length,
        customFields: response.elements.filter((f: any) => !f.isSystem).length,
        exportedFields: fields.length,
        filename: finalFilename,
        format: parameters.format
      }

      const endTime = Date.now()
      const processingTime = endTime - startTime

      return {
        success: true,
        message: `Contact field export completed. ${summary.exportedFields} fields exported to ${finalFilename}`,
        data: {
          summary,
          exportData,
          filename: finalFilename,
          processingTime,
          fields: fields.slice(0, 10) // Preview of first 10 fields
        }
      }

    } catch (error) {
      return {
        success: false,
        error: `Contact field export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private getUsageGuide(): ToolResult {
    return {
      success: true,
      message: 'Contact Field Export Usage Guide',
      data: {
        guide: {
          title: 'Contact Field Export Tool',
          description: 'Export all Eloqua contact fields with detailed metadata to CSV or JSON format.',
          
          operations: [
            {
              name: 'Export Fields',
              description: 'Export all contact fields to a downloadable file',
              parameters: ['filename', 'includeSystemFields', 'format']
            }
          ],
          
          exportFormats: {
            csv: {
              description: 'Comma-separated values format, ideal for Excel and data analysis',
              headers: [
                'ID', 'Name', 'Internal Name', 'Data Type', 'Display Type',
                'Is Required', 'Is Read Only', 'Is System', 'Created At',
                'Updated At', 'Created By', 'Updated By', 'Default Value', 'Option List ID'
              ]
            },
            json: {
              description: 'JavaScript Object Notation format, ideal for programmatic processing',
              structure: 'Array of contact field objects with all metadata'
            }
          },
          
          parameters: {
            filename: 'Base name for the exported file (timestamp will be added automatically)',
            includeSystemFields: 'Whether to include Eloqua system fields in the export (default: true)',
            format: 'Export format: csv or json (default: csv)'
          },
          
          examples: [
            {
              name: 'Export all fields to CSV',
              parameters: {
                operation: 'export-fields',
                filename: 'all-contact-fields',
                includeSystemFields: true,
                format: 'csv'
              }
            },
            {
              name: 'Export custom fields only to JSON',
              parameters: {
                operation: 'export-fields',
                filename: 'custom-contact-fields',
                includeSystemFields: false,
                format: 'json'
              }
            }
          ],
          
          features: [
            'Exports all contact field metadata including data types and properties',
            'Option to include or exclude system fields',
            'Automatic timestamp appending to filenames',
            'Progress tracking for large datasets',
            'CSV format compatible with Excel and data analysis tools',
            'JSON format for programmatic processing'
          ]
        }
      }
    }
  }

  getComponent(): ToolComponent {
    return {
      render: () => null // Will be implemented with React component
    }
  }
}

export default ContactFieldExportTool