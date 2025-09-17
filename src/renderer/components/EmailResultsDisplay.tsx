import React, { useState, useMemo, memo, useCallback } from 'react'
import '../styles/EmailResultsDisplay.css'
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Download, 
  Filter, 
  FileText,
  FileSpreadsheet,
  Code,
  ExternalLink
} from './icons'
import Icon from '../../components/ui/Icon'
// ExcelJS will be dynamically imported when needed

interface EmailResult {
  // Core identification
  type: string
  id: string
  currentStatus: string
  name: string
  description: string
  permissions: string
  folderId: string
  sourceTemplateId: string
  
  // User and timestamp info
  createdBy: string
  createdByName: string
  createdAt: string
  updatedBy: string
  updatedByName: string
  updatedAt: string
  scheduledFor: string
  depth: string
  
  // Email content
  subject: string
  previewText: string
  senderName: string
  senderEmail: string
  replyToName: string
  replyToEmail: string
  bounceBackEmail: string
  
  // Configuration
  virtualMTAId: string
  brandId: string
  htmlContent: string
  plainText: string
  isPlainTextEditable: string
  sendPlainTextOnly: string
  isTracked: string
  isPrivate: string
  layout: string
  style: string
  
  // Asset references
  emailHeaderId: string
  emailFooterId: string
  emailGroupId: string
  emailGroupName: string
  encodingId: string
  
  // Additional properties
  isContentProtected: string
  renderMode: string
  archived: string
  isArchived: boolean
  
  // Complex objects (serialized as strings for export)
  forms: string
  images: string
  hyperlinks: string
  contentSections: string
  dynamicContents: string
  files: string
  contentServiceInstances: string
  fieldMerges: string
  attachments: string
  
  // Processed content (from tool processing)
  bodyText: string
  plainTextContent: string
}

interface EmailResultsDisplayProps {
  results: EmailResult[]
  onExport: () => void
  isExporting: boolean
}

type SortField = keyof EmailResult
type SortDirection = 'asc' | 'desc'

interface Column {
  key: SortField
  label: string
  sortable: boolean
  exportable: boolean
  width?: string
}

