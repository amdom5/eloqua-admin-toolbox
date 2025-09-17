// API-specific type definitions to reduce usage of 'any'

export interface EloquaApiResponse<T = unknown> {
  elements?: T[]
  page?: number
  pageSize?: number
  total?: number
  totalResults?: number
}

export interface EloquaAsset {
  id: string
  name: string
  description?: string
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  type?: string
  currentStatus?: string
  folderId?: string
  permissions?: string[]
}

export interface EloquaEmail extends EloquaAsset {
  emailGroupId?: string
  subject?: string
  senderName?: string
  senderEmail?: string
  replyToName?: string
  replyToEmail?: string
  htmlContent?: {
    type: string
    contentSource?: string
  }
  plainTextContent?: string
  isTracked?: boolean
}

export interface EloquaForm extends EloquaAsset {
  html?: string
  htmlName?: string
  elements?: EloquaFormElement[]
  processingSteps?: any[]
  size?: {
    type: string
    width?: string
    height?: string
  }
}

export interface EloquaFormElement {
  id: string
  name?: string
  type: string
  fieldMergeId?: string
  htmlName?: string
  displayType?: string
  dataType?: string
  validations?: any[]
  style?: string
  size?: string
}

export interface EloquaCampaign extends EloquaAsset {
  isReadOnly?: boolean
  runAsUserId?: string
  actualCost?: string
  budgetedCost?: string
  campaignCategory?: string
  campaignType?: string
  crmId?: string
  endAt?: string
  fieldValues?: any[]
  firstActivation?: string
  memberCount?: number
  startAt?: string
}

export interface EloquaDependency {
  id: string | number
  name?: string
  type: string
  permissions?: string[]
}

export interface EloquaBulkOperation {
  id: string
  name: string
  status: string
  createdAt: string
  createdBy: string
  uri?: string
  syncedRecordCount?: number
}

export interface FormSubmission {
  id: string
  createdAt: string
  fieldValues: Array<{
    id: string
    name?: string
    value: string
    type?: string
  }>
}

export interface CSVExportData {
  [key: string]: string | number | boolean | null
}