import React, { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import ToolManager from '../../tools/ToolManager'
import useTool from '../hooks/useTool'
import LoadingSpinner from './LoadingSpinner'
import Icon from '../../components/ui/Icon'
import { Mail, FileText, ClipboardList, Link as LinkIcon, Trash2 } from './icons'
import ErrorBoundary from './ErrorBoundary'
import '../styles/ToolRenderer.css'

// Import components directly (no lazy loading for tools to prevent hash mismatch errors)
import EmailResultsDisplay from './EmailResultsDisplay'
import FormResultsDisplay from './FormResultsDisplay'
import DependencyResultsDisplay from './DependencyResultsDisplay'
import FormBulkSubmitComponent from './FormBulkSubmitComponent'
import BulkSyncDeletionComponent from './BulkSyncDeletionComponent'
import ContactFieldExportComponent from './ContactFieldExportComponent'
import ProgramExportComponent from './ProgramExportComponent'
import CampaignExportComponent from './CampaignExportComponent'

interface ToolFormData {
  [key: string]: any
}

// Icon mapping
const iconMap: { [key: string]: React.ComponentType } = {
  'Mail': Mail,
  'FileText': FileText,
  'ClipboardList': ClipboardList,
  'Link': LinkIcon,
  'Trash2': Trash2,
}

function ToolRenderer() {
  const { toolId } = useParams<{ toolId: string }>()
  const location = useLocation()
  const { executeTool, isExecuting, progress, result, error, clearResult, clearError } = useTool()
  const [formData, setFormData] = useState<ToolFormData>({})
  const [toolConfig, setToolConfig] = useState<any>(null)
  const [parameterSchema, setParameterSchema] = useState<any>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [emailSearchTab, setEmailSearchTab] = useState<'id' | 'criteria'>('criteria')
  const [formSearchTab, setFormSearchTab] = useState<'id' | 'criteria'>('criteria')

  useEffect(() => {
    // Clear any previous errors and results when switching tools
    clearResult()
    clearError()
    
    const toolManager = ToolManager.getInstance()
    toolManager.initialize()
    
    // Determine tool ID from either param or path
    let currentToolId = toolId
    if (!currentToolId) {
      // Map path to tool ID
      const pathToToolMap: { [key: string]: string } = {
        '/email-assets': 'email-asset-tool',
        '/form-assets': 'form-asset-tool',
        '/dependencies': 'asset-dependency-tool',
        '/bulk-sync-deletion': 'bulk-sync-deletion-tool',
        '/form-management': 'form-management-tool',
        '/form-bulk-submit': 'form-bulk-submit-tool'
      }
      currentToolId = pathToToolMap[location.pathname]
    }
    
    if (currentToolId) {
      try {
        const config = toolManager.getToolConfig(currentToolId)
        const schema = toolManager.getToolParameterSchema(currentToolId)
        
        setToolConfig(config)
        setParameterSchema(schema)
        
        // Initialize form data with defaults
        if (schema) {
          const defaults: ToolFormData = {}
          Object.entries(schema).forEach(([key, fieldSchema]: [string, any]) => {
            if (fieldSchema.default !== undefined) {
              defaults[key] = fieldSchema.default
            }
          })
          setFormData(defaults)
        }
      } catch (error) {
        console.error('Failed to load tool configuration:', error)
        setToolConfig(null)
        setParameterSchema(null)
      }
    }
    
    // Reset advanced options state when switching tools
    setShowAdvancedOptions(false)
    
    // Add a cleanup function to prevent memory leaks
    return () => {
      // Clear any pending state updates
      setFormData({})
      setIsExporting(false)
    }
  }, [toolId, location.pathname])

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const handleExecute = async () => {
    // Get the current tool ID
    let currentToolId = toolId
    if (!currentToolId) {
      const pathToToolMap: { [key: string]: string } = {
        '/email-assets': 'email-asset-tool',
        '/form-assets': 'form-asset-tool',
        '/dependencies': 'asset-dependency-tool',
        '/bulk-sync-deletion': 'bulk-sync-deletion-tool',
        '/form-management': 'form-management-tool',
        '/form-bulk-submit': 'form-bulk-submit-tool'
      }
      currentToolId = pathToToolMap[location.pathname]
    }
    
    if (!currentToolId) return
    
    clearResult()
    clearError()
    
    try {
      await executeTool(currentToolId, formData)
    } catch (error) {
      console.error('Tool execution failed:', error)
    }
  }

  const renderFormField = (fieldName: string, fieldSchema: any) => {
    const value = formData[fieldName] || ''
    
    // Safety check to prevent crashes
    if (!fieldSchema || !fieldSchema.type) {
      console.warn(`Missing field schema for ${fieldName}`)
      return null
    }
    
    switch (fieldSchema.type) {
      case 'string':
        if (fieldSchema.enum) {
          return (
            <select
              value={value}
              onChange={(e) => handleInputChange(fieldName, e.target.value)}
              className="form-input"
              required={fieldSchema.required}
            >
              <option value="">Select an option</option>
              {fieldSchema.enum.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )
        }
        // Handle date fields - only for actual date fields, not user fields
        if (fieldName === 'createdAt' || fieldName === 'updatedAt' || 
            fieldName.includes('After') || fieldName.includes('Before')) {
          return (
            <input
              type="date"
              value={value}
              onChange={(e) => handleInputChange(fieldName, e.target.value)}
              className="form-input"
              required={fieldSchema.required}
            />
          )
        }
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className="form-input"
            placeholder={fieldSchema.description}
            required={fieldSchema.required}
          />
        )
      
      case 'array':
        const arrayValue = Array.isArray(value) ? value.join('\n') : value
        return (
          <textarea
            value={arrayValue}
            onChange={(e) => {
              const lines = e.target.value.split('\n').map(line => line.trim()).filter(line => line.length > 0)
              handleInputChange(fieldName, lines)
            }}
            className="form-input array-input"
            placeholder={`${fieldSchema.description}\n(Enter one item per line)`}
            rows={5}
            required={fieldSchema.required}
          />
        )
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(fieldName, Number(e.target.value))}
            className="form-input"
            placeholder={fieldSchema.description}
            min={fieldSchema.min}
            max={fieldSchema.max}
            required={fieldSchema.required}
          />
        )
      
      case 'boolean':
        return (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleInputChange(fieldName, e.target.checked)}
            />
            {fieldSchema.description}
          </label>
        )
      
      default:
        return null
    }
  }

  const handleExportResults = async () => {
    if (!result?.data) return
    
    setIsExporting(true)
    try {
      // Use the export format from the original form data
      const exportFormat = formData.exportFormat || 'csv'
      const fileName = `${toolConfig.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.${exportFormat}`
      
      if (exportFormat === 'csv') {
        await window.electronAPI.exportCsv(result.data, fileName)
      } else {
        const jsonContent = JSON.stringify(result.data, null, 2)
        await window.electronAPI.writeFile(fileName, jsonContent)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  if (!toolConfig || !parameterSchema) {
    return <LoadingSpinner message="Loading tool..." />
  }

  const isEmailTool = toolConfig.id === 'email-asset-tool'
  const isFormTool = toolConfig.id === 'form-asset-tool'
  const isDependencyTool = toolConfig.id === 'asset-dependency-tool'
  const isFormBulkSubmitTool = toolConfig.id === 'form-bulk-submit-tool'
  const isBulkSyncDeletionTool = toolConfig.id === 'bulk-sync-deletion-tool'
  const isContactFieldExportTool = toolConfig.id === 'contact-field-export-tool'
  const isProgramExportTool = toolConfig.id === 'program-export-tool'
  const isCampaignExportTool = toolConfig.id === 'campaign-export-tool'

  // If this is the Form Bulk Submit tool, render its dedicated component
  if (isFormBulkSubmitTool) {
    return (
      <ErrorBoundary>
        <FormBulkSubmitComponent />
      </ErrorBoundary>
    )
  }
  
  // If this is the Bulk Sync Deletion tool, render its dedicated component
  if (isBulkSyncDeletionTool) {
    return (
      <ErrorBoundary>
        <BulkSyncDeletionComponent />
      </ErrorBoundary>
    )
  }

  // If this is the Contact Field Export tool, render its dedicated component
  if (isContactFieldExportTool) {
    return (
      <ErrorBoundary>
        <ContactFieldExportComponent />
      </ErrorBoundary>
    )
  }

  // If this is the Program Export tool, render its dedicated component
  if (isProgramExportTool) {
    return (
      <ErrorBoundary>
        <ProgramExportComponent />
      </ErrorBoundary>
    )
  }

  // If this is the Campaign Export tool, render its dedicated component
  if (isCampaignExportTool) {
    return (
      <ErrorBoundary>
        <CampaignExportComponent />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div className="tool-renderer full-width">
        <div className="tool-header">
          <div className="tool-title">
            <span className="tool-icon">
              <Icon icon={iconMap[toolConfig.icon] || Mail} size={80} />
            </span>
            <div className="tool-title-text">
              <h1>{toolConfig.name}</h1>
              <p className="tool-description">{toolConfig.description}</p>
            </div>
          </div>
        </div>

        <div className="tool-content">
        <div className="tool-form">
          <h2>Configuration</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleExecute(); }}>
            {/* Email Tool Tabbed Interface */}
            {isEmailTool ? (
              <>
                <div className="email-search-tabs">
                  <button
                    type="button"
                    className={`email-tab ${emailSearchTab === 'id' ? 'active' : ''}`}
                    onClick={() => setEmailSearchTab('id')}
                  >
                    Search by ID
                  </button>
                  <button
                    type="button"
                    className={`email-tab ${emailSearchTab === 'criteria' ? 'active' : ''}`}
                    onClick={() => setEmailSearchTab('criteria')}
                  >
                    Search by Criteria
                  </button>
                </div>
                
                {/* Tab Content */}
                {emailSearchTab === 'id' ? (
                  <div className="form-group">
                    <label className="form-label">
                      Email ID(s)
                      <span className="required">*</span>
                    </label>
                    {renderFormField('searchById', parameterSchema.searchById)}
                    <small className="field-description">Enter one or more email IDs (comma-separated for multiple)</small>
                  </div>
                ) : (
                  <>
                    {/* Primary Email Name Search */}
                    <div className="form-group">
                      <label className="form-label">Email Name</label>
                      {renderFormField('emailName', parameterSchema.emailName)}
                      <small className="field-description">Search for emails by name (supports wildcards with *)</small>
                    </div>
                  </>
                )}
                
                {/* Common basic fields for Email tool */}
                {Object.entries(parameterSchema)
                  .filter(([fieldName, fieldSchema]: [string, any]) => 
                    (!fieldSchema.category || fieldSchema.category === 'basic') && 
                    fieldName !== 'searchById' && 
                    fieldName !== 'includeArchived' &&
                    // Exclude all criteria-specific fields
                    fieldName !== 'emailName' &&
                    fieldName !== 'createdAt' && 
                    fieldName !== 'createdAtOperator' &&
                    fieldName !== 'updatedAt' && 
                    fieldName !== 'updatedAtOperator' &&
                    fieldName !== 'createdBy' && 
                    fieldName !== 'createdByOperator' &&
                    fieldName !== 'updatedBy' && 
                    fieldName !== 'updatedByOperator' &&
                    fieldName !== 'emailGroupId' && 
                    fieldName !== 'emailGroupIdOperator' &&
                    fieldName !== 'createdByUserId' && 
                    fieldName !== 'createdByUserIdOperator' &&
                    fieldName !== 'updatedByUserId' && 
                    fieldName !== 'updatedByUserIdOperator'
                  )
                  .map(([fieldName, fieldSchema]: [string, any]) => (
                    <div key={fieldName} className="form-group">
                      <label className="form-label">
                        {fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        {fieldSchema.required && <span className="required">*</span>}
                      </label>
                      {renderFormField(fieldName, fieldSchema)}
                      {fieldSchema.description && (
                        <small className="field-description">{fieldSchema.description}</small>
                      )}
                    </div>
                  ))
                }
              </>
            ) : isFormTool ? (
              <>
                <div className="email-search-tabs">
                  <button
                    type="button"
                    className={`email-tab ${formSearchTab === 'id' ? 'active' : ''}`}
                    onClick={() => setFormSearchTab('id')}
                  >
                    Search by ID
                  </button>
                  <button
                    type="button"
                    className={`email-tab ${formSearchTab === 'criteria' ? 'active' : ''}`}
                    onClick={() => setFormSearchTab('criteria')}
                  >
                    Search by Criteria
                  </button>
                </div>
                
                {/* Tab Content */}
                {formSearchTab === 'id' ? (
                  <div className="form-group">
                    <label className="form-label">
                      Form ID(s)
                      <span className="required">*</span>
                    </label>
                    {renderFormField('searchById', parameterSchema.searchById)}
                    <small className="field-description">Enter one or more form IDs (comma-separated for multiple)</small>
                  </div>
                ) : (
                  <>
                    {/* Primary Form Name Search */}
                    <div className="form-group">
                      <label className="form-label">Form Name</label>
                      {renderFormField('formName', parameterSchema.formName)}
                      <small className="field-description">Search for forms by name (supports wildcards with *)</small>
                    </div>
                  </>
                )}
                
                {/* Common basic fields for Form tool */}
                {Object.entries(parameterSchema)
                  .filter(([fieldName, fieldSchema]: [string, any]) => 
                    (!fieldSchema.category || fieldSchema.category === 'basic') && 
                    fieldName !== 'searchById' && 
                    fieldName !== 'includeArchived' &&
                    // Exclude all criteria-specific fields
                    fieldName !== 'formName' &&
                    fieldName !== 'createdAt' && 
                    fieldName !== 'createdAtOperator' &&
                    fieldName !== 'updatedAt' && 
                    fieldName !== 'updatedAtOperator' &&
                    fieldName !== 'createdBy' && 
                    fieldName !== 'createdByOperator' &&
                    fieldName !== 'updatedBy' && 
                    fieldName !== 'updatedByOperator' &&
                    fieldName !== 'createdByUserId' && 
                    fieldName !== 'createdByUserIdOperator' &&
                    fieldName !== 'updatedByUserId' && 
                    fieldName !== 'updatedByUserIdOperator'
                  )
                  .map(([fieldName, fieldSchema]: [string, any]) => (
                    <div key={fieldName} className="form-group">
                      <label className="form-label">
                        {fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        {fieldSchema.required && <span className="required">*</span>}
                      </label>
                      {renderFormField(fieldName, fieldSchema)}
                      {fieldSchema.description && (
                        <small className="field-description">{fieldSchema.description}</small>
                      )}
                    </div>
                  ))
                }
              </>
            ) : !isDependencyTool ? (
              /* Basic fields for non-Email/Form/Dependency tools */
              Object.entries(parameterSchema)
                .filter(([_, fieldSchema]: [string, any]) => !fieldSchema.category || fieldSchema.category === 'basic')
                .map(([fieldName, fieldSchema]: [string, any]) => (
                  <div key={fieldName} className="form-group">
                    <label className="form-label">
                      {fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      {fieldSchema.required && <span className="required">*</span>}
                    </label>
                    {renderFormField(fieldName, fieldSchema)}
                    {fieldSchema.description && (
                      <small className="field-description">{fieldSchema.description}</small>
                    )}
                  </div>
                ))
            ) : null}
            
            {/* Advanced options toggle for Email, Form and Dependency tools */}
            {(isEmailTool || isFormTool || isDependencyTool) && Object.entries(parameterSchema).some(([_, fieldSchema]: [string, any]) => fieldSchema.category === 'advanced') && (
              <div className="advanced-options-section">
                <button
                  type="button"
                  className="btn btn-secondary advanced-toggle"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                >
                  {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
                </button>
                
                {showAdvancedOptions && (
                  <div className="advanced-options">
                    {isEmailTool && emailSearchTab === 'criteria' ? (
                      <>
                        {/* Date Filters Group */}
                        <div className="advanced-group">
                          <h4 className="advanced-group-title">Date Filters</h4>
                          <div className="criteria-search-grid">
                            <div className="criteria-field-group">
                              <label className="form-label">Created Date</label>
                              <div className="field-operator-pair">
                                {renderFormField('createdAt', parameterSchema.createdAt)}
                                {renderFormField('createdAtOperator', parameterSchema.createdAtOperator)}
                              </div>
                              <small className="field-description">YYYY-MM-DD format</small>
                            </div>
                            <div className="criteria-field-group">
                              <label className="form-label">Updated Date</label>
                              <div className="field-operator-pair">
                                {renderFormField('updatedAt', parameterSchema.updatedAt)}
                                {renderFormField('updatedAtOperator', parameterSchema.updatedAtOperator)}
                              </div>
                              <small className="field-description">YYYY-MM-DD format</small>
                            </div>
                          </div>
                        </div>

                        {/* User Filters Group */}
                        <div className="advanced-group">
                          <h4 className="advanced-group-title">User Filters</h4>
                          <div className="criteria-search-grid">
                            <div className="criteria-field-group">
                              <label className="form-label">Created By (Username)</label>
                              <div className="field-operator-pair">
                                {renderFormField('createdBy', parameterSchema.createdBy)}
                                {renderFormField('createdByOperator', parameterSchema.createdByOperator)}
                              </div>
                              <small className="field-description">User login name</small>
                            </div>
                            <div className="criteria-field-group">
                              <label className="form-label">Updated By (Username)</label>
                              <div className="field-operator-pair">
                                {renderFormField('updatedBy', parameterSchema.updatedBy)}
                                {renderFormField('updatedByOperator', parameterSchema.updatedByOperator)}
                              </div>
                              <small className="field-description">User login name</small>
                            </div>
                            <div className="criteria-field-group">
                              <label className="form-label">Created By (User ID)</label>
                              <div className="field-operator-pair">
                                {renderFormField('createdByUserId', parameterSchema.createdByUserId)}
                                {renderFormField('createdByUserIdOperator', parameterSchema.createdByUserIdOperator)}
                              </div>
                              <small className="field-description">Numeric user ID</small>
                            </div>
                            <div className="criteria-field-group">
                              <label className="form-label">Updated By (User ID)</label>
                              <div className="field-operator-pair">
                                {renderFormField('updatedByUserId', parameterSchema.updatedByUserId)}
                                {renderFormField('updatedByUserIdOperator', parameterSchema.updatedByUserIdOperator)}
                              </div>
                              <small className="field-description">Numeric user ID</small>
                            </div>
                          </div>
                        </div>

                        {/* Other Filters Group */}
                        <div className="advanced-group">
                          <h4 className="advanced-group-title">Other Filters</h4>
                          <div className="criteria-search-grid">
                            <div className="criteria-field-group">
                              <label className="form-label">Email Group ID</label>
                              <div className="field-operator-pair">
                                {renderFormField('emailGroupId', parameterSchema.emailGroupId)}
                                {renderFormField('emailGroupIdOperator', parameterSchema.emailGroupIdOperator)}
                              </div>
                              <small className="field-description">Numeric email group ID</small>
                            </div>
                            <div className="criteria-field-group">
                              <label className="form-label">Include Archived</label>
                              {renderFormField('includeArchived', parameterSchema.includeArchived)}
                              <small className="field-description">Include archived emails in results</small>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : isFormTool && formSearchTab === 'criteria' ? (
                      <>
                        {/* Date Filters Group */}
                        <div className="advanced-group">
                          <h4 className="advanced-group-title">Date Filters</h4>
                          <div className="criteria-search-grid">
                            <div className="criteria-field-group">
                              <label className="form-label">Created Date</label>
                              <div className="field-operator-pair">
                                {parameterSchema.createdAt && renderFormField('createdAt', parameterSchema.createdAt)}
                                {parameterSchema.createdAtOperator && renderFormField('createdAtOperator', parameterSchema.createdAtOperator)}
                              </div>
                              <small className="field-description">YYYY-MM-DD format</small>
                            </div>
                            <div className="criteria-field-group">
                              <label className="form-label">Updated Date</label>
                              <div className="field-operator-pair">
                                {parameterSchema.updatedAt && renderFormField('updatedAt', parameterSchema.updatedAt)}
                                {parameterSchema.updatedAtOperator && renderFormField('updatedAtOperator', parameterSchema.updatedAtOperator)}
                              </div>
                              <small className="field-description">YYYY-MM-DD format</small>
                            </div>
                          </div>
                        </div>

                        {/* User Filters Group */}
                        <div className="advanced-group">
                          <h4 className="advanced-group-title">User Filters</h4>
                          <div className="criteria-search-grid">
                            <div className="criteria-field-group">
                              <label className="form-label">Created By (Username)</label>
                              <div className="field-operator-pair">
                                {parameterSchema.createdBy && renderFormField('createdBy', parameterSchema.createdBy)}
                                {parameterSchema.createdByOperator && renderFormField('createdByOperator', parameterSchema.createdByOperator)}
                              </div>
                              <small className="field-description">User login name</small>
                            </div>
                            <div className="criteria-field-group">
                              <label className="form-label">Updated By (Username)</label>
                              <div className="field-operator-pair">
                                {parameterSchema.updatedBy && renderFormField('updatedBy', parameterSchema.updatedBy)}
                                {parameterSchema.updatedByOperator && renderFormField('updatedByOperator', parameterSchema.updatedByOperator)}
                              </div>
                              <small className="field-description">User login name</small>
                            </div>
                            <div className="criteria-field-group">
                              <label className="form-label">Created By (User ID)</label>
                              <div className="field-operator-pair">
                                {parameterSchema.createdByUserId && renderFormField('createdByUserId', parameterSchema.createdByUserId)}
                                {parameterSchema.createdByUserIdOperator && renderFormField('createdByUserIdOperator', parameterSchema.createdByUserIdOperator)}
                              </div>
                              <small className="field-description">Numeric user ID</small>
                            </div>
                            <div className="criteria-field-group">
                              <label className="form-label">Updated By (User ID)</label>
                              <div className="field-operator-pair">
                                {parameterSchema.updatedByUserId && renderFormField('updatedByUserId', parameterSchema.updatedByUserId)}
                                {parameterSchema.updatedByUserIdOperator && renderFormField('updatedByUserIdOperator', parameterSchema.updatedByUserIdOperator)}
                              </div>
                              <small className="field-description">Numeric user ID</small>
                            </div>
                          </div>
                        </div>

                        {/* Other Filters Group */}
                        <div className="advanced-group">
                          <h4 className="advanced-group-title">Other Filters</h4>
                          <div className="criteria-search-grid">
                            <div className="criteria-field-group">
                              <label className="form-label">Include Archived</label>
                              {parameterSchema.includeArchived && renderFormField('includeArchived', parameterSchema.includeArchived)}
                              <small className="field-description">Include archived forms in results</small>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      // For ID search or other tools, show standard advanced options
                      Object.entries(parameterSchema)
                        .filter(([fieldName, fieldSchema]: [string, any]) => {
                          // For Email tool ID search, only show includeArchived
                          if (isEmailTool && emailSearchTab === 'id') {
                            return fieldSchema.category === 'advanced' && fieldName === 'includeArchived'
                          }
                          // For Form tool ID search, only show includeArchived
                          if (isFormTool && formSearchTab === 'id') {
                            return fieldSchema.category === 'advanced' && fieldName === 'includeArchived'
                          }
                          // For other tools, show all advanced options
                          return fieldSchema.category === 'advanced'
                        })
                        .map(([fieldName, fieldSchema]: [string, any]) => (
                          <div key={fieldName} className="form-group">
                            <label className="form-label">
                              {fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              {fieldSchema.required && <span className="required">*</span>}
                            </label>
                            {renderFormField(fieldName, fieldSchema)}
                            {fieldSchema.description && (
                              <small className="field-description">{fieldSchema.description}</small>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Dependency Tool Specific Rendering */}
            {isDependencyTool && (
              <>
                {/* Basic Configuration */}
                <div className="form-group">
                  <label className="form-label">
                    Asset Type
                    <span className="required">*</span>
                  </label>
                  <select
                    value={formData.assetType || ''}
                    onChange={(e) => handleInputChange('assetType', e.target.value)}
                    className="form-input"
                    required
                  >
                    <option value="">Please select...</option>
                    <option value="email">Email</option>
                    <option value="form">Form</option>
                    <option value="landingpage">Landing Page</option>
                    <option value="contactfield">Contact Field</option>
                    <option value="segment">Segment</option>
                    <option value="sharedfilter">Shared Filter</option>
                    <option value="sharedlist">Shared List</option>
                  </select>
                  <small className="field-description">Type of assets to analyze (bulk analysis only supported for emails and forms)</small>
                </div>

                <div className="form-group">
                  <label className="form-label">Asset ID</label>
                  {renderFormField('assetId', parameterSchema.assetId)}
                  <small className="field-description">Specific asset ID to analyze (required for landingpage, contactfield, segment, etc.)</small>
                </div>

                <div className="form-group">
                  <label className="form-label">Export Format</label>
                  {renderFormField('exportFormat', parameterSchema.exportFormat)}
                  <small className="field-description">Export format for results</small>
                </div>

                <div className="form-group">
                  <label className="form-label">Include Nested Dependencies</label>
                  {renderFormField('includeNestedDependencies', parameterSchema.includeNestedDependencies)}
                  <small className="field-description">Include dependencies of dependencies (slower but finds nested relationships)</small>
                </div>
              </>
            )}

            {/* Non-asset tools use the original rendering */}
            {!isEmailTool && !isFormTool && !isDependencyTool && Object.entries(parameterSchema).map(([fieldName, fieldSchema]: [string, any]) => (
              <div key={fieldName} className="form-group">
                <label className="form-label">
                  {fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  {fieldSchema.required && <span className="required">*</span>}
                </label>
                {renderFormField(fieldName, fieldSchema)}
                {fieldSchema.description && (
                  <small className="field-description">{fieldSchema.description}</small>
                )}
              </div>
            ))}
            
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isExecuting}
              >
                {isExecuting ? 'Executing...' : 'Execute Tool'}
              </button>
            </div>
          </form>
        </div>

        {(isExecuting || progress) && (
          <div className="tool-progress">
            <LoadingSpinner message={progress || 'Executing tool...'} />
          </div>
        )}

        {error && (
          <div className="tool-error">
            <h3>Error</h3>
            <p>{error}</p>
            <button onClick={clearError} className="btn btn-secondary">
              Clear Error
            </button>
          </div>
        )}

        {result && !isExecuting && (
          <>
            {result.success && isEmailTool && result.data && Array.isArray(result.data) && result.data.length > 0 ? (
              <EmailResultsDisplay
                results={result.data}
                onExport={handleExportResults}
                isExporting={isExporting}
              />
            ) : result.success && isFormTool && result.data && Array.isArray(result.data) && result.data.length > 0 ? (
              <FormResultsDisplay
                results={result.data}
                onExport={handleExportResults}
                isExporting={isExporting}
              />
            ) : result.success && isDependencyTool && result.data && Array.isArray(result.data) && result.data.length > 0 ? (
              <DependencyResultsDisplay
                results={result.data}
                onExport={handleExportResults}
                isExporting={isExporting}
              />
            ) : (
              <div className={`tool-result ${result.success ? 'success' : 'error'}`}>
                <h3>{result.success ? 'Success' : 'Failed'}</h3>
                {result.message && <p>{result.message}</p>}
                {result.exportPath && (
                  <p>
                    <strong>Exported to:</strong> {result.exportPath}
                  </p>
                )}
                {result.data && (
                  <div className="result-summary">
                    <p><strong>Records processed:</strong> {Array.isArray(result.data) ? result.data.length : 'N/A'}</p>
                  </div>
                )}
              </div>
            )}
            <div className="result-actions">
              <button onClick={clearResult} className="btn btn-secondary">
                Clear Results
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default ToolRenderer