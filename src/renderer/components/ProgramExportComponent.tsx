import React from 'react'
import GenericExportComponent from './GenericExportComponent'

function ProgramExportComponent() {
  const summaryFields = [
    {
      key: 'totalPrograms',
      label: 'Total Programs Found',
      getValue: (summary: any) => summary.totalPrograms || 0
    },
    {
      key: 'activePrograms',
      label: 'Active Programs',
      getValue: (summary: any) => summary.activePrograms || 0
    },
    {
      key: 'inactivePrograms',
      label: 'Inactive Programs',
      getValue: (summary: any) => summary.inactivePrograms || 0
    },
    {
      key: 'exportedPrograms',
      label: 'Programs Exported',
      getValue: (summary: any) => summary.exportedPrograms || 0
    }
  ]

  const previewFields = [
    {
      key: 'id',
      label: 'ID',
      getValue: (program: any) => program.id || ''
    },
    {
      key: 'name',
      label: 'Name',
      getValue: (program: any) => program.name || ''
    },
    {
      key: 'folderName',
      label: 'Folder',
      getValue: (program: any) => program.folderName || ''
    },
    {
      key: 'isActive',
      label: 'Active',
      getValue: (program: any) => program.isActive ? 'Yes' : 'No'
    },
    {
      key: 'memberCount',
      label: 'Members',
      getValue: (program: any) => program.memberCount || '0'
    },
    {
      key: 'elementCount',
      label: 'Elements',
      getValue: (program: any) => program.elements ? program.elements.length.toString() : '0'
    }
  ]

  const exportInfo = {
    title: 'Program Information',
    items: [
      'Program ID and names',
      'Folder organization and hierarchy',
      'Program status (active/inactive) and permissions',
      'Creation and modification timestamps',
      'Creator and modifier information',
      'Member count and membership policies',
      'Program elements and structure',
      'Run-as user configuration'
    ]
  }

  return (
    <GenericExportComponent
      toolId="program-export-tool"
      toolName="Program Export"
      entityName="programs"
      entityNameSingular="program"
      defaultFilename="programs-export"
      summaryFields={summaryFields}
      previewFields={previewFields}
      description="Export all Eloqua programs to CSV or JSON format"
      exportInfo={exportInfo}
    />
  )
}

export default ProgramExportComponent