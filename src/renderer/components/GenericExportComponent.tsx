import React, { useState } from 'react'
import useTool from '../hooks/useTool'
import LoadingSpinner from './LoadingSpinner'
import { Download, FileText, CheckCircle, AlertCircle, Settings } from 'lucide-react'
import Icon from '../../components/ui/Icon'
import '../styles/GenericExportComponent.css'

interface GenericExportParameters {
  operation: string
  filename: string
  format: 'csv' | 'json'
}

interface ExportSummary {
  filename: string
  format: string
  processingTime: number
  [key: string]: any // Allow additional summary fields
}

interface GenericExportComponentProps {
  toolId: string
  toolName: string
  entityName: string // "programs", "campaigns", etc.
  entityNameSingular: string // "program", "campaign", etc.
  defaultFilename: string
  summaryFields: Array<{
    key: string
    label: string
    getValue: (summary: any) => string | number
  }>
  previewFields: Array<{
    key: string
    label: string
    getValue: (item: any) => string
  }>
  description: string
  exportInfo: {
    title: string
    items: string[]
  }
}

function GenericExportComponent({
  toolId,
  toolName,
  entityName,
  entityNameSingular,
  defaultFilename,
  summaryFields,
  previewFields,
  description,
  exportInfo
}: GenericExportComponentProps) {
  const { executeTool, isExecuting, progress, result, error, clearResult, clearError } = useTool()
  
  // Form state
  const [filename, setFilename] = useState(defaultFilename)
  const [format, setFormat] = useState<'csv' | 'json'>('csv')

  const handleExport = async () => {
    clearResult()
    clearError()
    
    const parameters: GenericExportParameters = {
      operation: `export-${entityName}`,
      filename: filename.trim() || defaultFilename,
      format
    }
    
    try {
      await executeTool(toolId, parameters)
    } catch (error) {
      console.error(`${toolName} export failed:`, error)
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
    setFilename(defaultFilename)
    setFormat('csv')
    clearResult()
    clearError()
  }

  return (
    <div className="generic-export-component">
      <div className="tool-header">
        <div className="tool-title">
          <Icon icon={Download} size={32} />
          <div>
            <h1>{toolName}</h1>
            <p>{description}</p>
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
                placeholder={defaultFilename}
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
          </div>
        </div>

        {/* Export Information */}
        <div className="info-section">
          <h3>What will be exported?</h3>
          <div className="info-grid">
            <div className="info-item">
              <h4>{exportInfo.title}</h4>
              <ul>
                {exportInfo.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
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
                  <li>Array of {entityNameSingular} objects</li>
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
            Export {entityName.charAt(0).toUpperCase() + entityName.slice(1)}
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
            <LoadingSpinner message={progress || `Exporting ${entityName}...`} />
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
                  {summaryFields.map((field, index) => (
                    <div key={index} className="summary-item">
                      <strong>{field.getValue(result.data.summary)}</strong>
                      <span>{field.label}</span>
                    </div>
                  ))}
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
            {result.data?.[entityName] && result.data[entityName].length > 0 && (
              <div className="preview-section">
                <h4>Preview (First 10 {entityName.charAt(0).toUpperCase() + entityName.slice(1)})</h4>
                <div className="preview-table">
                  <table>
                    <thead>
                      <tr>
                        {previewFields.map((field, index) => (
                          <th key={index}>{field.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.data[entityName].map((item: any, index: number) => (
                        <tr key={index}>
                          {previewFields.map((field, fieldIndex) => (
                            <td key={fieldIndex}>{field.getValue(item)}</td>
                          ))}
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

export default GenericExportComponent