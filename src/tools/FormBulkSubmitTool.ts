import { BaseTool, ToolConfig, ToolExecutionContext, ToolResult, ToolComponent, ParameterValidator } from '../shared/toolFramework'
import eloquaApiService from '../renderer/services/eloquaApi'
import { csvExamples, parameterExamples, usageGuide } from './FormBulkSubmitExamples'
import { InputValidator } from '../shared/validation'

interface FormBulkSubmitParameters {
  operation?: 'submit' | 'get-examples' | 'get-usage-guide'
  siteId?: string
  elqFormName?: string
  csvData?: string
  csvFile?: File
  requestTimeout?: number
  delayBetweenRequests?: number
  validateOnly?: boolean
  maxConcurrentRequests?: number
  exampleType?: 'csv' | 'parameters' | 'all'
}

interface FormBulkSubmitSchema {
  operation: {
    type: 'string'
    required: false
    enum: ['submit', 'get-examples', 'get-usage-guide']
    default: 'submit'
    description: 'Operation to perform'
    category: 'basic'
  }
  siteId: {
    type: 'string'
    required: true
    description: 'Numeric site identifier for Eloqua'
    category: 'basic'
  }
  elqFormName: {
    type: 'string'
    required: true
    description: 'Eloqua form name parameter'
    category: 'basic'
  }
  csvData: {
    type: 'string'
    required: false
    description: 'CSV data as text (alternative to file upload)'
    category: 'basic'
  }
  requestTimeout: {
    type: 'number'
    required: false
    default: 10
    min: 1
    max: 60
    description: 'Request timeout in seconds'
    category: 'advanced'
  }
  delayBetweenRequests: {
    type: 'number'
    required: false
    default: 100
    min: 0
    max: 5000
    description: 'Delay between requests in milliseconds'
    category: 'advanced'
  }
  validateOnly: {
    type: 'boolean'
    required: false
    default: false
    description: 'Only validate CSV data without submitting'
    category: 'advanced'
  }
  maxConcurrentRequests: {
    type: 'number'
    required: false
    default: 5
    min: 1
    max: 20
    description: 'Maximum number of concurrent requests'
    category: 'advanced'
  }
}

interface ProcessedRow {
  rowNumber: number
  success: boolean
  statusCode?: number
  processingTime: number
  url?: string
  parametersCount: number
  responseSize?: number
  error?: string
  data?: Record<string, string>
}

interface BulkSubmitSummary {
  totalRows: number
  successfulRequests: number
  failedRequests: number
  successRate: number
  totalProcessingTime: number
  averageProcessingTime: number
  averageResponseTime: number
}

class FormBulkSubmitTool extends BaseTool {
  private readonly ELOQUA_BASE_URL = "https://s{siteId}.t.eloqua.com/e/f2"
  private readonly ALLOWED_EXTENSIONS = ['csv']

  constructor() {
    const config: ToolConfig = {
      id: 'form-bulk-submit-tool',
      name: 'Form Bulk Submit',
      description: 'Submit form data in bulk from CSV files to Eloqua forms',
      icon: 'ClipboardList',
      path: '/form-bulk-submit',
      category: 'operations',
      features: [
        'CSV file processing and validation',
        'Bulk form submissions to Eloqua',
        'Progress tracking and error reporting',
        'Concurrent request handling',
        'Detailed submission analytics',
        'URL parameter encoding',
        'Request timeout management'
      ],
      requiresAuth: false, // Uses direct form submission, not REST API
      version: '1.0.0'
    }
    super(config)
  }

  validateParameters(parameters: FormBulkSubmitParameters): boolean {
    if (!parameters) return false

    const operation = parameters.operation || 'submit'

    // For submit operations, siteId and elqFormName are required
    if (operation === 'submit') {
      if (!ParameterValidator.isRequired(parameters.siteId) || 
          !this.validateSiteId(parameters.siteId)) {
        return false
      }

      if (!ParameterValidator.isRequired(parameters.elqFormName)) {
        return false
      }

      if (!parameters.csvData && !parameters.csvFile) {
        return false
      }

      if (parameters.requestTimeout !== undefined && 
          (!ParameterValidator.isNumber(parameters.requestTimeout) || 
           parameters.requestTimeout < 1 || 
           parameters.requestTimeout > 60)) {
        return false
      }
    }

    // get-examples and get-usage-guide operations don't require siteId/elqFormName
    // since they return static documentation

    return true
  }

