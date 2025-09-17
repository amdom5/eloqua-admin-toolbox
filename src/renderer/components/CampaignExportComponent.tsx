import React from 'react'
import GenericExportComponent from './GenericExportComponent'

function CampaignExportComponent() {
  const summaryFields = [
    {
      key: 'totalCampaigns',
      label: 'Total Campaigns Found',
      getValue: (summary: any) => summary.totalCampaigns || 0
    },
    {
      key: 'activeCampaigns',
      label: 'Active Campaigns',
      getValue: (summary: any) => summary.activeCampaigns || 0
    },
    {
      key: 'inactiveCampaigns',
      label: 'Inactive Campaigns',
      getValue: (summary: any) => summary.inactiveCampaigns || 0
    },
    {
      key: 'exportedCampaigns',
      label: 'Campaigns Exported',
      getValue: (summary: any) => summary.exportedCampaigns || 0
    }
  ]

  const previewFields = [
    {
      key: 'id',
      label: 'ID',
      getValue: (campaign: any) => campaign.id || ''
    },
    {
      key: 'name',
      label: 'Name',
      getValue: (campaign: any) => campaign.name || ''
    },
    {
      key: 'folderName',
      label: 'Folder',
      getValue: (campaign: any) => campaign.folderName || ''
    },
    {
      key: 'campaignType',
      label: 'Type',
      getValue: (campaign: any) => campaign.campaignType || ''
    },
    {
      key: 'isActive',
      label: 'Active',
      getValue: (campaign: any) => campaign.isActive ? 'Yes' : 'No'
    },
    {
      key: 'memberCount',
      label: 'Members',
      getValue: (campaign: any) => campaign.memberCount || '0'
    }
  ]

  const exportInfo = {
    title: 'Campaign Information',
    items: [
      'Campaign ID and names',
      'Campaign type and category classification',
      'Folder organization and hierarchy',
      'Campaign status (active/inactive) and permissions',
      'Creation and modification timestamps',
      'Creator and modifier information',
      'Member count and audience data',
      'Campaign scheduling (start/end dates)',
      'Campaign elements and structure',
      'Run-as user configuration'
    ]
  }

  return (
    <GenericExportComponent
      toolId="campaign-export-tool"
      toolName="Campaign Export"
      entityName="campaigns"
      entityNameSingular="campaign"
      defaultFilename="campaigns-export"
      summaryFields={summaryFields}
      previewFields={previewFields}
      description="Export all Eloqua campaigns to CSV or JSON format"
      exportInfo={exportInfo}
    />
  )
}

export default CampaignExportComponent