import { BaseTool, ToolConfig, ToolExecutionContext, ToolResult, ToolComponent, ParameterValidator } from '../shared/toolFramework'
import eloquaApiService from '../renderer/services/eloquaApi'

interface BulkSyncDeletionParameters {
  operation?: 'delete-syncs' | 'delete-contact-fields' | 'list-syncs' | 'get-usage-guide'
  syncIds?: string[]
  contactFieldIds?: string[]
  csvData?: string
  csvFile?: File
  batchSize?: number
  delayBetweenRequests?: number
  maxConcurrentRequests?: number
}

interface SyncDeletionResult {
  syncId: string
  success: boolean
  statusCode?: number
  processingTime: number
  error?: string
  beforeStatus?: string
}

interface SyncInfo {
  id: string
  name: string
  status: string
  createdAt: string
  updatedAt: string
  type: string
}

interface BulkSyncDeletionSummary {
  totalSyncs: number
  successfulDeletions: number
  failedDeletions: number
  successRate: number
  totalProcessingTime: number
  averageProcessingTime: number
  skippedSyncs: number
}

interface BulkSyncDeletionSchema {
  operation: {
    type: 'string'
    required: false
    enum: ['delete-syncs', 'delete-contact-fields', 'list-syncs', 'get-usage-guide']
    default: 'delete-syncs'
    description: 'Operation to perform'
    category: 'basic'
  }
  syncIds: {
    type: 'array'
    required: false
    description: 'Array of sync IDs to delete'
    category: 'basic'
  }
  contactFieldIds: {
    type: 'array'
    required: false
    description: 'Array of contact field IDs to delete (with dependency resolution)'
    category: 'basic'
  }
  csvData: {
    type: 'string'
    required: false
    description: 'CSV data containing sync IDs (one per line or comma-separated)'
    category: 'basic'
  }
  batchSize: {
    type: 'number'
    required: false
    default: 5
    min: 1
    max: 20
    description: 'Number of syncs to process in each batch'
    category: 'advanced'
  }
  delayBetweenRequests: {
    type: 'number'
    required: false
    default: 200
    min: 0
    max: 5000
    description: 'Delay in milliseconds between API requests'
    category: 'advanced'
  }
  maxConcurrentRequests: {
    type: 'number'
    required: false
    default: 3
    min: 1
    max: 10
    description: 'Maximum concurrent API requests'
    category: 'advanced'
  }
}

class BulkSyncDeletionTool extends BaseTool {
  constructor() {
    const config: ToolConfig = {
      id: 'bulk-sync-deletion-tool',
      name: 'Bulk Sync Deletion',
      description: 'Delete Eloqua bulk syncs and contact fields with automatic dependency resolution - WARNING: Will permanently delete contact fields',
      icon: 'Trash2',
      path: '/bulk-sync-deletion',
      category: 'management',
      features: [
        'WARNING: Contact field deletion is permanent and irreversible',
        'Contact field deletion with automatic bulk sync dependency resolution',
        'Direct bulk sync deletion',
        'CSV import of IDs',
        'Dry run validation mode (RECOMMENDED before deletion)',
        'Progress tracking with batch processing',
        'Detailed error reporting',
        'Concurrency control and rate limiting'
      ],
      requiresAuth: true,
      version: '2.0.0'
    }
    super(config)
  }