const EmailResultsDisplay = memo(function EmailResultsDisplay({ results, isExporting }: EmailResultsDisplayProps) {
  // State for sorting
  const [sortField, setSortField] = useState<SortField>('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  
  // State for filtering
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all')
  const [showFilters, setShowFilters] = useState(false)
  
  // State for selection
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  
  // State for export
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'json'>('csv')
  const [selectedColumns, setSelectedColumns] = useState<Set<SortField>>(() => {
    // Initialize with default columns immediately
    const defaultColumns: SortField[] = ['id', 'name', 'subject', 'previewText', 'updatedAt', 'updatedByName', 'emailGroupName', 'isArchived']
    return new Set(defaultColumns)
  })
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  
  if (!results || results.length === 0) {
    return null
  }
  
  // Define available columns
  const columnsConfig: Column[] = [
    { key: 'id', label: 'ID', sortable: true, exportable: true, width: '80px' },
    { key: 'name', label: 'Name', sortable: true, exportable: true },
    { key: 'subject', label: 'Subject', sortable: true, exportable: true },
    { key: 'previewText', label: 'Preview Text', sortable: true, exportable: true },
    { key: 'updatedAt', label: 'Updated Date', sortable: true, exportable: true, width: '120px' },
    { key: 'updatedByName', label: 'Updated By', sortable: true, exportable: true, width: '120px' },
    { key: 'createdAt', label: 'Created Date', sortable: true, exportable: true, width: '120px' },
    { key: 'createdByName', label: 'Created By', sortable: true, exportable: true, width: '120px' },
    { key: 'emailGroupName', label: 'Email Group', sortable: true, exportable: true, width: '120px' },
    { key: 'isArchived', label: 'Status', sortable: true, exportable: true, width: '100px' },
  ]
  
  // Use columnsConfig for rendering
  const columns: Column[] = columnsConfig

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      // Check if it's a Unix timestamp (all digits)
      if (/^\d+$/.test(dateString)) {
        // Convert Unix timestamp to milliseconds
        const timestamp = parseInt(dateString) * 1000
        return new Date(timestamp).toLocaleDateString()
      }
      // Otherwise treat as regular date string
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
  }
  
  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      // Check if it's a Unix timestamp (all digits)
      if (/^\d+$/.test(dateString)) {
        // Convert Unix timestamp to milliseconds
        const timestamp = parseInt(dateString) * 1000
        return new Date(timestamp).toLocaleString()
      }
      // Otherwise treat as regular date string
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return 'N/A'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }
  
  // Sorting logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }
  
  // Filtered and sorted results
  const filteredAndSortedResults = useMemo(() => {
    let filtered = results
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(email => 
        email.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.previewText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.emailGroupName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.id.includes(searchTerm)
      )
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(email => 
        statusFilter === 'active' ? !email.isArchived : email.isArchived
      )
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (aValue === bValue) return 0
      
      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        comparison = aValue === bValue ? 0 : aValue ? 1 : -1
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    return filtered
  }, [results, searchTerm, statusFilter, sortField, sortDirection])

  // Selection logic
  const handleRowSelect = useCallback((id: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
    setSelectAll(newSelected.size === filteredAndSortedResults.length)
  }, [selectedRows, filteredAndSortedResults.length])
  
  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedRows(new Set())
      setSelectAll(false)
    } else {
      setSelectedRows(new Set(filteredAndSortedResults.map(r => r.id)))
      setSelectAll(true)
    }
  }, [selectAll, filteredAndSortedResults])
  
  // Export logic
  const handleExport = useCallback(async (format: 'csv' | 'xlsx' | 'json', customColumns?: SortField[]) => {
    // For export, include ALL fields, not just selected display columns
    const allFields = Object.keys(results[0] || {}) as SortField[]
    const columnsToExport = customColumns || allFields
    const dataToExport = selectedRows.size > 0 
      ? filteredAndSortedResults.filter(r => selectedRows.has(r.id))
      : filteredAndSortedResults
    
    const fileName = `eloqua-emails-${new Date().toISOString().split('T')[0]}`
    
    switch (format) {
      case 'csv':
        exportToCSV(dataToExport, columnsToExport, fileName)
        break
      case 'xlsx':
        await exportToExcel(dataToExport, columnsToExport, fileName)
        break
      case 'json':
        exportToJSON(dataToExport, columnsToExport, fileName)
        break
    }
    
    setShowExportOptions(false)
  }, [selectedColumns, selectedRows, filteredAndSortedResults, results])
  
  const exportToCSV = (data: EmailResult[], columns: SortField[], fileName: string) => {
    // Create headers with human-readable names
    const headers = columns.map(col => {
      return col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    })
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        columns.map(col => {
          const value = row[col]
          if (typeof value === 'boolean') return value ? 'Yes' : 'No'
          if (col.includes('At') || col.includes('scheduledFor')) return formatDateTime(value as string)
          // Escape quotes and wrap in quotes to handle commas, newlines, etc.
          const stringValue = (value || '').toString().replace(/"/g, '""')
          return `"${stringValue}"`
        }).join(',')
      )
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${fileName}.csv`
    link.click()
  }
  
  const exportToExcel = async (data: EmailResult[], columns: SortField[], fileName: string) => {
    // Dynamically import ExcelJS to reduce initial bundle size
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Emails')
    
    // Add headers with human-readable names
    const headers = columns.map(col => {
      return col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    })
    worksheet.addRow(headers)
    
    // Style headers
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
    
    // Add data rows
    data.forEach(row => {
      const rowData = columns.map(col => {
        let value = row[col]
        
        if (typeof value === 'boolean') {
          return value ? 'Yes' : 'No'
        } else if (col.includes('At') || col.includes('scheduledFor')) {
          return formatDateTime(value as string)
        }
        
        return value || ''
      })
      worksheet.addRow(rowData)
    })
    
    // Auto-fit columns with wider default for content fields
    worksheet.columns.forEach((column, index) => {
      const colName = columns[index]
      if (colName === 'htmlContent' || colName === 'plainTextContent' || colName === 'bodyText') {
        column.width = 50
      } else if (colName.includes('forms') || colName.includes('images') || colName.includes('hyperlinks') || 
                 colName.includes('contentSections') || colName.includes('dynamicContents') || 
                 colName.includes('files') || colName.includes('attachments') || colName.includes('fieldMerges')) {
        column.width = 40
      } else {
        column.width = 20
      }
    })
    
    // Write file
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${fileName}.xlsx`
    link.click()
  }
  
  const exportToJSON = (data: EmailResult[], columns: SortField[], fileName: string) => {
    const exportData = data.map(row => {
      const exportRow: any = {}
      columns.forEach(col => {
        let value = row[col]
        // For JSON export, try to parse JSON strings back to objects for complex fields
        if (typeof value === 'string' && (
          col.includes('forms') || col.includes('images') || col.includes('hyperlinks') || 
          col.includes('contentSections') || col.includes('dynamicContents') || 
          col.includes('files') || col.includes('attachments') || col.includes('fieldMerges')
        )) {
          try {
            exportRow[col] = value ? JSON.parse(value) : null
          } catch {
            exportRow[col] = value
          }
        } else {
          exportRow[col] = value
        }
      })
      return exportRow
    })
    
    const jsonContent = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${fileName}.json`
    link.click()
  }
  
  // Paginated results
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedResults.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedResults, currentPage, itemsPerPage])
  
  const totalPages = Math.ceil(filteredAndSortedResults.length / itemsPerPage)
  
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <Icon icon={ChevronUp} size={16} /> : <Icon icon={ChevronDown} size={16} />
  }
  
  const renderColumnHeader = (column: Column) => (
    <th 
      key={column.key}
      className={`sortable-header ${sortField === column.key ? 'active' : ''}`}
      onClick={() => column.sortable && handleSort(column.key)}
      style={{ width: column.width }}
    >
      <div className="header-content">
        <span>{column.label}</span>
        {column.sortable && getSortIcon(column.key)}
      </div>
    </th>
  )
  
  const renderCellContent = (email: EmailResult, column: Column) => {
    const value = email[column.key]
    
    switch (column.key) {
      case 'id':
        return <span className="email-id">{value}</span>
      case 'name':
        return (
          <div className="name-cell">
            <span className="name">{value as string}</span>
          </div>
        )
      case 'subject':
        return <span title={value as string}>{truncateText(value as string, 40)}</span>
      case 'previewText':
        return (
          <div className="preview-content" title={value as string}>
            {truncateText(value as string, 60)}
          </div>
        )
      case 'updatedAt':
      case 'createdAt':
        return formatDate(value as string)
      case 'updatedByName':
      case 'createdByName':
        return (value as string) || 'N/A'
      case 'emailGroupName':
        return (value as string) || 'N/A'
      case 'isArchived':
        return (
          <span className={`status-badge ${value ? 'archived' : 'active'}`}>
            {value ? 'Archived' : 'Active'}
          </span>
        )
      default:
        return value?.toString() || 'N/A'
    }
  }

  return (
    <div className="email-results-display">
      <div className="results-header">
        <div className="header-left">
          <h3>Email Search Results ({filteredAndSortedResults.length} of {results.length} found)</h3>
          {selectedRows.size > 0 && (
            <span className="selection-info">
              {selectedRows.size} selected
            </span>
          )}
        </div>
        <div className="header-actions">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
          >
            <Icon icon={Filter} size={16} />
            Filters
          </button>
          <button 
            onClick={() => setShowExportOptions(!showExportOptions)}
            className="btn btn-primary"
            disabled={isExporting}
          >
            <Icon icon={Download} size={16} />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
      
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <div className="search-filter">
              <label>Search:</label>
              <div className="search-input">
                <Icon icon={Search} size={16} />
                <input
                  type="text"
                  placeholder="Search emails by name, subject, preview text, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="status-filter">
              <label>Status:</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="items-per-page">
              <label>Items per page:</label>
              <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {showExportOptions && (
        <div className="export-panel">
          <div className="export-options">
            <h4>Export Options</h4>
            <div className="export-format">
              <label>Format:</label>
              <div className="format-buttons">
                <button 
                  className={`format-btn ${exportFormat === 'csv' ? 'active' : ''}`}
                  onClick={() => setExportFormat('csv')}
                >
                  <Icon icon={FileText} size={16} />
                  CSV
                </button>
                <button 
                  className={`format-btn ${exportFormat === 'xlsx' ? 'active' : ''}`}
                  onClick={() => setExportFormat('xlsx')}
                >
                  <Icon icon={FileSpreadsheet} size={16} />
                  Excel
                </button>
                <button 
                  className={`format-btn ${exportFormat === 'json' ? 'active' : ''}`}
                  onClick={() => setExportFormat('json')}
                >
                  <Icon icon={Code} size={16} />
                  JSON
                </button>
              </div>
            </div>
            <div className="export-actions">
              <button 
                onClick={() => handleExport(exportFormat)}
                className="btn btn-primary"
              >
                Export {selectedRows.size > 0 ? `${selectedRows.size} Selected` : 'All'}
              </button>
              <button 
                onClick={() => setShowExportOptions(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="results-table-container">
        <table className="results-table">
          <thead>
            <tr>
              <th className="select-column">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  title="Select all"
                />
              </th>
              {columns.map(column => renderColumnHeader(column))}
              <th className="actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedResults.map((email) => (
              <tr 
                key={email.id} 
                className={`
                  ${email.isArchived ? 'archived' : ''} 
                  ${selectedRows.has(email.id) ? 'selected' : ''}
                `}
              >
                <td className="select-cell">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(email.id)}
                    onChange={() => handleRowSelect(email.id)}
                  />
                </td>
                {columns.map(column => (
                  <td key={column.key} className={`${column.key}-cell`}>
                    {renderCellContent(email, column)}
                  </td>
                ))}
                <td className="actions-cell">
                  <div className="action-buttons">
                    <button 
                      className="btn-small btn-secondary"
                      onClick={() => window.open(`https://secure.eloqua.com/Main.aspx#email&id=${email.id}`, '_blank')}
                      title="Open in Eloqua"
                    >
                      <Icon icon={ExternalLink} size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedResults.length)} of {filteredAndSortedResults.length} entries
          </div>
          <div className="pagination-controls">
            <button 
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="btn btn-small"
            >
              First
            </button>
            <button 
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="btn btn-small"
            >
              Previous
            </button>
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="btn btn-small"
            >
              Next
            </button>
            <button 
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="btn btn-small"
            >
              Last
            </button>
          </div>
        </div>
      )}

      <div className="results-summary">
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-label">Total Emails:</span>
            <span className="stat-value">{results.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Filtered:</span>
            <span className="stat-value">{filteredAndSortedResults.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Active:</span>
            <span className="stat-value">{filteredAndSortedResults.filter(e => !e.isArchived).length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Archived:</span>
            <span className="stat-value">{filteredAndSortedResults.filter(e => e.isArchived).length}</span>
          </div>
          {selectedRows.size > 0 && (
            <div className="stat highlight">
              <span className="stat-label">Selected:</span>
              <span className="stat-value">{selectedRows.size}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for performance optimization
  return prevProps.results === nextProps.results && 
         prevProps.isExporting === nextProps.isExporting
})

export default EmailResultsDisplay