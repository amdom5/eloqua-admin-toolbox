import { BaseTool, ToolConfig, ToolExecutionContext, ToolResult, ToolComponent, ParameterValidator } from '../shared/toolFramework'
import eloquaApiService from '../renderer/services/eloquaApi'

interface CampaignExportParameters {
  operation?: 'export-campaigns' | 'get-usage-guide'
  filename?: string
  format?: 'csv' | 'json'
}

interface Campaign {
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
  campaignCategory: string
  campaignType: string
  memberCount: number
  runAsUserId: string
  startAt: string
  endAt: string
  elements: any[]
}

interface CampaignExportSummary {
  totalCampaigns: number
  activeCampaigns: number
  inactiveCampaigns: number
  exportedCampaigns: number
  filename: string
  format: string
}

interface CampaignExportSchema {
  operation: {
    type: 'string'
    required: false
    enum: ['export-campaigns', 'get-usage-guide']
    default: 'export-campaigns'
    description: 'Operation to perform'
    category: 'basic'
  }
  filename: {
    type: 'string'
    required: false
    default: 'campaigns-export'
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

class CampaignExportTool extends BaseTool {
  constructor() {
    const config: ToolConfig = {
      id: 'campaign-export-tool',
      name: 'Campaign Export',
      description: 'Export all Eloqua campaigns to CSV or JSON format',
      icon: 'Download',
      path: '/campaign-export',
      category: 'data-export',
      features: [
        'Export all campaigns to CSV or JSON',
        'Detailed campaign information including type and scheduling',
        'Folder organization data',
        'Custom filename support',
        'Progress tracking for large datasets',
        'Comprehensive campaign metadata export'
      ],
      requiresAuth: true,
      version: '1.0.0'
    }
    super(config)
  }

  validateParameters(parameters: CampaignExportParameters): boolean {
    if (!parameters) return false

    // Validate filename if provided
    if (parameters.filename !== undefined && 
        (!ParameterValidator.isString(parameters.filename) || 
         parameters.filename.trim().length === 0)) {
      return false
    }

    return true
  }

  getParameterSchema(): CampaignExportSchema {
    return {
      operation: {
        type: 'string',
        required: false,
        enum: ['export-campaigns', 'get-usage-guide'],
        default: 'export-campaigns',
        description: 'Operation to perform',
        category: 'basic'
      },
      filename: {
        type: 'string',
        required: false,
        default: 'campaigns-export',
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

  async execute(context: ToolExecutionContext, parameters: CampaignExportParameters): Promise<ToolResult> {
    try {
      // Initialize API service if needed
      if (!eloquaApiService) {
        throw new Error('Eloqua API service not initialized')
      }

      const {
        operation = 'export-campaigns',
        filename = 'campaigns-export',
        format = 'csv'
      } = parameters

      switch (operation) {
        case 'export-campaigns':
          return await this.exportCampaigns(context, {
            filename,
            format
          })
        case 'get-usage-guide':
          return this.getUsageGuide()
        default:
          return await this.exportCampaigns(context, {
            filename,
            format
          })
      }
    } catch (error) {
      console.error('Campaign Export Tool Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private async exportCampaigns(context: ToolExecutionContext, parameters: {
    filename: string
    format: string
  }): Promise<ToolResult> {
    const startTime = Date.now()
    
    try {
      context.showProgress('Fetching campaigns from Eloqua...')
      
      // Fetch all campaigns
      const response = await eloquaApiService.makeRequest('GET', '/api/rest/2.0/assets/campaigns', {
        depth: 'complete',
        count: 1000, // Get up to 1000 campaigns
        orderBy: 'name'
      })

      if (!response.elements || !Array.isArray(response.elements)) {
        throw new Error('Invalid response format from Eloqua API')
      }

      const campaigns: Campaign[] = response.elements.map((campaign: any) => ({
        id: campaign.id || '',
        name: campaign.name || '',
        description: campaign.description || '',
        folderId: campaign.folderId || '',
        folderName: campaign.folderName || '',
        isActive: campaign.isActive || false,
        isReadOnly: campaign.isReadOnly || false,
        createdAt: campaign.createdAt || '',
        updatedAt: campaign.updatedAt || '',
        createdBy: campaign.createdBy || '',
        updatedBy: campaign.updatedBy || '',
        campaignCategory: campaign.campaignCategory || '',
        campaignType: campaign.campaignType || '',
        memberCount: campaign.memberCount || 0,
        runAsUserId: campaign.runAsUserId || '',
        startAt: campaign.startAt || '',
        endAt: campaign.endAt || '',
        elements: campaign.elements || []
      }))

      context.showProgress(`Processing ${campaigns.length} campaigns...`)

      // Generate export data
      let exportData: string
      let fileExtension: string
      
      if (parameters.format === 'json') {
        exportData = JSON.stringify(campaigns, null, 2)
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
          'Campaign Category',
          'Campaign Type',
          'Member Count',
          'Run As User ID',
          'Start At',
          'End At',
          'Element Count'
        ]

        const csvRows = campaigns.map(campaign => [
          campaign.id,
          `"${campaign.name.replace(/"/g, '""')}"`,
          `"${(campaign.description || '').replace(/"/g, '""')}"`,
          campaign.folderId,
          `"${(campaign.folderName || '').replace(/"/g, '""')}"`,
          campaign.isActive,
          campaign.isReadOnly,
          campaign.createdAt,
          campaign.updatedAt,
          campaign.createdBy,
          campaign.updatedBy,
          campaign.campaignCategory,
          campaign.campaignType,
          campaign.memberCount,
          campaign.runAsUserId,
          campaign.startAt,
          campaign.endAt,
          campaign.elements.length
        ])

        exportData = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n')
        fileExtension = 'csv'
      }

      // Create filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')
      const finalFilename = `${parameters.filename}-${timestamp}.${fileExtension}`

      context.showProgress('Generating export file...')

      // Calculate summary statistics
      const summary: CampaignExportSummary = {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.isActive).length,
        inactiveCampaigns: campaigns.filter(c => !c.isActive).length,
        exportedCampaigns: campaigns.length,
        filename: finalFilename,
        format: parameters.format
      }

      const endTime = Date.now()
      const processingTime = endTime - startTime

      return {
        success: true,
        message: `Campaign export completed. ${summary.exportedCampaigns} campaigns exported to ${finalFilename}`,
        data: {
          summary,
          exportData,
          filename: finalFilename,
          processingTime,
          campaigns: campaigns.slice(0, 10) // Preview of first 10 campaigns
        }
      }

    } catch (error) {
      return {
        success: false,
        error: `Campaign export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private getUsageGuide(): ToolResult {
    return {
      success: true,
      message: 'Campaign Export Usage Guide',
      data: {
        guide: {
          title: 'Campaign Export Tool',
          description: 'Export all Eloqua campaigns with detailed metadata to CSV or JSON format.',
          
          operations: [
            {
              name: 'Export Campaigns',
              description: 'Export all campaigns to a downloadable file',
              parameters: ['filename', 'format']
            }
          ],
          
          exportFormats: {
            csv: {
              description: 'Comma-separated values format, ideal for Excel and data analysis',
              headers: [
                'ID', 'Name', 'Description', 'Folder ID', 'Folder Name',
                'Is Active', 'Is Read Only', 'Created At', 'Updated At',
                'Created By', 'Updated By', 'Campaign Category', 'Campaign Type',
                'Member Count', 'Run As User ID', 'Start At', 'End At', 'Element Count'
              ]
            },
            json: {
              description: 'JavaScript Object Notation format, ideal for programmatic processing',
              structure: 'Array of campaign objects with all metadata including elements'
            }
          },
          
          parameters: {
            filename: 'Base name for the exported file (timestamp will be added automatically)',
            format: 'Export format: csv or json (default: csv)'
          },
          
          examples: [
            {
              name: 'Export all campaigns to CSV',
              parameters: {
                operation: 'export-campaigns',
                filename: 'all-campaigns',
                format: 'csv'
              }
            },
            {
              name: 'Export campaigns to JSON',
              parameters: {
                operation: 'export-campaigns',
                filename: 'campaigns-backup',
                format: 'json'
              }
            }
          ],
          
          features: [
            'Exports all campaign metadata including type and scheduling data',
            'Includes folder organization information',
            'Campaign category and type classification',
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

export default CampaignExportTool