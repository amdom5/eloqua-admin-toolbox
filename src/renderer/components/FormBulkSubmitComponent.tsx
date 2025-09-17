import React, { useState, useCallback, useRef } from 'react'
import useTool from '../hooks/useTool'
import LoadingSpinner from './LoadingSpinner'
import '../styles/FormBulkSubmitComponent.css'
import { ClipboardList, FileText, CheckCircle, XCircle } from 'lucide-react'
import Icon from '../../components/ui/Icon'

interface FormBulkSubmitParameters {
  operation?: 'submit'
  siteId?: string
  elqFormName?: string
  csvData?: string
  csvFile?: File
  requestTimeout?: number
  delayBetweenRequests?: number
  validateOnly?: boolean
  maxConcurrentRequests?: number
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

function FormBulkSubmitComponent() {
  const { executeTool, isExecuting, progress, result, error, clearResult, clearError } = useTool()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Form state
  const [parameters, setParameters] = useState<FormBulkSubmitParameters>({
    operation: 'submit',
    siteId: '',
    elqFormName: '',
    csvData: '',
    requestTimeout: 10,
    delayBetweenRequests: 100,
    validateOnly: false,
    maxConcurrentRequests: 5
  })
  
  // UI state
  const [activeTab, setActiveTab] = useState<'configure' | 'upload' | 'process' | 'results'>('configure')
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const handleParameterChange = (key: keyof FormBulkSubmitParameters, value: any) => {
    setParameters(prev => ({ ...prev, [key]: value }))
    
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }

  const validateForm = (): boolean => {
    const errors: string[] = []
    
    if (parameters.operation === 'submit') {
      if (!parameters.siteId) {
        errors.push('Site ID is required for form submission')
      } else if (!/^\d+$/.test(parameters.siteId)) {
        errors.push('Site ID must be numeric')
      }
      
      if (!parameters.elqFormName) {
        errors.push('Form name is required for form submission')
      }
      
      if (!parameters.csvData && !parameters.csvFile) {
        errors.push('CSV data or file is required for form submission')
      }
    }
    
    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleFileSelect = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setValidationErrors(['Please select a CSV file'])
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const csvText = e.target?.result as string
      setParameters(prev => ({ ...prev, csvData: csvText, csvFile: file }))
      parseCsvPreview(csvText)
    }
    reader.readAsText(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const parseCsvPreview = (csvText: string) => {
    if (!csvText.trim()) {
      setCsvPreview([])
      return
    }
    
    try {
      const lines = csvText.trim().split('\n')
      if (lines.length < 2) {
        setCsvPreview([])
        return
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const preview: Record<string, string>[] = []
      
      // Show first 3 rows as preview
      for (let i = 1; i < Math.min(4, lines.length); i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
        const row: Record<string, string> = {}
        
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        
        preview.push(row)
      }
      
      setCsvPreview(preview)
    } catch (error) {
      console.error('CSV preview parsing error:', error)
      setCsvPreview([])
    }
  }

  const handleExecute = async () => {
    if (!validateForm()) {
      return
    }
    
    clearResult()
    clearError()
    
    try {
      // Move to processing tab when execution starts
      if (parameters.operation === 'submit') {
        setActiveTab('process')
      }
      
      await executeTool('form-bulk-submit-tool', parameters)
      
      // Move to results tab when execution completes
      if (parameters.operation === 'submit') {
        setActiveTab('results')
      }
    } catch (error) {
      console.error('Tool execution failed:', error)
    }
  }


  const renderConfigurationTab = () => (
    <div className="configuration-tab">
      <div className="form-section">
        <h3>Basic Configuration</h3>
        
        <div className="form-group">
          <label className="form-label">
            Site ID <span className="required">*</span>
          </label>
          <input
            type="text"
            value={parameters.siteId || ''}
            onChange={(e) => handleParameterChange('siteId', e.target.value)}
            className="form-input"
            placeholder="e.g., 123"
            pattern="[0-9]+"
          />
          <small className="field-description">
            Your Eloqua site identifier (numeric only)
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">
            Form Name <span className="required">*</span>
          </label>
          <input
            type="text"
            value={parameters.elqFormName || ''}
            onChange={(e) => handleParameterChange('elqFormName', e.target.value)}
            className="form-input"
            placeholder="e.g., ContactForm2025"
          />
          <small className="field-description">
            The elqFormName parameter from your Eloqua form
          </small>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={parameters.validateOnly || false}
              onChange={(e) => handleParameterChange('validateOnly', e.target.checked)}
            />
            Validation only (don't submit, just validate CSV)
          </label>
        </div>
      </div>

      <div className="form-section">
        <button
          type="button"
          className="btn btn-secondary advanced-toggle"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
        >
          {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
        </button>

        {showAdvancedOptions && (
          <div className="advanced-options">
            <h3>Performance Settings</h3>
            
            <div className="form-group">
              <label className="form-label">Request Timeout (seconds)</label>
              <input
                type="number"
                value={parameters.requestTimeout || 10}
                onChange={(e) => handleParameterChange('requestTimeout', Number(e.target.value))}
                className="form-input"
                min="1"
                max="60"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Delay Between Requests (ms)</label>
              <input
                type="number"
                value={parameters.delayBetweenRequests || 100}
                onChange={(e) => handleParameterChange('delayBetweenRequests', Number(e.target.value))}
                className="form-input"
                min="0"
                max="5000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Max Concurrent Requests</label>
              <input
                type="number"
                value={parameters.maxConcurrentRequests || 5}
                onChange={(e) => handleParameterChange('maxConcurrentRequests', Number(e.target.value))}
                className="form-input"
                min="1"
                max="20"
              />
            </div>
          </div>
        )}
      </div>

    </div>
  )

  const renderUploadTab = () => (
    <div className="upload-tab">
      <div className="csv-upload-section">
        <h3>CSV Data Upload</h3>
        
        <div
          className={`file-dropzone ${dragOver ? 'drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="dropzone-content">
            <div className="dropzone-icon">
              <Icon icon={FileText} size={48} />
            </div>
            <p>Drop CSV file here or click to browse</p>
            <small>Supports .csv files up to 10MB</small>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            style={{ display: 'none' }}
          />
        </div>

        <div className="csv-text-section">
          <h4>Or paste CSV data directly:</h4>
          <textarea
            value={parameters.csvData || ''}
            onChange={(e) => {
              handleParameterChange('csvData', e.target.value)
              parseCsvPreview(e.target.value)
            }}
            className="csv-textarea"
            placeholder="firstName,lastName,emailAddress&#10;John,Doe,john.doe@example.com&#10;Jane,Smith,jane.smith@company.com"
            rows={10}
          />
        </div>

        {csvPreview.length > 0 && (
          <div className="csv-preview-section">
            <h4>Data Preview (first 3 rows)</h4>
            <div className="csv-preview-table">
              <table>
                <thead>
                  <tr>
                    {Object.keys(csvPreview[0]).map(header => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, cellIndex) => (
                        <td key={cellIndex}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderProcessTab = () => (
    <div className="process-tab">
      <div className="processing-status">
        {isExecuting ? (
          <div className="processing-active">
            <LoadingSpinner message={progress || 'Processing bulk submissions...'} />
            <div className="processing-info">
              <p>Please wait while your forms are being submitted...</p>
              <p><strong>Note:</strong> Do not close this window during processing.</p>
            </div>
          </div>
        ) : (
          <div className="processing-ready">
            <h3>Ready to Process</h3>
            <p>Click "Start Bulk Submit" to begin processing your CSV data.</p>
            
            {validationErrors.length > 0 && (
              <div className="validation-errors">
                <h4>Please fix these issues:</h4>
                <ul>
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <button
              className="btn btn-primary btn-large"
              onClick={handleExecute}
              disabled={isExecuting || validationErrors.length > 0}
            >
              Start Bulk Submit
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const renderResultsTab = () => {
    if (!result) {
      return (
        <div className="results-tab">
          <p>No results to display. Run a bulk submit operation first.</p>
        </div>
      )
    }

    const isSubmitResult = result.data?.summary && result.data?.results
    const summary: BulkSubmitSummary | undefined = result.data?.summary
    const results: ProcessedRow[] | undefined = result.data?.results

    return (
      <div className="results-tab">
        {result.success ? (
          <>
            {isSubmitResult ? (
              <>
                <div className="results-summary">
                  <h3>Bulk Submit Results</h3>
                  <div className="summary-stats">
                    <div className="stat-card">
                      <div className="stat-number">{summary?.totalRows || 0}</div>
                      <div className="stat-label">Total Rows</div>
                    </div>
                    <div className="stat-card success">
                      <div className="stat-number">{summary?.successfulRequests || 0}</div>
                      <div className="stat-label">Successful</div>
                    </div>
                    <div className="stat-card error">
                      <div className="stat-number">{summary?.failedRequests || 0}</div>
                      <div className="stat-label">Failed</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{summary?.successRate || 0}%</div>
                      <div className="stat-label">Success Rate</div>
                    </div>
                  </div>
                  
                  <div className="performance-stats">
                    <p><strong>Total Processing Time:</strong> {summary?.totalProcessingTime || 0}ms</p>
                    <p><strong>Average Processing Time:</strong> {summary?.averageProcessingTime || 0}ms per request</p>
                  </div>
                </div>

                {results && results.length > 0 && (
                  <div className="results-table-section">
                    <h4>Detailed Results</h4>
                    <div className="results-table-container">
                      <table className="results-table">
                        <thead>
                          <tr>
                            <th>Row</th>
                            <th>Status</th>
                            <th>Status Code</th>
                            <th>Processing Time (ms)</th>
                            <th>Parameters</th>
                            <th>Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((row, index) => (
                            <tr key={index} className={row.success ? 'success-row' : 'error-row'}>
                              <td>{row.rowNumber}</td>
                              <td>
                                <span className="status-icon">
                                  {row.success ? (
                                    <><Icon icon={CheckCircle} size={16} /> Success</>
                                  ) : (
                                    <><Icon icon={XCircle} size={16} /> Failed</>
                                  )}
                                </span>
                              </td>
                              <td>{row.statusCode || 'N/A'}</td>
                              <td>{row.processingTime}</td>
                              <td>{row.parametersCount}</td>
                              <td>{row.error || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="generic-result">
                <h3>Result</h3>
                <p>{result.message}</p>
                {result.data && (
                  <pre className="result-data">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="error-result">
            <h3>Error</h3>
            <p>{result.error || 'An unknown error occurred'}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="form-bulk-submit-component full-width">
      <div className="tool-header">
        <div className="tool-title">
          <span className="tool-icon">
            <Icon icon={ClipboardList} size={80} />
          </span>
          <div className="tool-title-text">
            <h1>Form Bulk Submit</h1>
            <p className="tool-description">Submit form data in bulk from CSV files to Eloqua forms with progress tracking and detailed reporting.</p>
          </div>
        </div>
      </div>

      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'configure' ? 'active' : ''}`}
          onClick={() => setActiveTab('configure')}
        >
          Configure
        </button>
        <button
          className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Data
        </button>
        <button
          className={`tab-button ${activeTab === 'process' ? 'active' : ''}`}
          onClick={() => setActiveTab('process')}
        >
          Process
        </button>
        <button
          className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          Results
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'configure' && renderConfigurationTab()}
        {activeTab === 'upload' && renderUploadTab()}
        {activeTab === 'process' && renderProcessTab()}
        {activeTab === 'results' && renderResultsTab()}
      </div>

      {error && (
        <div className="tool-error">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={clearError} className="btn btn-secondary">
            Clear Error
          </button>
        </div>
      )}
    </div>
  )
}

export default FormBulkSubmitComponent