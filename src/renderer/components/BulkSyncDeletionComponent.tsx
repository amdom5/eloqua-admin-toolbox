import React, { useState, useCallback, useRef } from 'react'
import useTool from '../hooks/useTool'
import LoadingSpinner from './LoadingSpinner'
import { Trash2, Upload, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react'
import Icon from '../../components/ui/Icon'

interface BulkDeletionParameters {
  operation: 'delete-syncs' | 'delete-contact-fields'
  exportIds?: string[]
  importIds?: string[]
  contactFieldIds?: string[]
}

interface DeletionResult {
  id: string
  type: 'export' | 'import' | 'contact-field'
  success: boolean
  error?: string
}

interface BulkDeletionSummary {
  totalItems: number
  successfulDeletions: number
  failedDeletions: number
  inProgress: number
}

function BulkSyncDeletionComponent() {
  const { executeTool, isExecuting, progress, result, error, clearResult, clearError } = useTool()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Form state
  const [operation, setOperation] = useState<'delete-syncs' | 'delete-contact-fields'>('delete-contact-fields')
  const [exportIds, setExportIds] = useState<string>('')
  const [importIds, setImportIds] = useState<string>('')
  const [contactFieldIds, setContactFieldIds] = useState<string>('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  
  // Results state
  const [deletionResults, setDeletionResults] = useState<DeletionResult[]>([])
  const [summary, setSummary] = useState<BulkDeletionSummary>({
    totalItems: 0,
    successfulDeletions: 0,
    failedDeletions: 0,
    inProgress: 0
  })

  const parseIds = (input: string): string[] => {
    if (!input.trim()) return []
    
    return input
      .split(/[,\n\r\s]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0 && /^\d+$/.test(id))
  }

  const getTotalItems = (): number => {
    if (operation === 'delete-contact-fields') {
      return parseIds(contactFieldIds).length
    } else {
      const exports = parseIds(exportIds)
      const imports = parseIds(importIds)
      return exports.length + imports.length
    }
  }

  const handleFileSelect = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const csvText = e.target?.result as string
      parseCSVData(csvText)
    }
    reader.readAsText(file)
  }

  const parseCSVData = (csvText: string) => {
    if (!csvText.trim()) return
    
    const lines = csvText.trim().split('\n')
    const exports: string[] = []
    const imports: string[] = []
    
    for (const line of lines) {
      const trimmedLine = line.trim().toLowerCase()
      
      // Skip header lines
      if (trimmedLine.includes('export') || trimmedLine.includes('import') || trimmedLine.includes('id')) {
        continue
      }
      
      // Parse CSV values
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      
      if (values.length >= 2) {
        // Assume format: ID, Type
        const id = values[0]
        const type = values[1].toLowerCase()
        
        if (/^\d+$/.test(id)) {
          if (type.includes('export')) {
            exports.push(id)
          } else if (type.includes('import')) {
            imports.push(id)
          }
        }
      } else if (values.length === 1) {
        // Single column - assume export IDs
        const id = values[0]
        if (/^\d+$/.test(id)) {
          exports.push(id)
        }
      }
    }
    
    if (exports.length > 0) {
      setExportIds(prev => prev ? `${prev}\n${exports.join('\n')}` : exports.join('\n'))
    }
    if (imports.length > 0) {
      setImportIds(prev => prev ? `${prev}\n${imports.join('\n')}` : imports.join('\n'))
    }
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

  const handleConfirmDeletion = async () => {
    setShowConfirmation(false)
    clearResult()
    clearError()
    
    let parameters: any = {
      operation
    }

    if (operation === 'delete-contact-fields') {
      const fieldIdList = parseIds(contactFieldIds)
      parameters.contactFieldIds = fieldIdList
    } else {
      const exportIdList = parseIds(exportIds)
      const importIdList = parseIds(importIds)
      parameters.syncIds = [...exportIdList, ...importIdList]
    }
    
    // Initialize results tracking
    const totalItems = getTotalItems()
    setDeletionResults([])
    setSummary({
      totalItems,
      successfulDeletions: 0,
      failedDeletions: 0,
      inProgress: totalItems
    })
    
    try {
      await executeTool('bulk-sync-deletion-tool', parameters)
    } catch (error) {
      console.error('Bulk deletion failed:', error)
    }
  }

  const handleStartDeletion = () => {
    const total = getTotalItems()
    if (total === 0) {
      const message = operation === 'delete-contact-fields' 
        ? 'Please enter at least one Contact Field ID'
        : 'Please enter at least one Export ID or Import ID'
      alert(message)
      return
    }
    
    setShowConfirmation(true)
  }

  const handleClear = () => {
    setExportIds('')
    setImportIds('')
    setContactFieldIds('')
    setDeletionResults([])
    setSummary({
      totalItems: 0,
      successfulDeletions: 0,
      failedDeletions: 0,
      inProgress: 0
    })
    clearResult()
    clearError()
  }

  return (
    <div className="bulk-sync-deletion-component">
      <div className="tool-header">
        <div className="tool-title">
          <Icon icon={Trash2} size={32} />
          <div>
            <h1>Bulk Export/Import Deletion</h1>
            <p>Delete multiple Eloqua bulk exports and imports by ID</p>
          </div>
        </div>
      </div>

      <div className="tool-content">
        {/* Critical Warning Section */}
        <div className="warning-section critical">
          <div className="warning-header">
            <Icon icon={AlertTriangle} size={24} />
            <h3>CRITICAL WARNING</h3>
          </div>
          <div className="warning-content">
            <p><strong>This tool will PERMANENTLY DELETE contact fields and bulk syncs from your Eloqua instance.</strong></p>
            <p><strong>There is NO DRY RUN MODE - All operations execute immediately.</strong></p>
            <p><strong>Deleted items cannot be recovered and all associated data will be lost.</strong></p>
            <p>Double-check all field IDs before proceeding. Ensure you have proper backups.</p>
          </div>
        </div>

        {/* Operation Selector */}
        <div className="operation-section">
          <h3>Operation Type</h3>
          <div className="operation-tabs">
            <button
              className={`tab ${operation === 'delete-contact-fields' ? 'active' : ''}`}
              onClick={() => setOperation('delete-contact-fields')}
            >
              Delete Contact Fields (with Dependencies)
            </button>
            <button
              className={`tab ${operation === 'delete-syncs' ? 'active' : ''}`}
              onClick={() => setOperation('delete-syncs')}
            >
              Delete Bulk Syncs Directly
            </button>
          </div>
        </div>

        {/* Input Section */}
        <div className="input-section">
          {operation === 'delete-contact-fields' ? (
            <>
              <div className="operation-warning">
                <Icon icon={AlertTriangle} size={20} />
                <p><strong>WARNING:</strong> Contact field deletion will automatically delete any associated bulk export/import definitions first, then permanently delete the contact fields themselves.</p>
              </div>
              <div className="input-group">
                <label htmlFor="contact-field-ids">
                  <Icon icon={FileText} size={16} />
                  Contact Field IDs
                </label>
                <textarea
                  id="contact-field-ids"
                  value={contactFieldIds}
                  onChange={(e) => setContactFieldIds(e.target.value)}
                  placeholder="Enter contact field IDs separated by commas or new lines:&#10;100001&#10;100002&#10;100003"
                  rows={6}
                  disabled={isExecuting}
                />
                <small>Enter contact field IDs (bulk sync dependencies will be automatically resolved)</small>
              </div>
            </>
          ) : (
            <>
              <div className="operation-warning">
                <Icon icon={AlertTriangle} size={20} />
                <p><strong>WARNING:</strong> This will permanently delete the specified bulk export and import definitions directly.</p>
              </div>
              <div className="input-group">
                <label htmlFor="export-ids">
                  <Icon icon={FileText} size={16} />
                  Export IDs
                </label>
                <textarea
                  id="export-ids"
                  value={exportIds}
                  onChange={(e) => setExportIds(e.target.value)}
                  placeholder="Enter export IDs separated by commas or new lines:&#10;12345&#10;67890&#10;11111"
                  rows={4}
                  disabled={isExecuting}
                />
                <small>Enter bulk export IDs (one per line or comma-separated)</small>
              </div>

              <div className="input-group">
                <label htmlFor="import-ids">
                  <Icon icon={FileText} size={16} />
                  Import IDs
                </label>
                <textarea
                  id="import-ids"
                  value={importIds}
                  onChange={(e) => setImportIds(e.target.value)}
                  placeholder="Enter import IDs separated by commas or new lines:&#10;22222&#10;33333&#10;44444"
                  rows={4}
                  disabled={isExecuting}
                />
                <small>Enter bulk import IDs (one per line or comma-separated)</small>
              </div>
            </>
          )}

          {/* CSV Upload */}
          <div className="csv-upload">
            <h3>Or upload CSV file:</h3>
            <div
              className={`file-dropzone ${dragOver ? 'drag-over' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon icon={Upload} size={24} />
              <p>Drop CSV file here or click to browse</p>
              <small>Expected format: ID,Type or just IDs (assumed as exports)</small>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Summary */}
        {getTotalItems() > 0 && (
          <div className="items-summary">
            <div className="summary-stats">
              {operation === 'delete-contact-fields' ? (
                <>
                  <div className="stat">
                    <strong>{parseIds(contactFieldIds).length}</strong> Contact Fields
                  </div>
                </>
              ) : (
                <>
                  <div className="stat">
                    <strong>{parseIds(exportIds).length}</strong> Exports
                  </div>
                  <div className="stat">
                    <strong>{parseIds(importIds).length}</strong> Imports
                  </div>
                </>
              )}
              <div className="stat total">
                <strong>{getTotalItems()}</strong> Total Items
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            className="btn btn-danger"
            onClick={handleStartDeletion}
            disabled={isExecuting || getTotalItems() === 0}
          >
            <Icon icon={Trash2} size={16} />
            Delete All Items
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleClear}
            disabled={isExecuting}
          >
            Clear All
          </button>
        </div>

        {/* Progress Section */}
        {isExecuting && (
          <div className="progress-section">
            <LoadingSpinner message={progress || 'Deleting items...'} />
            <div className="progress-stats">
              <div className="stat success">
                <Icon icon={CheckCircle} size={16} />
                <span>{summary.successfulDeletions} Successful</span>
              </div>
              <div className="stat error">
                <Icon icon={XCircle} size={16} />
                <span>{summary.failedDeletions} Failed</span>
              </div>
              <div className="stat">
                <span>{summary.inProgress} Remaining</span>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="results-section">
            <h3>Deletion Results</h3>
            <div className="results-summary">
              <div className="summary-stats">
                <div className="stat">
                  <strong>{result.data?.summary?.totalItems || 0}</strong> Total
                </div>
                <div className="stat success">
                  <strong>{result.data?.summary?.successfulDeletions || 0}</strong> Successful
                </div>
                <div className="stat error">
                  <strong>{result.data?.summary?.failedDeletions || 0}</strong> Failed
                </div>
              </div>
            </div>
            
            {result.data?.results && result.data.results.length > 0 && (
              <div className="results-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.results.map((item: DeletionResult, index: number) => (
                      <tr key={index} className={item.success ? 'success' : 'error'}>
                        <td>{item.id}</td>
                        <td>{item.type}</td>
                        <td>
                          <Icon icon={item.success ? CheckCircle : XCircle} size={16} />
                          {item.success ? 'Deleted' : 'Failed'}
                        </td>
                        <td>{item.error || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-section">
            <h3>Error</h3>
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="modal-overlay">
          <div className="confirmation-dialog">
            <div className="confirmation-header">
              <Icon icon={AlertTriangle} size={24} />
              <h3>Confirm Bulk Deletion</h3>
            </div>
            <div className="confirmation-body">
              <p>
                <strong>WARNING:</strong> You are about to permanently delete <strong>{getTotalItems()} items</strong>:
              </p>
              <ul>
                {operation === 'delete-contact-fields' ? (
                  <li><strong>{parseIds(contactFieldIds).length}</strong> contact fields (with automatic dependency resolution)</li>
                ) : (
                  <>
                    {parseIds(exportIds).length > 0 && (
                      <li><strong>{parseIds(exportIds).length}</strong> bulk exports</li>
                    )}
                    {parseIds(importIds).length > 0 && (
                      <li><strong>{parseIds(importIds).length}</strong> bulk imports</li>
                    )}
                  </>
                )}
              </ul>
              <p><strong>This action cannot be undone and will immediately execute the deletion!</strong></p>
            </div>
            <div className="confirmation-actions">
              <button
                className="btn btn-danger"
                onClick={handleConfirmDeletion}
              >
                <Icon icon={Trash2} size={16} />
                Delete All
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BulkSyncDeletionComponent