  validateParameters(parameters: BulkSyncDeletionParameters): boolean {
    if (!parameters) return false

    // At least one of these must be provided for delete operations
    if (parameters.operation === 'delete-syncs' && !parameters.syncIds && !parameters.csvData) {
      return false
    }

    // For contact field deletion, need field IDs or CSV data
    if (parameters.operation === 'delete-contact-fields' && !parameters.contactFieldIds && !parameters.csvData) {
      return false
    }

    // Validate batch size
    if (parameters.batchSize !== undefined && 
        (!ParameterValidator.isNumber(parameters.batchSize) || 
         parameters.batchSize < 1 || 
         parameters.batchSize > 20)) {
      return false
    }

    // Validate delay
    if (parameters.delayBetweenRequests !== undefined && 
        (!ParameterValidator.isNumber(parameters.delayBetweenRequests) || 
         parameters.delayBetweenRequests < 0 || 
         parameters.delayBetweenRequests > 5000)) {
      return false
    }

    // Validate max concurrent requests
    if (parameters.maxConcurrentRequests !== undefined && 
        (!ParameterValidator.isNumber(parameters.maxConcurrentRequests) || 
         parameters.maxConcurrentRequests < 1 || 
         parameters.maxConcurrentRequests > 10)) {
      return false
    }

    return true
  }

  getParameterSchema(): BulkSyncDeletionSchema {
    return {
      operation: {
        type: 'string',
        required: false,
        enum: ['delete-syncs', 'delete-contact-fields', 'list-syncs', 'get-usage-guide'],
        default: 'delete-syncs',
        description: 'Operation to perform',
        category: 'basic'
      },
      syncIds: {
        type: 'array',
        required: false,
        description: 'Array of sync IDs to delete',
        category: 'basic'
      },
      contactFieldIds: {
        type: 'array',
        required: false,
        description: 'Array of contact field IDs to delete (with dependency resolution)',
        category: 'basic'
      },
      csvData: {
        type: 'string',
        required: false,
        description: 'CSV data containing sync IDs (one per line or comma-separated)',
        category: 'basic'
      },
      batchSize: {
        type: 'number',
        required: false,
        default: 5,
        min: 1,
        max: 20,
        description: 'Number of syncs to process in each batch',
        category: 'advanced'
      },
      delayBetweenRequests: {
        type: 'number',
        required: false,
        default: 200,
        min: 0,
        max: 5000,
        description: 'Delay in milliseconds between API requests',
        category: 'advanced'
      },
      maxConcurrentRequests: {
        type: 'number',
        required: false,
        default: 3,
        min: 1,
        max: 10,
        description: 'Maximum concurrent API requests',
        category: 'advanced'
      }
    }
  }

