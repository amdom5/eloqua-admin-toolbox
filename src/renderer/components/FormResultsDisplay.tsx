import React, { useState, useMemo, memo, useCallback } from 'react'
import '../styles/FormResultsDisplay.css'
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

interface FormResult {
  id: string
  name: string
  htmlName: string
  description: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
  createdByName: string
  updatedByName: string
  folderId?: string
  folderName?: string
  isArchived: boolean
  permissions?: string
  currentStatus?: string
  depth?: string
  submitMessage?: string
  isResponsive: boolean
  processingType?: string
  style?: string
  customCSS?: string
  isHidden: boolean
  isFormSpamProtectionEnabled: boolean
  externalIntegrationUrl?: string
  fieldCount: number
  requiredFieldCount: number
  fieldTypes: string
  elements: string
  processingStepsCount: number
  processingStepTypes: string
}

interface FormResultsDisplayProps {
  results: FormResult[]
  onExport: () => void
  isExporting: boolean
}

type SortField = keyof FormResult
type SortDirection = 'asc' | 'desc'

interface Column {
  key: SortField
  label: string
  sortable: boolean
  exportable: boolean
  width?: string
}


const FormResultsDisplay = memo(function FormResultsDisplay({ results, isExporting }: FormResultsDisplayProps) {
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
    const defaultColumns: SortField[] = ['id', 'name', 'htmlName', 'description', 'updatedAt', 'updatedByName', 'fieldCount', 'requiredFieldCount', 'isArchived', 'isResponsive', 'processingStepsCount']
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
    { key: 'htmlName', label: 'HTML Name', sortable: true, exportable: true },
    { key: 'description', label: 'Description', sortable: true, exportable: true },
    { key: 'updatedAt', label: 'Updated Date', sortable: true, exportable: true, width: '120px' },
    { key: 'updatedByName', label: 'Updated By', sortable: true, exportable: true, width: '120px' },
    { key: 'createdAt', label: 'Created Date', sortable: true, exportable: true, width: '120px' },
    { key: 'createdByName', label: 'Created By', sortable: true, exportable: true, width: '120px' },
    { key: 'fieldCount', label: 'Fields', sortable: true, exportable: true, width: '80px' },
    { key: 'requiredFieldCount', label: 'Required', sortable: true, exportable: true, width: '80px' },
    { key: 'isArchived', label: 'Status', sortable: true, exportable: true, width: '100px' },
    { key: 'isResponsive', label: 'Responsive', sortable: true, exportable: true, width: '100px' },
    { key: 'processingStepsCount', label: 'Steps', sortable: true, exportable: true, width: '80px' },
    { key: 'folderName', label: 'Folder', sortable: true, exportable: true },
    { key: 'currentStatus', label: 'Form Status', sortable: true, exportable: true, width: '100px' },
    { key: 'isFormSpamProtectionEnabled', label: 'Spam Protection', sortable: true, exportable: true, width: '120px' },
  ]
  
  // Use columnsConfig for rendering
  const columns: Column[] = columnsConfig

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
  }
  
  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
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
    const columnsToExport = customColumns || Array.from(selectedColumns)
    const dataToExport = selectedRows.size > 0 
      ? filteredAndSortedResults.filter(r => selectedRows.has(r.id))
      : filteredAndSortedResults
    
    const fileName = `eloqua-forms-${new Date().toISOString().split('T')[0]}`
    
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
  }, [selectedColumns, selectedRows, filteredAndSortedResults])
  
  const exportToCSV = (data: FormResult[], columns: SortField[], fileName: string) => {
    const csvContent = [
      columns.join(','),
      ...data.map(row => 
        columns.map(col => {
          const value = row[col]
          if (typeof value === 'boolean') return value ? 'Yes' : 'No'
          if (col.includes('At')) return formatDateTime(value as string)
          return `"${(value || '').toString().replace(/"/g, '""')}"`
        }).join(',')
      )
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${fileName}.csv`
    link.click()
  }
  
  const exportToExcel = async (data: FormResult[], columns: SortField[], fileName: string) => {
    // Dynamically import ExcelJS to reduce initial bundle size
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Forms')
    
    // Add headers
    const headers = columns.map(col => {
      const column = columnsConfig.find(c => c.key === col)
      return column ? column.label : col
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
        } else if (col.includes('At')) {
          return formatDateTime(value as string)
        }
        
        return value || ''
      })
      worksheet.addRow(rowData)
    })
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20
    })
    
    // Write file
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${fileName}.xlsx`
    link.click()
  }
  
  const exportToJSON = (data: FormResult[], columns: SortField[], fileName: string) => {
    const exportData = data.map(row => {
      const exportRow: any = {}
      columns.forEach(col => {
        exportRow[col] = row[col]
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
  
  // Filtered and sorted results
  const filteredAndSortedResults = useMemo(() => {
    let filtered = results
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(form => 
        form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.htmlName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.id.includes(searchTerm)
      )
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(form => 
        statusFilter === 'active' ? !form.isArchived : form.isArchived
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
  
  const renderCellContent = (form: FormResult, column: Column) => {
    const value = form[column.key]
    
    switch (column.key) {
      case 'id':
        return <span className="form-id">{value}</span>
      case 'name':
        return (
          <div className="name-cell">
            <span className="name">{value as string}</span>
          </div>
        )
      case 'description':
        return <span title={value as string}>{truncateText(value as string, 60)}</span>
      case 'updatedAt':
      case 'createdAt':
        return formatDate(value as string)
      case 'updatedByName':
      case 'createdByName':
        return (value as string) || 'N/A'
      case 'fieldCount':
        return (
          <div className="field-count">
            <span className="count">{value}</span>
            <span className="field-types" title={form.fieldTypes}>
              {truncateText(form.fieldTypes, 20)}
            </span>
          </div>
        )
      case 'requiredFieldCount':
        return <span className="required-count">{value}</span>
      case 'isArchived':
        return (
          <span className={`status-badge ${value ? 'archived' : 'active'}`}>
            {value ? 'Archived' : 'Active'}
          </span>
        )
      case 'isResponsive':
        return (
          <span className={`status-badge ${value ? 'responsive' : 'legacy'}`}>
            {value ? 'Responsive' : 'Legacy'}
          </span>
        )
      case 'processingStepsCount':
        return (
          <div className="processing-steps">
            <span className="count">{value || 0}</span>
            <span className="step-types" title={form.processingStepTypes}>
              {truncateText(form.processingStepTypes || '', 20)}
            </span>
          </div>
        )
      case 'folderName':
        return (value as string) || 'Root'
      case 'currentStatus':
        return (
          <span className={`status-badge ${value === 'active' ? 'active' : 'draft'}`}>
            {(value as string) || 'Unknown'}
          </span>
        )
      case 'isFormSpamProtectionEnabled':
        return (
          <span className={`status-badge ${value ? 'enabled' : 'disabled'}`}>
            {value ? 'Enabled' : 'Disabled'}
          </span>
        )
      default:
        return value?.toString() || 'N/A'
    }
  }

  return (
    <div className="form-results-display">
      <div className="results-header">
        <div className="header-left">
          <h3>Form Search Results ({filteredAndSortedResults.length} of {results.length} found)</h3>
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
                  placeholder="Search forms by name, ID, or description..."
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
            {paginatedResults.map((form) => (
              <tr 
                key={form.id} 
                className={`
                  ${form.isArchived ? 'archived' : ''} 
                  ${selectedRows.has(form.id) ? 'selected' : ''}
                `}
              >
                <td className="select-cell">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(form.id)}
                    onChange={() => handleRowSelect(form.id)}
                  />
                </td>
                {columns.map(column => (
                  <td key={column.key} className={`${column.key}-cell`}>
                    {renderCellContent(form, column)}
                  </td>
                ))}
                <td className="actions-cell">
                  <div className="action-buttons">
                    <button 
                      className="btn-small btn-secondary"
                      onClick={() => window.open(`https://secure.eloqua.com/Main.aspx#form&id=${form.id}`, '_blank')}
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
            <span className="stat-label">Total Forms:</span>
            <span className="stat-value">{results.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Filtered:</span>
            <span className="stat-value">{filteredAndSortedResults.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Active:</span>
            <span className="stat-value">{filteredAndSortedResults.filter(f => !f.isArchived).length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Archived:</span>
            <span className="stat-value">{filteredAndSortedResults.filter(f => f.isArchived).length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Responsive:</span>
            <span className="stat-value">{filteredAndSortedResults.filter(f => f.isResponsive).length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Fields:</span>
            <span className="stat-value">{filteredAndSortedResults.reduce((sum, f) => sum + f.fieldCount, 0)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Required Fields:</span>
            <span className="stat-value">{filteredAndSortedResults.reduce((sum, f) => sum + f.requiredFieldCount, 0)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Steps:</span>
            <span className="stat-value">{filteredAndSortedResults.reduce((sum, f) => sum + (f.processingStepsCount || 0), 0)}</span>
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

export default FormResultsDisplay