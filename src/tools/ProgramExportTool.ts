import { BaseTool, ToolConfig, ToolExecutionContext, ToolResult, ToolComponent, ParameterValidator } from '../shared/toolFramework'
import eloquaApiService from '../renderer/services/eloquaApi'

interface ProgramExportParameters {
  operation?: 'export-programs' | 'get-usage-guide'
  filename?: string
  format?: 'csv' | 'json'
}

interface Program {
  id: string
  name: string
  description: string
  folderId: string
  folderName: string
  isActive: boolean
  isReadOnly: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
  memberCount: number
  runAsUserId: string
  defaultMembershipPolicyId: string
  elements: any[]
}

interface ProgramExportSummary {
  totalPrograms: number
  activePrograms: number
  inactivePrograms: number
  exportedPrograms: number
  filename: string
  format: string
}

interface ProgramExportSchema {
  operation: {
    type: 'string'
    required: false
    enum: ['export-programs', 'get-usage-guide']
    default: 'export-programs'
    description: 'Operation to perform'
    category: 'basic'
  }
  filename: {
    type: 'string'
    required: false
    default: 'programs-export'
    description: 'Name for the exported file (without extension)'
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

class ProgramExportTool extends BaseTool {
  constructor() {
    const config: ToolConfig = {
      id: 'program-export-tool',
      name: 'Program Export',
      description: 'Export all Eloqua programs to CSV or JSON format',
      icon: 'Download',
      path: '/program-export',
      category: 'data-export',
      features: [
        'Export all programs to CSV or JSON',
        'Detailed program information including status and membership',
        'Folder organization data',
        'Custom filename support',
        'Progress tracking for large datasets',
        'Comprehensive program metadata export'
      ],
      requiresAuth: true,
      version: '1.0.0'
    }
    super(config)
  }

  validateParameters(parameters: ProgramExportParameters): boolean {
    if (!parameters) return false

    // Validate filename if provided
    if (parameters.filename !== undefined && 
        (!ParameterValidator.isString(parameters.filename) || 
         parameters.filename.trim().length === 0)) {
      return false
    }

    return true
  }

  getParameterSchema(): ProgramExportSchema {
    return {
      operation: {
        type: 'string',
        required: false,
        enum: ['export-programs', 'get-usage-guide'],
        default: 'export-programs',
        description: 'Operation to perform',
        category: 'basic'
      },
      filename: {
        type: 'string',
        required: false,
        default: 'programs-export',
        description: 'Name for the exported file (without extension)',
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

  async execute(context: ToolExecutionContext, parameters: ProgramExportParameters): Promise<ToolResult> {
    try {
      // Initialize API service if needed
      if (!eloquaApiService) {
        throw new Error('Eloqua API service not initialized')
      }

      const {
        operation = 'export-programs',
        filename = 'programs-export',
        format = 'csv'
      } = parameters

      switch (operation) {
        case 'export-programs':
          return await this.exportPrograms(context, {
            filename,
            format
          })
        case 'get-usage-guide':
          return this.getUsageGuide()
        default:
          return await this.exportPrograms(context, {
            filename,
            format
          })
      }
    } catch (error) {
      console.error('Program Export Tool Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private async exportPrograms(context: ToolExecutionContext, parameters: {
    filename: string
    format: string
  }): Promise<ToolResult> {
    const startTime = Date.now()
    
    try {
      context.showProgress('Fetching programs from Eloqua...')
      
      // Fetch all programs
      const response = await eloquaApiService.makeRequest('GET', '/api/rest/2.0/assets/programs', {
        depth: 'complete',
        count: 1000, // Get up to 1000 programs
        orderBy: 'name'
      })

      if (!response.elements || !Array.isArray(response.elements)) {
        throw new Error('Invalid response format from Eloqua API')
      }

      const programs: Program[] = response.elements.map((program: any) => ({
        id: program.id || '',
        name: program.name || '',
        description: program.description || '',
        folderId: program.folderId || '',
        folderName: program.folderName || '',
        isActive: program.isActive || false,
        isReadOnly: program.isReadOnly || false,
        createdAt: program.createdAt || '',
        updatedAt: program.updatedAt || '',
        createdBy: program.createdBy || '',
        updatedBy: program.updatedBy || '',
        memberCount: program.memberCount || 0,
        runAsUserId: program.runAsUserId || '',
        defaultMembershipPolicyId: program.defaultMembershipPolicyId || '',
        elements: program.elements || []
      }))

      context.showProgress(`Processing ${programs.length} programs...`)

      // Generate export data
      let exportData: string
      let fileExtension: string
      
      if (parameters.format === 'json') {
        exportData = JSON.stringify(programs, null, 2)
        fileExtension = 'json'
      } else {
        // Generate CSV
        const csvHeaders = [
          'ID',
          'Name',
          'Description',
          'Folder ID',
          'Folder Name',
          'Is Active',
          'Is Read Only',
          'Created At',
          'Updated At',
          'Created By',
          'Updated By',
          'Member Count',
          'Run As User ID',
          'Default Membership Policy ID',
          'Element Count'
        ]

        const csvRows = programs.map(program => [
          program.id,
          `"${program.name.replace(/"/g, '""')}"`,
          `"${(program.description || '').replace(/"/g, '""')}"`,
          program.folderId,
          `"${(program.folderName || '').replace(/"/g, '""')}"`,
          program.isActive,
          program.isReadOnly,
          program.createdAt,
          program.updatedAt,
          program.createdBy,
          program.updatedBy,
          program.memberCount,
          program.runAsUserId,
          program.defaultMembershipPolicyId,
          program.elements.length
        ])

        exportData = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n')
        fileExtension = 'csv'
      }

      // Create filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')
      const finalFilename = `${parameters.filename}-${timestamp}.${fileExtension}`

      context.showProgress('Generating export file...')

      // Calculate summary statistics
      const summary: ProgramExportSummary = {
        totalPrograms: programs.length,
        activePrograms: programs.filter(p => p.isActive).length,
        inactivePrograms: programs.filter(p => !p.isActive).length,
        exportedPrograms: programs.length,
        filename: finalFilename,
        format: parameters.format
      }

      const endTime = Date.now()
      const processingTime = endTime - startTime

      return {
        success: true,
        message: `Program export completed. ${summary.exportedPrograms} programs exported to ${finalFilename}`,
        data: {
          summary,
          exportData,
          filename: finalFilename,
          processingTime,
          programs: programs.slice(0, 10) // Preview of first 10 programs
        }
      }

    } catch (error) {
      return {
        success: false,
        error: `Program export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private getUsageGuide(): ToolResult {
    return {
      success: true,
      message: 'Program Export Usage Guide',
      data: {
        guide: {
          title: 'Program Export Tool',
          description: 'Export all Eloqua programs with detailed metadata to CSV or JSON format.',
          
          operations: [
            {
              name: 'Export Programs',
              description: 'Export all programs to a downloadable file',
              parameters: ['filename', 'format']
            }
          ],
          
          exportFormats: {
            csv: {
              description: 'Comma-separated values format, ideal for Excel and data analysis',
              headers: [
                'ID', 'Name', 'Description', 'Folder ID', 'Folder Name',
                'Is Active', 'Is Read Only', 'Created At', 'Updated At',
                'Created By', 'Updated By', 'Member Count', 'Run As User ID',
                'Default Membership Policy ID', 'Element Count'
              ]
            },
            json: {
              description: 'JavaScript Object Notation format, ideal for programmatic processing',
              structure: 'Array of program objects with all metadata including elements'
            }
          },
          
          parameters: {
            filename: 'Base name for the exported file (timestamp will be added automatically)',
            format: 'Export format: csv or json (default: csv)'
          },
          
          examples: [
            {
              name: 'Export all programs to CSV',
              parameters: {
                operation: 'export-programs',
                filename: 'all-programs',
                format: 'csv'
              }
            },
            {
              name: 'Export programs to JSON',
              parameters: {
                operation: 'export-programs',
                filename: 'programs-backup',
                format: 'json'
              }
            }
          ],
          
          features: [
            'Exports all program metadata including status and membership data',
            'Includes folder organization information',
            'Automatic timestamp appending to filenames',
            'Progress tracking for large datasets',
            'CSV format compatible with Excel and data analysis tools',
            'JSON format for programmatic processing and backup'
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

export default ProgramExportTool