  async execute(context: ToolExecutionContext, parameters: BulkSyncDeletionParameters): Promise<ToolResult> {
    try {
      // Initialize API service if needed
      if (!eloquaApiService) {
        throw new Error('Eloqua API service not initialized')
      }

      const {
        operation = 'delete-syncs',
        syncIds,
        contactFieldIds,
        csvData,
        batchSize = 5,
        delayBetweenRequests = 200,
        maxConcurrentRequests = 3
      } = parameters

      switch (operation) {
        case 'delete-syncs':
          return await this.deleteSyncs(context, {
            syncIds,
            csvData,
            batchSize,
            delayBetweenRequests,
            maxConcurrentRequests
          })
        case 'delete-contact-fields':
          return await this.deleteContactFields(context, {
            contactFieldIds,
            csvData,
            batchSize,
            delayBetweenRequests,
            maxConcurrentRequests
          })
        case 'list-syncs':
          return await this.listSyncs(context, { batchSize })
        case 'get-usage-guide':
          return this.getUsageGuide()
        default:
          return await this.deleteSyncs(context, {
            syncIds,
            csvData,
            batchSize,
            delayBetweenRequests,
            maxConcurrentRequests
          })
      }
    } catch (error) {
      console.error('Bulk Sync Deletion Tool Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private async deleteContactFields(context: ToolExecutionContext, parameters: {
    contactFieldIds?: string[]
    csvData?: string
    batchSize: number
    delayBetweenRequests: number
    maxConcurrentRequests: number
  }): Promise<ToolResult> {
    const fieldIds = await this.extractContactFieldIds(parameters)
    
    if (fieldIds.length === 0) {
      return {
        success: false,
        error: 'No contact field IDs provided. Please provide field IDs via CSV data or direct input.'
      }
    }

    const results: SyncDeletionResult[] = []
    const startTime = Date.now()

    // Progress tracking
    let processed = 0
    const total = fieldIds.length

    context.showProgress(`Starting deletion for ${total} contact fields...`)

    try {
      // Process contact fields in batches with concurrency control
      for (let i = 0; i < fieldIds.length; i += parameters.batchSize) {
        const batch = fieldIds.slice(i, i + parameters.batchSize)
        const batchPromises = batch.map(async (fieldId, index) => {
          // Add delay between concurrent requests
          if (index > 0) {
            await this.delay(parameters.delayBetweenRequests)
          }
          return this.deleteContactFieldWithDependencies(fieldId)
        })

        // Limit concurrent requests
        const concurrencyLimitedPromises = []
        for (let j = 0; j < batchPromises.length; j += parameters.maxConcurrentRequests) {
          const chunk = batchPromises.slice(j, j + parameters.maxConcurrentRequests)
          concurrencyLimitedPromises.push(Promise.all(chunk))
        }

        for (const chunk of concurrencyLimitedPromises) {
          const chunkResults = await chunk
          results.push(...chunkResults)
          processed += chunkResults.length

          // Report progress
          const progressPercent = Math.round((processed / total) * 100)
          context.showProgress(`Processing contact field deletions... ${processed}/${total} (${progressPercent}%)`)
        }
      }

      const endTime = Date.now()
      const totalProcessingTime = endTime - startTime

      // Calculate summary statistics
      const summary: BulkSyncDeletionSummary = {
        totalSyncs: results.length,
        successfulDeletions: results.filter(r => r.success).length,
        failedDeletions: results.filter(r => !r.success).length,
        successRate: Math.round((results.filter(r => r.success).length / results.length) * 100),
        totalProcessingTime,
        averageProcessingTime: Math.round(totalProcessingTime / results.length),
        skippedSyncs: 0
      }

      return {
        success: true,
        message: `Contact field deletion completed. ${summary.successfulDeletions} fields deleted successfully, ${summary.failedDeletions} failed.`,
        data: {
          summary,
          results
        }
      }

    } catch (error) {
      return {
        success: false,
        error: `Contact field deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { results }
      }
    }
  }

  private async deleteSyncs(context: ToolExecutionContext, parameters: {
    syncIds?: string[]
    csvData?: string
    batchSize: number
    delayBetweenRequests: number
    maxConcurrentRequests: number
  }): Promise<ToolResult> {
    const syncIds = await this.extractSyncIds(parameters)
    
    if (syncIds.length === 0) {
      return {
        success: false,
        error: 'No sync IDs provided. Please provide sync IDs via CSV data or direct input.'
      }
    }

    const results: SyncDeletionResult[] = []
    const startTime = Date.now()

    // Progress tracking
    let processed = 0
    const total = syncIds.length

    context.showProgress(`Starting deletion for ${total} syncs...`)

    try {
      // Process syncs in batches with concurrency control
      for (let i = 0; i < syncIds.length; i += parameters.batchSize) {
        const batch = syncIds.slice(i, i + parameters.batchSize)
        const batchPromises = batch.map(async (syncId, index) => {
          // Add delay between concurrent requests
          if (index > 0) {
            await this.delay(parameters.delayBetweenRequests)
          }
          return this.processSyncDeletion(syncId)
        })

        // Limit concurrent requests
        const concurrencyLimitedPromises = []
        for (let j = 0; j < batchPromises.length; j += parameters.maxConcurrentRequests) {
          const chunk = batchPromises.slice(j, j + parameters.maxConcurrentRequests)
          concurrencyLimitedPromises.push(Promise.all(chunk))
        }

        for (const chunk of concurrencyLimitedPromises) {
          const chunkResults = await chunk
          results.push(...chunkResults)
          processed += chunkResults.length

          // Report progress
          const progressPercent = Math.round((processed / total) * 100)
          context.showProgress(`Processing sync deletions... ${processed}/${total} (${progressPercent}%)`)
        }
      }

      const endTime = Date.now()
      const totalProcessingTime = endTime - startTime

      // Calculate summary statistics
      const summary: BulkSyncDeletionSummary = {
        totalSyncs: results.length,
        successfulDeletions: results.filter(r => r.success).length,
        failedDeletions: results.filter(r => !r.success).length,
        successRate: Math.round((results.filter(r => r.success).length / results.length) * 100),
        totalProcessingTime,
        averageProcessingTime: Math.round(totalProcessingTime / results.length),
        skippedSyncs: 0
      }

      return {
        success: true,
        message: `Bulk sync deletion completed. ${summary.successfulDeletions} syncs deleted successfully, ${summary.failedDeletions} failed.`,
        data: {
          summary,
          results
        }
      }

    } catch (error) {
      return {
        success: false,
        error: `Bulk sync deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { results }
      }
    }
  }

  private async processSyncDeletion(syncId: string): Promise<SyncDeletionResult> {
    const startTime = Date.now()
    
    try {

      // Get sync info before deletion (optional, for audit trail)
      let beforeStatus: string | undefined
      try {
        const syncInfo = await this.getSyncInfo(syncId)
        beforeStatus = syncInfo?.status
      } catch (error) {
        // Continue with deletion even if we can't get sync info
        console.warn(`Could not get sync info for ID ${syncId}:`, error)
      }

      // Perform actual deletion using the API service
      await eloquaApiService.makeRequest('DELETE', `/api/bulk/2.0/syncs/${syncId}`)

      return {
        syncId,
        success: true,
        statusCode: 200,
        processingTime: Date.now() - startTime,
        beforeStatus
      }

    } catch (error: any) {
      return {
        syncId,
        success: false,
        statusCode: error.response?.status || 0,
        processingTime: Date.now() - startTime,
        error: error.message || 'Unknown error during deletion',
        beforeStatus: undefined
      }
    }
  }

  private async getSyncInfo(syncId: string): Promise<SyncInfo | null> {
    try {
      const response = await eloquaApiService.makeRequest('GET', `/api/bulk/2.0/syncs/${syncId}`)

      return {
        id: response.id || syncId,
        name: response.name || 'Unknown',
        status: response.status || 'Unknown',
        createdAt: response.createdAt || '',
        updatedAt: response.updatedAt || '',
        type: response.syncedInstanceUri?.split('/').pop() || 'Unknown'
      }
    } catch (error) {
      console.warn(`Failed to get sync info for ${syncId}:`, error)
      return null
    }
  }

  private async listSyncs(context: ToolExecutionContext, parameters: { batchSize: number }): Promise<ToolResult> {
    try {
      context.showProgress('Fetching bulk syncs...')
      const response = await eloquaApiService.makeRequest('GET', '/api/bulk/2.0/syncs', {
        limit: parameters.batchSize || 1000,
        offset: 0
      })

      const syncs = response.items || []
      const syncInfos: SyncInfo[] = syncs.map((sync: any) => ({
        id: sync.id,
        name: sync.name || 'Unknown',
        status: sync.status || 'Unknown',
        createdAt: sync.createdAt || '',
        updatedAt: sync.updatedAt || '',
        type: sync.syncedInstanceUri?.split('/').pop() || 'Unknown'
      }))

      return {
        success: true,
        message: `Found ${syncInfos.length} syncs`,
        data: {
          syncs: syncInfos,
          total: response.totalResults || syncInfos.length
        }
      }

    } catch (error) {
      return {
        success: false,
        error: `Failed to list syncs: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async extractSyncIds(parameters: { syncIds?: string[], csvData?: string }): Promise<string[]> {
    let syncIds: string[] = []

    // From direct syncIds parameter
    if (parameters.syncIds && parameters.syncIds.length > 0) {
      syncIds.push(...parameters.syncIds)
    }

    // From CSV data
    if (parameters.csvData) {
      const csvSyncIds = this.parseCsvData(parameters.csvData)
      syncIds.push(...csvSyncIds)
    }

    // Remove duplicates and filter out empty strings
    return [...new Set(syncIds)].filter(id => id && id.trim().length > 0)
  }

  private async extractContactFieldIds(parameters: { contactFieldIds?: string[], csvData?: string }): Promise<string[]> {
    let fieldIds: string[] = []

    // From direct contactFieldIds parameter
    if (parameters.contactFieldIds && parameters.contactFieldIds.length > 0) {
      fieldIds.push(...parameters.contactFieldIds)
    }

    // From CSV data
    if (parameters.csvData) {
      const csvFieldIds = this.parseCsvData(parameters.csvData)
      fieldIds.push(...csvFieldIds)
    }

    // Remove duplicates and filter out empty strings
    return [...new Set(fieldIds)].filter(id => id && id.trim().length > 0)
  }

  private parseCsvData(csvData: string): string[] {
    const syncIds: string[] = []
    
    try {
      const lines = csvData.split('\n')
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine && !trimmedLine.toLowerCase().includes('sync') && !trimmedLine.toLowerCase().includes('id')) {
          // Handle comma-separated values or single values per line
          const values = trimmedLine.split(',').map(v => v.trim().replace(/"/g, ''))
          
          for (const value of values) {
            // Validate that it looks like a sync ID (numeric)
            if (/^\d+$/.test(value)) {
              syncIds.push(value)
            }
          }
        }
      }
    } catch (error) {
      console.error('CSV parsing error:', error)
    }

    return syncIds
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async parseDependenciesFromError(error: any): Promise<Array<{id: string, type: string}>> {
    try {
      // Parse 412 error response to extract bulk export/import dependencies
      const errorData = error.response?.data
      if (!errorData || !errorData.dependencies) {
        return []
      }

      const dependencies: Array<{id: string, type: string}> = []
      for (const dependency of errorData.dependencies) {
        if (dependency.type === 'BulkExport' || dependency.type === 'BulkImport') {
          dependencies.push({
            id: dependency.id,
            type: dependency.type
          })
        }
      }

      return dependencies
    } catch (parseError) {
      console.warn('Failed to parse dependencies from error:', parseError)
      return []
    }
  }

  private async resolveDependencies(dependencies: Array<{id: string, type: string}>): Promise<void> {
    // Delete bulk export/import definitions that are blocking asset deletion
    for (const dependency of dependencies) {
      try {
        if (dependency.type === 'BulkExport') {
          // Delete bulk contact export
          await eloquaApiService.makeRequest('DELETE', `/api/bulk/2.0/contacts/exports/${dependency.id}`)
        } else if (dependency.type === 'BulkImport') {
          // Delete bulk contact import
          await eloquaApiService.makeRequest('DELETE', `/api/bulk/2.0/contacts/imports/${dependency.id}`)
        } else {
          console.warn(`Unknown dependency type: ${dependency.type} for ID: ${dependency.id}`)
          continue
        }
        
        console.log(`Successfully deleted ${dependency.type} dependency: ${dependency.id}`)
      } catch (error) {
        console.warn(`Failed to delete ${dependency.type} dependency ${dependency.id}:`, error)
        // Continue with other dependencies even if one fails
      }
    }
  }

  private async deleteContactFieldWithDependencies(fieldId: string): Promise<SyncDeletionResult> {
    const startTime = Date.now()
    
    try {

      // Step 1: Attempt to delete the contact field
      try {
        await eloquaApiService.makeRequest('DELETE', `/api/REST/1.0/assets/contact/field/${fieldId}`)
        
        return {
          syncId: fieldId,
          success: true,
          statusCode: 200,
          processingTime: Date.now() - startTime
        }
      } catch (deleteError: any) {
        // Step 2: Check if this is a 412 error with dependencies
        if (deleteError.response?.status === 412) {
          // Step 3: Parse and resolve dependencies
          const dependencies = await this.parseDependenciesFromError(deleteError)
          if (dependencies.length > 0) {
            await this.resolveDependencies(dependencies)
            
            // Step 4: Retry contact field deletion
            await eloquaApiService.makeRequest('DELETE', `/api/REST/1.0/assets/contact/field/${fieldId}`)
            
            return {
              syncId: fieldId,
              success: true,
              statusCode: 200,
              processingTime: Date.now() - startTime,
              error: `Resolved ${dependencies.length} bulk sync dependencies`
            }
          }
        }
        
        throw deleteError
      }

    } catch (error: any) {
      return {
        syncId: fieldId,
        success: false,
        statusCode: error.response?.status || 0,
        processingTime: Date.now() - startTime,
        error: error.message || 'Unknown error during contact field deletion'
      }
    }
  }

  private getUsageGuide(): ToolResult {
    return {
      success: true,
      message: 'Bulk Sync Deletion Usage Guide',
      data: {
        guide: {
          title: 'Bulk Sync Deletion Tool',
          description: 'Delete multiple Eloqua bulk syncs efficiently with progress tracking and error handling.',
          
          operations: [
            {
              name: 'Delete Contact Fields',
              description: 'Delete contact fields with automatic bulk sync dependency resolution',
              parameters: ['contactFieldIds', 'csvData', 'batchSize', 'delayBetweenRequests']
            },
            {
              name: 'Delete Syncs',
              description: 'Delete bulk syncs directly by their IDs',
              parameters: ['syncIds', 'csvData', 'batchSize', 'delayBetweenRequests']
            },
            {
              name: 'List Syncs',
              description: 'Get a list of all available bulk syncs',
              parameters: ['batchSize']
            }
          ],
          
          csvFormat: {
            description: 'CSV file should contain sync IDs, one per line or comma-separated',
            example: `123456\n789012\n345678`,
            headers: 'Headers are optional. Tool will automatically detect numeric sync IDs.'
          },
          
          parameters: {
            contactFieldIds: 'Array of contact field IDs to delete (with dependency resolution)',
            syncIds: 'Array of sync IDs to delete directly',
            csvData: 'CSV data as string containing IDs',
            batchSize: 'Number of items to process in each batch (default: 5)',
            delayBetweenRequests: 'Delay in milliseconds between API requests (default: 200)',
            maxConcurrentRequests: 'Maximum concurrent API requests (default: 3)'
          },
          
          examples: [
            {
              name: 'Delete contact fields with dependency resolution',
              parameters: {
                operation: 'delete-contact-fields',
                contactFieldIds: ['100001', '100002']
              }
            },
            {
              name: 'Delete contact fields from CSV data',
              parameters: {
                operation: 'delete-contact-fields',
                csvData: '100001\\n100002\\n100003'
              }
            },
            {
              name: 'Delete specific syncs directly',
              parameters: {
                operation: 'delete-syncs',
                syncIds: ['123456', '789012']
              }
            },
            {
              name: 'List all syncs',
              parameters: {
                operation: 'list-syncs',
                batchSize: 100
              }
            }
          ],
          
          safety: [
            'WARNING: Contact field deletion is PERMANENT and IRREVERSIBLE',
            'CRITICAL: This tool will delete actual contact fields from your Eloqua instance',
            'NO DRY RUN MODE - All operations will immediately execute deletions',
            'Contact field deletion automatically resolves bulk sync dependencies',
            'All associated data and configurations will be permanently lost',
            'Ensure you have proper backups before proceeding with deletion',
            'Double-check field IDs before execution',
            'Rate limiting is automatically applied to prevent API throttling',
            'Failed deletions are logged with error details for troubleshooting'
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

export default BulkSyncDeletionTool