import React, { useState } from 'react'
import useTool from '../hooks/useTool'
import LoadingSpinner from './LoadingSpinner'
import { Download, FileText, CheckCircle, AlertCircle, Settings } from 'lucide-react'
import Icon from '../../components/ui/Icon'
import '../styles/ContactFieldExportComponent.css'

interface ContactFieldExportParameters {
  operation: 'export-fields'
  filename: string
  includeSystemFields: boolean
  format: 'csv' | 'json'
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

interface ExportSummary {
  totalFields: number
  systemFields: number
  customFields: number
  exportedFields: number
  filename: string
  format: string
}

function ContactFieldExportComponent() {
  const { executeTool, isExecuting, progress, result, error, clearResult, clearError } = useTool()
  
  // Form state
  const [filename, setFilename] = useState('contact-fields-export')
  const [includeSystemFields, setIncludeSystemFields] = useState(true)
  const [format, setFormat] = useState<'csv' | 'json'>('csv')

  const handleExport = async () => {
    clearResult()
    clearError()
    
    const parameters: ContactFieldExportParameters = {
      operation: 'export-fields',
      filename: filename.trim() || 'contact-fields-export',
      includeSystemFields,
      format
    }
    
    try {
      await executeTool('contact-field-export-tool', parameters)
    } catch (error) {
      console.error('Contact field export failed:', error)
    }
  }

  const handleDownload = () => {
    if (!result?.data?.exportData || !result?.data?.filename) return
    
    const blob = new Blob([result.data.exportData], { 
      type: format === 'csv' ? 'text/csv' : 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.data.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    setFilename('contact-fields-export')
    setIncludeSystemFields(true)
    setFormat('csv')
    clearResult()
    clearError()
  }

  return (
    <div className="contact-field-export-component">
      <div className="tool-header">
        <div className="tool-title">
          <Icon icon={Download} size={32} />
          <div>
            <h1>Contact Field Export</h1>
            <p>Export all Eloqua contact fields to CSV or JSON format</p>
          </div>
        </div>
      </div>

      <div className="tool-content">
        {/* Export Configuration */}
        <div className="config-section">
          <h3>
            <Icon icon={Settings} size={20} />
            Export Configuration
          </h3>
          
          <div className="config-grid">
            <div className="input-group">
              <label htmlFor="filename">
                <Icon icon={FileText} size={16} />
                Filename
              </label>
              <input
                id="filename"
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="contact-fields-export"
                disabled={isExecuting}
              />
              <small>Timestamp will be added automatically (e.g., filename-2024-01-15T10-30-00.csv)</small>
            </div>

            <div className="input-group">
              <label htmlFor="format">
                <Icon icon={FileText} size={16} />
                Export Format
              </label>
              <select
                id="format"
                value={format}
                onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}
                disabled={isExecuting}
              >
                <option value="csv">CSV (Comma-Separated Values)</option>
                <option value="json">JSON (JavaScript Object Notation)</option>
              </select>
              <small>
                {format === 'csv' 
                  ? 'Best for Excel and data analysis tools' 
                  : 'Best for programmatic processing and APIs'
                }
              </small>
            </div>

            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={includeSystemFields}
                  onChange={(e) => setIncludeSystemFields(e.target.checked)}
                  disabled={isExecuting}
                />
                <span>Include system fields</span>
              </label>
              <small>
                {includeSystemFields 
                  ? 'Export will include both system and custom fields' 
                  : 'Export will include only custom fields'
                }
              </small>
            </div>
          </div>
        </div>

        {/* Export Information */}
        <div className="info-section">
          <h3>What will be exported?</h3>
          <div className="info-grid">
            <div className="info-item">
              <h4>Field Information</h4>
              <ul>
                <li>Field ID and names (display and internal)</li>
                <li>Data types and display types</li>
                <li>Field properties (required, read-only, system)</li>
                <li>Creation and modification timestamps</li>
                <li>Creator and modifier information</li>
                <li>Default values and option list references</li>
              </ul>
            </div>
            <div className="info-item">
              <h4>Format Details</h4>
              {format === 'csv' ? (
                <ul>
                  <li>Excel-compatible CSV format</li>
                  <li>Proper escaping of special characters</li>
                  <li>Column headers included</li>
                  <li>Boolean values as true/false</li>
                </ul>
              ) : (
                <ul>
                  <li>Pretty-formatted JSON structure</li>
                  <li>Array of field objects</li>
                  <li>All metadata preserved</li>
                  <li>Ready for API consumption</li>
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={isExecuting}
          >
            <Icon icon={Download} size={16} />
            Export Contact Fields
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleClear}
            disabled={isExecuting}
          >
            Reset Configuration
          </button>
        </div>

        {/* Progress Section */}
        {isExecuting && (
          <div className="progress-section">
            <LoadingSpinner message={progress || 'Exporting contact fields...'} />
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="results-section">
            <div className="result-header">
              <Icon icon={CheckCircle} size={24} />
              <h3>Export Completed Successfully</h3>
            </div>
            
            {result.data?.summary && (
              <div className="export-summary">
                <h4>Export Summary</h4>
                <div className="summary-grid">
                  <div className="summary-item">
                    <strong>{result.data.summary.totalFields}</strong>
                    <span>Total Fields Found</span>
                  </div>
                  <div className="summary-item">
                    <strong>{result.data.summary.systemFields}</strong>
                    <span>System Fields</span>
                  </div>
                  <div className="summary-item">
                    <strong>{result.data.summary.customFields}</strong>
                    <span>Custom Fields</span>
                  </div>
                  <div className="summary-item">
                    <strong>{result.data.summary.exportedFields}</strong>
                    <span>Fields Exported</span>
                  </div>
                </div>
                
                <div className="file-info">
                  <p><strong>File:</strong> {result.data.summary.filename}</p>
                  <p><strong>Format:</strong> {result.data.summary.format.toUpperCase()}</p>
                  <p><strong>Processing Time:</strong> {result.data.processingTime}ms</p>
                </div>
              </div>
            )}

            {/* Download Button */}
            <div className="download-section">
              <button
                className="btn btn-success"
                onClick={handleDownload}
              >
                <Icon icon={Download} size={16} />
                Download {result.data?.summary?.filename}
              </button>
            </div>

            {/* Preview Section */}
            {result.data?.fields && result.data.fields.length > 0 && (
              <div className="preview-section">
                <h4>Preview (First 10 Fields)</h4>
                <div className="preview-table">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Internal Name</th>
                        <th>Data Type</th>
                        <th>System</th>
                        <th>Required</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.fields.map((field: ContactField, index: number) => (
                        <tr key={index}>
                          <td>{field.id}</td>
                          <td>{field.name}</td>
                          <td>{field.internalName}</td>
                          <td>{field.dataType}</td>
                          <td>{field.isSystem ? 'Yes' : 'No'}</td>
                          <td>{field.isRequired ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-section">
            <div className="error-header">
              <Icon icon={AlertCircle} size={24} />
              <h3>Export Failed</h3>
            </div>
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={clearError}>
              Dismiss Error
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ContactFieldExportComponent