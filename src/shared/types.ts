export interface EloquaCredentials {
  siteName: string
  username: string
  password: string
  baseUrl?: string
  userId?: string
}

export interface EloquaLoginResponse {
  site: {
    id: string
    name: string
  }
  user: {
    id: string
    userName: string
    displayName: string
  }
  urls: {
    base: string
    apis: {
      soap: {
        standard: string
        dataTransfer: string
      }
      rest: {
        standard: string
        bulk: string
      }
    }
  }
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  error?: string
}

export interface EmailAsset {
  id: string
  name: string
  subject: string
  htmlContent: string
  textContent?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
  folderId?: string
  folderName?: string
  isArchived: boolean
  permissions: string[]
}

export interface FormAsset {
  id: string
  name: string
  htmlName: string
  elements: FormElement[]
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
  folderId?: string
  isArchived: boolean
}

export interface FormElement {
  id: string
  name: string
  type: string
  displayName: string
  dataType: string
  isRequired: boolean
  isReadOnly: boolean
  defaultValue?: string
  options?: FormElementOption[]
}

export interface FormElementOption {
  id: string
  name: string
  displayName: string
  value: string
}

export interface AssetDependency {
  id: string
  name: string
  type: string
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
}

export interface BulkOperation {
  id: string
  name: string
  type: 'import' | 'export'
  status: 'active' | 'completed' | 'error' | 'pending'
  createdAt: string
  updatedAt: string
  createdBy: string
  recordCount?: number
  errorCount?: number
}