import React, { useState, memo, useCallback } from 'react'
import '../styles/DependencyResultsDisplay.css'
import { 
  Mail, 
  FileText, 
  Target, 
  Settings, 
  Image, 
  Paperclip, 
  File 
} from 'lucide-react'
import Icon from '../../components/ui/Icon'

interface DependencyResult {
  id: string
  name: string
  type: string
  dependencyCount: number
  usageCount: number
  dependsOn: Array<{
    id: string
    name: string
    type: string
  }>
  usedBy: Array<{
    id: string
    name: string
    type: string
  }>
  dependsOnSummary: string
  usedBySummary: string
  hasDependencies: boolean
  isUsed: boolean
  riskLevel: string
  error?: string
}

interface DependencyResultsDisplayProps {
  results: DependencyResult[]
  onExport: () => void
  isExporting: boolean
}

const DependencyResultsDisplay = memo(function DependencyResultsDisplay({ results, onExport, isExporting }: DependencyResultsDisplayProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<string>('all')
  const [filterRisk, setFilterRisk] = useState<string>('all')

  if (!results || results.length === 0) {
    return null
  }


  const toggleExpanded = useCallback((assetId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(assetId)) {
      newExpanded.delete(assetId)
    } else {
      newExpanded.add(assetId)
    }
    setExpandedRows(newExpanded)
  }, [expandedRows])

  const truncateText = (text: string, maxLength: number = 50) => {
    if (!text) return 'None'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const getRiskLevelClass = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'high': return 'risk-high'
      case 'medium': return 'risk-medium'
      case 'low': return 'risk-low'
      case 'isolated': return 'risk-isolated'
      default: return 'risk-unknown'
    }
  }

  const getAssetTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'email': return Mail
      case 'form': return FileText
      case 'campaign': return Target
      case 'campaign-component': return Settings
      case 'image': return Image
      case 'asset': return Paperclip
      default: return File
    }
  }

  // Filter results with safety checks
  const filteredResults = results.filter(result => {
    if (!result || typeof result !== 'object') return false
    if (filterType !== 'all' && result.type !== filterType) return false
    if (filterRisk !== 'all' && result.riskLevel && result.riskLevel.toLowerCase() !== filterRisk) return false
    return true
  })

  // Calculate statistics with safe data handling
  const stats = {
    total: filteredResults.length,
    withDependencies: filteredResults.filter(r => r && r.hasDependencies).length,
    unused: filteredResults.filter(r => r && !r.isUsed && !r.hasDependencies).length,
    highRisk: filteredResults.filter(r => r && r.riskLevel === 'High').length,
    totalDependencies: filteredResults.reduce((sum, r) => sum + (r && typeof r.dependencyCount === 'number' ? r.dependencyCount : 0), 0),
    totalUsages: filteredResults.reduce((sum, r) => sum + (r && typeof r.usageCount === 'number' ? r.usageCount : 0), 0)
  }

  return (
    <div className="dependency-results-display">
      <div className="results-header">
        <h3>Dependency Analysis Results ({filteredResults.length} assets)</h3>
        <button 
          onClick={onExport} 
          className="btn btn-primary export-btn"
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </button>
      </div>

      {/* Filters */}
      <div className="results-filters">
        <div className="filter-group">
          <label>Asset Type:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="email">Emails</option>
            <option value="form">Forms</option>
            <option value="campaign">Campaigns</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Risk Level:</label>
          <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}>
            <option value="all">All Risks</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
            <option value="isolated">Isolated</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="results-stats">
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Total Assets</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">With Dependencies</span>
            <span className="stat-value">{stats.withDependencies}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Unused Assets</span>
            <span className="stat-value">{stats.unused}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">High Risk</span>
            <span className="stat-value">{stats.highRisk}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Dependencies</span>
            <span className="stat-value">{stats.totalDependencies}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Usages</span>
            <span className="stat-value">{stats.totalUsages}</span>
          </div>
        </div>
      </div>

      <div className="results-table-container">
        <table className="results-table">
          <thead>
            <tr>
              <th></th>
              <th>Asset</th>
              <th>Type</th>
              <th>Dependencies</th>
              <th>Used By</th>
              <th>Risk Level</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((result) => (
              <React.Fragment key={result.id}>
                <tr className={`dependency-row ${result.error ? 'error-row' : ''}`}>
                  <td className="expand-cell">
                    <button 
                      className="expand-btn"
                      onClick={() => toggleExpanded(result.id)}
                      disabled={(result.dependencyCount || 0) === 0 && (result.usageCount || 0) === 0}
                    >
                      {expandedRows.has(result.id) ? '▼' : '▶'}
                    </button>
                  </td>
                  <td className="asset-cell">
                    <div className="asset-info">
                      <span className="asset-icon">
                        <Icon icon={getAssetTypeIcon(result.type || 'unknown')} size={16} />
                      </span>
                      <div className="asset-details">
                        <span className="asset-name">{result.name || 'Unknown Asset'}</span>
                        <span className="asset-id">ID: {result.id || 'N/A'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="type-cell">
                    <span className={`type-badge type-${result.type || 'unknown'}`}>
                      {result.type || 'unknown'}
                    </span>
                  </td>
                  <td className="dependency-count-cell">
                    <div className="count-info">
                      <span className="count">{result.dependencyCount || 0}</span>
                      {(result.dependencyCount || 0) > 0 && result.dependsOnSummary && (
                        <span className="summary" title={result.dependsOnSummary}>
                          {truncateText(result.dependsOnSummary, 30)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="usage-count-cell">
                    <div className="count-info">
                      <span className="count">{result.usageCount || 0}</span>
                      {(result.usageCount || 0) > 0 && result.usedBySummary && (
                        <span className="summary" title={result.usedBySummary}>
                          {truncateText(result.usedBySummary, 30)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="risk-cell">
                    <span className={`risk-badge ${getRiskLevelClass(result.riskLevel || 'unknown')}`}>
                      {result.riskLevel || 'Unknown'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="btn-small btn-secondary"
                      onClick={() => {
                        let baseUrl = 'https://secure.eloqua.com/Main.aspx#'
                        switch (result.type) {
                          case 'email':
                            baseUrl += 'email&id='
                            break
                          case 'form':
                            baseUrl += 'form&id='
                            break
                          case 'campaign':
                            baseUrl += 'campaign&id='
                            break
                          default:
                            baseUrl += 'email&id=' // fallback
                        }
                        window.open(baseUrl + result.id, '_blank')
                      }}
                      title="Open in Eloqua"
                    >
                      View
                    </button>
                  </td>
                </tr>
                
                {/* Expanded details row */}
                {expandedRows.has(result.id) && ((result.dependencyCount || 0) > 0 || (result.usageCount || 0) > 0) && (
                  <tr className="expanded-row">
                    <td colSpan={7}>
                      <div className="expanded-content">
                        {(() => {
                          try {
                            return (
                              <>
                                {(result.dependencyCount || 0) > 0 && result.dependsOn && Array.isArray(result.dependsOn) && (
                                  <div className="dependency-section">
                                    <h4>Dependencies ({result.dependencyCount})</h4>
                                    <div className="dependency-table-container">
                                      <table className="dependency-table">
                                        <thead>
                                          <tr>
                                            <th>Type</th>
                                            <th>ID</th>
                                            <th>Asset Name</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {result.dependsOn.map((dep, index) => {
                                            if (!dep || typeof dep !== 'object') return null
                                            return (
                                              <tr key={`dep-${dep.id || index}`}>
                                                <td>{dep.type || 'unknown'}</td>
                                                <td>{dep.id || 'N/A'}</td>
                                                <td>{dep.name || 'Unknown'}</td>
                                              </tr>
                                            )
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                                
                                {(result.usageCount || 0) > 0 && result.usedBy && Array.isArray(result.usedBy) && (
                                  <div className="usage-section">
                                    <h4>Used By ({result.usageCount})</h4>
                                    <div className="usage-table-container">
                                      <table className="usage-table">
                                        <thead>
                                          <tr>
                                            <th>Type</th>
                                            <th>ID</th>
                                            <th>Asset Name</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {result.usedBy.map((usage, index) => {
                                            if (!usage || typeof usage !== 'object') return null
                                            return (
                                              <tr key={`usage-${usage.id || index}`}>
                                                <td>{usage.type || 'unknown'}</td>
                                                <td>{usage.id || 'N/A'}</td>
                                                <td>{usage.name || 'Unknown'}</td>
                                              </tr>
                                            )
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                                
                                {result.error && (
                                  <div className="error-section">
                                    <h4>Analysis Error</h4>
                                    <p className="error-message">{result.error}</p>
                                  </div>
                                )}
                              </>
                            )
                          } catch (error) {
                            console.error('Error rendering expanded content:', error, result)
                            return (
                              <div className="error-section">
                                <h4>Rendering Error</h4>
                                <p className="error-message">Failed to display dependency details: {error instanceof Error ? error.message : 'Unknown error'}</p>
                              </div>
                            )
                          }
                        })()}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for performance optimization
  return prevProps.results === nextProps.results && 
         prevProps.isExporting === nextProps.isExporting
})

export default DependencyResultsDisplay