  getParameterSchema(): FormBulkSubmitSchema {
    return {
      operation: {
        type: 'string',
        required: false,
        enum: ['submit', 'get-examples', 'get-usage-guide'],
        default: 'submit',
        description: 'Operation to perform',
        category: 'basic'
      },
      siteId: {
        type: 'string',
        required: false,
        description: 'Numeric site identifier for Eloqua (required for submit operation)',
        category: 'basic'
      },
      elqFormName: {
        type: 'string',
        required: false,
        description: 'Eloqua form name parameter (required for submit operation)',
        category: 'basic'
      },
      csvData: {
        type: 'string',
        required: false,
        description: 'CSV data as text (alternative to file upload)',
        category: 'basic'
      },
      requestTimeout: {
        type: 'number',
        required: false,
        default: 10,
        min: 1,
        max: 60,
        description: 'Request timeout in seconds',
        category: 'advanced'
      },
      delayBetweenRequests: {
        type: 'number',
        required: false,
        default: 100,
        min: 0,
        max: 5000,
        description: 'Delay between requests in milliseconds',
        category: 'advanced'
      },
      validateOnly: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Only validate CSV data without submitting',
        category: 'advanced'
      },
      maxConcurrentRequests: {
        type: 'number',
        required: false,
        default: 5,
        min: 1,
        max: 20,
        description: 'Maximum number of concurrent requests',
        category: 'advanced'
      },
      exampleType: {
        type: 'string',
        required: false,
        enum: ['csv', 'parameters', 'all'],
        default: 'all',
        description: 'Type of examples to retrieve',
        category: 'basic'
      }
    }
  }

  async execute(context: ToolExecutionContext, parameters: FormBulkSubmitParameters): Promise<ToolResult> {
    try {
      const {
        operation = 'submit',
        siteId,
        elqFormName,
        csvData,
        requestTimeout = 10,
        delayBetweenRequests = 100,
        validateOnly = false,
        maxConcurrentRequests = 5,
        exampleType = 'all'
      } = parameters

      // Handle non-submit operations
      if (operation === 'get-examples') {
        return this.getExamples(exampleType)
      }

      if (operation === 'get-usage-guide') {
        return this.getUsageGuide()
      }

      context.showProgress('Processing CSV data...')

      // Parse CSV data
      const csvRows = await this.parseCsvData(csvData || '', context)
      
      if (csvRows.length === 0) {
        return {
          success: false,
          error: 'No valid data rows found in CSV'
        }
      }

      context.showProgress(`Found ${csvRows.length} data rows`)

      // Validate only mode
      if (validateOnly) {
        return {
          success: true,
          data: {
            validation: {
              totalRows: csvRows.length,
              validRows: csvRows.length,
              sampleUrls: csvRows.slice(0, 3).map((row, index) => 
                this.buildEloquaUrl(siteId, elqFormName, row, index + 1)
              )
            }
          },
          message: `Validation complete: ${csvRows.length} valid rows found`
        }
      }

      // Process submissions
      context.showProgress('Starting bulk form submissions...')
      
      const results = await this.processBulkSubmissions(
        csvRows,
        siteId,
        elqFormName,
        {
          requestTimeout,
          delayBetweenRequests,
          maxConcurrentRequests
        },
        context
      )

      // Calculate summary
      const summary = this.calculateSummary(results)

      return {
        success: true,
        data: {
          summary,
          results,
          timestamp: new Date().toISOString()
        },
        message: `Bulk submission complete: ${summary.successfulRequests}/${summary.totalRows} successful (${summary.successRate}% success rate)`
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private async parseCsvData(csvData: string, context: ToolExecutionContext): Promise<Array<Record<string, string>>> {
    if (!csvData.trim()) {
      throw new Error('CSV data is empty')
    }

    // Validate and sanitize CSV data
    context.showProgress('Validating CSV data for security...')
    const csvValidation = InputValidator.validateCsvData(csvData)
    if (!csvValidation.isValid) {
      throw new Error(`CSV validation failed: ${csvValidation.errors.join(', ')}`)
    }
    
    const sanitizedCsvData = csvValidation.sanitizedValue!
    context.showProgress('CSV data validated and sanitized successfully')

    const lines = sanitizedCsvData.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }

    context.showProgress('Parsing CSV headers...')

    // Parse headers
    const headers = this.parseCsvLine(lines[0])
    if (headers.length === 0) {
      throw new Error('CSV must have column headers')
    }

    context.showProgress(`Found ${headers.length} columns`)

    // Parse data rows
    const rows: Array<Record<string, string>> = []
    
    for (let i = 1; i < lines.length; i++) {
      const lineData = lines[i].trim()
      if (!lineData) continue // Skip empty lines

      const values = this.parseCsvLine(lineData)
      
      // Create row object with additional sanitization
      const row: Record<string, string> = {}
      for (let j = 0; j < headers.length; j++) {
        const value = values[j] || ''
        if (value.trim()) {
          // Sanitize individual cell values to prevent injection
          const sanitizedValue = InputValidator.sanitizeHtml(value.trim())
          row[headers[j]] = sanitizedValue
        }
      }

      // Only include rows with at least one non-empty value
      if (Object.keys(row).length > 0) {
        rows.push(row)
      }
    }

    return rows
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"'
          i++ // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    // Add the last field
    result.push(current)
    
    return result
  }

  private buildEloquaUrl(siteId: string, elqFormName: string, csvData: Record<string, string>, rowNumber: number): string {
    const baseUrl = this.ELOQUA_BASE_URL.replace('{siteId}', siteId)
    
    // Start with required parameters
    const params = new URLSearchParams()
    params.append('elqFormName', elqFormName)
    params.append('elqSiteID', siteId)
    
    // Add CSV data
    Object.entries(csvData).forEach(([key, value]) => {
      params.append(key, value)
    })
    
    return `${baseUrl}?${params.toString()}`
  }

  private async processBulkSubmissions(
    csvRows: Array<Record<string, string>>,
    siteId: string,
    elqFormName: string,
    options: {
      requestTimeout: number
      delayBetweenRequests: number
      maxConcurrentRequests: number
    },
    context: ToolExecutionContext
  ): Promise<ProcessedRow[]> {
    const results: ProcessedRow[] = []
    const semaphore = new Array(options.maxConcurrentRequests).fill(null)
    let processedCount = 0

    // Process in batches to control concurrency
    const processBatch = async (batch: Array<{ row: Record<string, string>, index: number }>) => {
      const batchPromises = batch.map(({ row, index }) => 
        this.processRow(row, siteId, elqFormName, index + 1, options.requestTimeout)
      )
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result, batchIndex) => {
        const rowIndex = batch[batchIndex].index
        
        if (result.status === 'fulfilled') {
          results[rowIndex] = result.value
        } else {
          results[rowIndex] = {
            rowNumber: rowIndex + 1,
            success: false,
            processingTime: 0,
            parametersCount: Object.keys(batch[batchIndex].row).length,
            error: `Promise rejected: ${result.reason}`
          }
        }
        
        processedCount++
        context.showProgress(`Processed ${processedCount}/${csvRows.length} rows (${Math.round((processedCount / csvRows.length) * 100)}%)`)
      })
    }

    // Process rows in batches
    for (let i = 0; i < csvRows.length; i += options.maxConcurrentRequests) {
      const batch = csvRows
        .slice(i, i + options.maxConcurrentRequests)
        .map((row, batchIndex) => ({ row, index: i + batchIndex }))
      
      await processBatch(batch)
      
      // Add delay between batches if specified
      if (options.delayBetweenRequests > 0 && i + options.maxConcurrentRequests < csvRows.length) {
        await new Promise(resolve => setTimeout(resolve, options.delayBetweenRequests))
      }
    }

    return results
  }

  private async processRow(
    rowData: Record<string, string>,
    siteId: string,
    elqFormName: string,
    rowNumber: number,
    timeout: number
  ): Promise<ProcessedRow> {
    const startTime = performance.now()
    
    try {
      const targetUrl = this.buildEloquaUrl(siteId, elqFormName, rowData, rowNumber)
      
      // Use fetch with AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout * 1000)
      
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'EloquaAdminToolbox-BulkSubmit/1.0'
        },
        body: new URLSearchParams(rowData),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      const processingTime = performance.now() - startTime
      const responseText = await response.text()
      
      return {
        rowNumber,
        success: true,
        statusCode: response.status,
        processingTime: Math.round(processingTime),
        url: targetUrl,
        parametersCount: Object.keys(rowData).length,
        responseSize: responseText.length,
        data: rowData
      }
      
    } catch (error) {
      const processingTime = performance.now() - startTime
      
      let errorMessage: string
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timeout'
        } else {
          errorMessage = `Network error: ${error.message}`
        }
      } else {
        errorMessage = 'Unknown error'
      }
      
      return {
        rowNumber,
        success: false,
        error: errorMessage,
        processingTime: Math.round(processingTime),
        parametersCount: Object.keys(rowData).length,
        data: rowData
      }
    }
  }

  private calculateSummary(results: ProcessedRow[]): BulkSubmitSummary {
    const successfulRequests = results.filter(r => r.success).length
    const failedRequests = results.length - successfulRequests
    const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0)
    const averageProcessingTime = totalProcessingTime / results.length
    
    return {
      totalRows: results.length,
      successfulRequests,
      failedRequests,
      successRate: Math.round((successfulRequests / results.length) * 100 * 10) / 10,
      totalProcessingTime: Math.round(totalProcessingTime),
      averageProcessingTime: Math.round(averageProcessingTime * 10) / 10,
      averageResponseTime: Math.round(averageProcessingTime * 10) / 10
    }
  }

  private validateSiteId(siteId: string): boolean {
    return /^\d+$/.test(siteId)
  }

  private getExamples(exampleType: string): ToolResult {
    let examples: any

    switch (exampleType) {
      case 'csv':
        examples = csvExamples
        break
      case 'parameters':
        examples = parameterExamples
        break
      case 'all':
      default:
        examples = {
          csvExamples,
          parameterExamples
        }
        break
    }

    return {
      success: true,
      data: {
        exampleType,
        examples,
        description: `Form Bulk Submit ${exampleType} examples`
      },
      message: `Retrieved ${exampleType} examples successfully`
    }
  }

  private getUsageGuide(): ToolResult {
    return {
      success: true,
      data: {
        usageGuide,
        description: 'Complete usage guide for Form Bulk Submit tool'
      },
      message: 'Retrieved usage guide successfully'
    }
  }

  getComponent(): ToolComponent {
    return {
      render: () => 'FormBulkSubmitComponent' // Component name for dynamic loading
    }
  }
}

export default FormBulkSubmitTool