import axios, { AxiosInstance } from 'axios'
import { EloquaCredentials, EloquaLoginResponse } from '@shared/types'
import { InputValidator, EloquaApiValidator } from '../../shared/validation'

class EloquaApiService {
  private apiClient: AxiosInstance | null = null
  private credentials: EloquaCredentials | null = null

  constructor() {
    // Empty constructor - credentials will be set via initialize
  }

  initialize(credentials: EloquaCredentials) {
    this.credentials = credentials
    
    // Create the authentication string and encode it
    const authString = `${credentials.siteName}\\${credentials.username}:${credentials.password}`
    const encodedAuth = btoa(authString)
    
    this.apiClient = axios.create({
      baseURL: credentials.baseUrl,
      headers: {
        'Authorization': `Basic ${encodedAuth}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    // Add response interceptor for error handling
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Reset the client on authentication failure
          this.apiClient = null
          this.credentials = null
          // Redirect to login
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          throw new Error('Authentication failed. Please check your credentials.')
        }
        if (error.response?.status === 403) {
          throw new Error('Access denied. You may not have permission for this operation.')
        }
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. Please try again.')
        }
        throw error
      }
    )
  }

  private ensureInitialized() {
    if (!this.apiClient || !this.credentials) {
      throw new Error('API client not initialized. Please log in first.')
    }
  }

  private getAuthString(): string {
    this.ensureInitialized()
    return `${this.credentials!.siteName}\\${this.credentials!.username}:${this.credentials!.password}`
  }

  async testConnection(): Promise<EloquaLoginResponse> {
    this.ensureInitialized()
    
    try {
      const authString = this.getAuthString()
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'GET',
        endpoint: '/API/REST/1.0/system/user'
      })
      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      // If authentication failed, reset the client
      if (errorMessage.includes('Not authenticated') || errorMessage.includes('401')) {
        this.apiClient = null
        this.credentials = null
      }
      throw new Error(`Connection test failed: ${errorMessage}`)
    }
  }

  async getEmails(search?: string, page: number = 1, count: number = 100) {
    this.ensureInitialized()
    
    // Validate and sanitize inputs
    const pageValidation = InputValidator.validateNumber(page, 1, 10000)
    if (!pageValidation.isValid) {
      throw new Error(`Invalid page parameter: ${pageValidation.errors.join(', ')}`)
    }
    
    const countValidation = InputValidator.validateNumber(count, 1, 1000)
    if (!countValidation.isValid) {
      throw new Error(`Invalid count parameter: ${countValidation.errors.join(', ')}`)
    }
    
    const params = new URLSearchParams()
    params.append('page', pageValidation.sanitizedValue.toString())
    params.append('count', countValidation.sanitizedValue.toString())
    params.append('depth', 'complete') // Get complete email details including user names and groups
    params.append('extensions', 'emailGroup') // Include email group information
    
    if (search) {
      const searchValidation = InputValidator.validateSearchTerm(search)
      if (!searchValidation.isValid) {
        throw new Error(`Invalid search term: ${searchValidation.errors.join(', ')}`)
      }
      params.append('search', searchValidation.sanitizedValue)
    }

    try {
      const authString = this.getAuthString()
      const endpoint = `/API/REST/2.0/assets/emails?${params.toString()}`
      
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'GET',
        endpoint
      })
      
      return data
    } catch (error) {
      throw new Error(`Failed to fetch emails: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getEmailDetails(emailId: string) {
    this.ensureInitialized()
    
    // Validate email ID
    const idValidation = EloquaApiValidator.validateAssetId(emailId)
    if (!idValidation.isValid) {
      throw new Error(`Invalid email ID: ${idValidation.errors.join(', ')}`)
    }
    
    try {
      const authString = this.getAuthString()
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'GET',
        endpoint: `/API/REST/2.0/assets/email/${idValidation.sanitizedValue}`
      })
      return data
    } catch (error) {
      throw new Error(`Failed to fetch email details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getForms(search?: string, page: number = 1, count: number = 100) {
    this.ensureInitialized()
    
    // Validate and sanitize inputs
    const pageValidation = InputValidator.validateNumber(page, 1, 10000)
    if (!pageValidation.isValid) {
      throw new Error(`Invalid page parameter: ${pageValidation.errors.join(', ')}`)
    }
    
    const countValidation = InputValidator.validateNumber(count, 1, 1000)
    if (!countValidation.isValid) {
      throw new Error(`Invalid count parameter: ${countValidation.errors.join(', ')}`)
    }
    
    const params = new URLSearchParams()
    params.append('page', pageValidation.sanitizedValue.toString())
    params.append('count', countValidation.sanitizedValue.toString())
    
    if (search) {
      const searchValidation = InputValidator.validateSearchTerm(search)
      if (!searchValidation.isValid) {
        throw new Error(`Invalid search term: ${searchValidation.errors.join(', ')}`)
      }
      params.append('search', searchValidation.sanitizedValue)
    }

    try {
      const authString = this.getAuthString()
      const endpoint = `/API/REST/1.0/assets/forms?${params.toString()}`
      
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'GET',
        endpoint
      })
      
      return data
    } catch (error) {
      throw new Error(`Failed to fetch forms: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getFormDetails(formId: string) {
    this.ensureInitialized()
    
    // Validate form ID
    const idValidation = EloquaApiValidator.validateAssetId(formId)
    if (!idValidation.isValid) {
      throw new Error(`Invalid form ID: ${idValidation.errors.join(', ')}`)
    }
    
    try {
      const authString = this.getAuthString()
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'GET',
        endpoint: `/API/REST/1.0/assets/form/${idValidation.sanitizedValue}`
      })
      return data
    } catch (error) {
      throw new Error(`Failed to fetch form details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // V2.0 Forms API Methods
  async getFormsV2(search?: string, page: number = 1, count: number = 100, depth: string = 'partial', orderBy?: string, lastUpdatedAt?: number) {
    this.ensureInitialized()
    
    // Validate and sanitize inputs
    const pageValidation = InputValidator.validateNumber(page, 1, 10000)
    if (!pageValidation.isValid) {
      throw new Error(`Invalid page parameter: ${pageValidation.errors.join(', ')}`)
    }
    
    const countValidation = InputValidator.validateNumber(count, 1, 1000)
    if (!countValidation.isValid) {
      throw new Error(`Invalid count parameter: ${countValidation.errors.join(', ')}`)
    }
    
    const params = new URLSearchParams()
    params.append('page', pageValidation.sanitizedValue.toString())
    params.append('count', countValidation.sanitizedValue.toString())
    params.append('depth', depth)
    
    if (search) {
      const searchValidation = InputValidator.validateSearchTerm(search)
      if (!searchValidation.isValid) {
        throw new Error(`Invalid search term: ${searchValidation.errors.join(', ')}`)
      }
      params.append('search', searchValidation.sanitizedValue)
    }

    if (orderBy) {
      params.append('orderBy', orderBy)
    }

    if (lastUpdatedAt) {
      params.append('lastUpdatedAt', lastUpdatedAt.toString())
    }

    try {
      const authString = this.getAuthString()
      const endpoint = `/api/REST/2.0/assets/forms?${params.toString()}`
      
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'GET',
        endpoint
      })
      
      return data
    } catch (error) {
      throw new Error(`Failed to fetch forms: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getFormDetailsV2(formId: string, depth: string = 'complete') {
    this.ensureInitialized()
    
    // Validate form ID
    const idValidation = EloquaApiValidator.validateAssetId(formId)
    if (!idValidation.isValid) {
      throw new Error(`Invalid form ID: ${idValidation.errors.join(', ')}`)
    }
    
    try {
      const authString = this.getAuthString()
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'GET',
        endpoint: `/api/REST/2.0/assets/form/${idValidation.sanitizedValue}?depth=${depth}`
      })
      return data
    } catch (error) {
      throw new Error(`Failed to fetch form details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Enhanced Form Management Methods
  async createForm(formData: any) {
    this.ensureInitialized()
    
    try {
      const authString = this.getAuthString()
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'POST',
        endpoint: '/API/REST/1.0/assets/form',
        body: formData
      })
      return data
    } catch (error) {
      throw new Error(`Failed to create form: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async updateForm(formId: string, formData: any) {
    this.ensureInitialized()
    
    try {
      const authString = this.getAuthString()
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'PUT',
        endpoint: `/API/REST/1.0/assets/form/${formId}`,
        body: formData
      })
      return data
    } catch (error) {
      throw new Error(`Failed to update form: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deleteForm(formId: string) {
    this.ensureInitialized()
    
    try {
      const authString = this.getAuthString()
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'DELETE',
        endpoint: `/API/REST/1.0/assets/form/${formId}`
      })
      return data
    } catch (error) {
      throw new Error(`Failed to delete form: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async copyForm(formId: string, newName: string, targetFolderId?: string) {
    this.ensureInitialized()
    
    try {
      // Get the original form details
      const originalForm = await this.getFormDetails(formId)
      
      // Create a copy with modified properties
      const formCopy = {
        ...originalForm,
        name: newName,
        htmlName: newName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        folderId: targetFolderId || originalForm.folderId,
        id: undefined // Remove ID so a new one is generated
      }
      
      return await this.createForm(formCopy)
    } catch (error) {
      throw new Error(`Failed to copy form: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getFormSubmissions(formId: string, startDate?: string, endDate?: string, page: number = 1, count: number = 100) {
    this.ensureInitialized()
    
    const params: any = {
      page,
      count
    }
    
    if (startDate) {
      params.startAt = startDate
    }
    if (endDate) {
      params.endAt = endDate
    }

    try {
      const authString = this.getAuthString()
      const endpoint = `/API/REST/1.0/data/form/${formId}?${new URLSearchParams(params).toString()}`
      
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'GET',
        endpoint
      })
      return data
    } catch (error) {
      throw new Error(`Failed to fetch form submissions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getFormAnalytics(formId: string, startDate?: string, endDate?: string) {
    this.ensureInitialized()
    
    try {
      // Get form submissions for analytics
      const submissions = await this.getFormSubmissions(formId, startDate, endDate, 1, 1000)
      
      // Calculate basic analytics
      const analytics = {
        totalSubmissions: submissions.totalResults || 0,
        submissionsByDate: {},
        fieldCompletionRates: {},
        averageCompletionTime: 0
      }
      
      if (submissions.elements && submissions.elements.length > 0) {
        // Group submissions by date
        const submissionsByDate: Record<string, number> = {}
        
        submissions.elements.forEach((submission: any) => {
          const date = submission.createdAt ? submission.createdAt.split('T')[0] : 'Unknown'
          submissionsByDate[date] = (submissionsByDate[date] || 0) + 1
        })
        
        analytics.submissionsByDate = submissionsByDate
        
        // Calculate field completion rates
        const fieldStats: Record<string, { total: number, completed: number }> = {}
        
        submissions.elements.forEach((submission: any) => {
          if (submission.fieldValues) {
            submission.fieldValues.forEach((field: any) => {
              const fieldName = field.name || field.id
              if (!fieldStats[fieldName]) {
                fieldStats[fieldName] = { total: 0, completed: 0 }
              }
              fieldStats[fieldName].total++
              if (field.value && field.value.trim() !== '') {
                fieldStats[fieldName].completed++
              }
            })
          }
        })
        
        // Convert to completion rates
        const fieldCompletionRates: Record<string, number> = {}
        Object.keys(fieldStats).forEach(fieldName => {
          const stats = fieldStats[fieldName]
          fieldCompletionRates[fieldName] = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
        })
        
        analytics.fieldCompletionRates = fieldCompletionRates
      }
      
      return analytics
    } catch (error) {
      throw new Error(`Failed to fetch form analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getFormFields(formId: string) {
    this.ensureInitialized()
    
    try {
      const formDetails = await this.getFormDetails(formId)
      return formDetails.elements || []
    } catch (error) {
      throw new Error(`Failed to fetch form fields: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async updateFormField(formId: string, fieldId: string, fieldData: any) {
    this.ensureInitialized()
    
    try {
      // Get current form details
      const form = await this.getFormDetails(formId)
      
      // Update the specific field
      if (form.elements) {
        const fieldIndex = form.elements.findIndex((el: any) => el.id === fieldId)
        if (fieldIndex !== -1) {
          form.elements[fieldIndex] = { ...form.elements[fieldIndex], ...fieldData }
          
          // Update the entire form
          return await this.updateForm(formId, form)
        } else {
          throw new Error(`Field with ID ${fieldId} not found in form`)
        }
      } else {
        throw new Error('Form has no elements')
      }
    } catch (error) {
      throw new Error(`Failed to update form field: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async addFormField(formId: string, fieldData: any) {
    this.ensureInitialized()
    
    try {
      // Get current form details
      const form = await this.getFormDetails(formId)
      
      // Add the new field
      if (!form.elements) {
        form.elements = []
      }
      
      form.elements.push(fieldData)
      
      // Update the entire form
      return await this.updateForm(formId, form)
    } catch (error) {
      throw new Error(`Failed to add form field: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async removeFormField(formId: string, fieldId: string) {
    this.ensureInitialized()
    
    try {
      // Get current form details
      const form = await this.getFormDetails(formId)
      
      // Remove the specific field
      if (form.elements) {
        form.elements = form.elements.filter((el: any) => el.id !== fieldId)
        
        // Update the entire form
        return await this.updateForm(formId, form)
      } else {
        throw new Error('Form has no elements')
      }
    } catch (error) {
      throw new Error(`Failed to remove form field: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getBulkOperations(type?: 'imports' | 'exports') {
    this.ensureInitialized()
    
    try {
      const endpoint = type ? `/API/REST/1.0/bulk/${type}` : '/API/REST/1.0/bulk'
      const authString = this.getAuthString()
      
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'GET',
        endpoint
      })
      
      return data
    } catch (error) {
      throw new Error(`Failed to fetch bulk operations: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deleteBulkOperation(operationId: string, type: 'imports' | 'exports') {
    this.ensureInitialized()
    
    try {
      const authString = this.getAuthString()
      
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'DELETE',
        endpoint: `/API/REST/1.0/bulk/${type}/${operationId}`
      })
      
      return data
    } catch (error) {
      throw new Error(`Failed to delete bulk operation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Dependency Analysis Methods
  async analyzeDependencies(assetType: string, assetId?: string, enableCampaignAnalysis: boolean = false) {
    this.ensureInitialized()
    
    try {
      // Get all assets of specified type for analysis
      let assets = []
      
      switch (assetType.toLowerCase()) {
        case 'email':
          assets = await this.getAllAssets('emails')
          break
        case 'form':
          assets = await this.getAllAssets('forms')
          break
        case 'campaign':
          assets = await this.getAllAssets('campaigns')
          break
        default:
          throw new Error(`Unsupported asset type: ${assetType}`)
      }

      const dependencies = []
      
      // If specific asset ID provided, analyze just that asset
      if (assetId) {
        assets = assets.filter((asset: any) => asset.id === assetId)
      }

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i]
        const assetDeps = await this.analyzeAssetDependencies(asset, assetType, enableCampaignAnalysis)
        dependencies.push(assetDeps)
      }

      return dependencies
    } catch (error) {
      throw new Error(`Failed to analyze dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async getAllAssets(type: string, limit: number = 5000) {
    const allAssets = []
    let page = 1
    const pageSize = 100
    let hasMore = true

    while (hasMore && allAssets.length < limit) {
      let response
      
      switch (type) {
        case 'emails':
          response = await this.getEmails('', page, pageSize)
          break
        case 'forms':
          response = await this.getForms('', page, pageSize)
          break
        case 'campaigns':
          response = await this.getCampaigns('', page, pageSize)
          break
        default:
          throw new Error(`Unsupported asset type: ${type}`)
      }

      if (response.elements && response.elements.length > 0) {
        allAssets.push(...response.elements)
        hasMore = response.elements.length === pageSize
        page++
      } else {
        hasMore = false
      }
    }

    return allAssets
  }

  private async analyzeAssetDependencies(asset: any, assetType: string, enableCampaignAnalysis: boolean = false) {
    const dependsOn = []
    const usedBy = []

    try {
      // Get detailed asset information
      let assetDetails
      
      switch (assetType.toLowerCase()) {
        case 'email':
          assetDetails = await this.getEmailDetails(asset.id)
          break
        case 'form':
          assetDetails = await this.getFormDetails(asset.id)
          break
        default:
          assetDetails = asset
      }

      // Analyze content for dependencies
      if (assetType.toLowerCase() === 'email') {
        // Look for form references in email content
        const formRefs = this.extractFormReferences(assetDetails.htmlContent?.contentSource || '')
        for (const formRef of formRefs) {
          dependsOn.push({
            id: formRef.id,
            name: formRef.name || `Form ${formRef.id}`,
            type: 'form'
          })
        }

        // Look for image and other asset references
        const assetRefs = this.extractAssetReferences(assetDetails.htmlContent?.contentSource || '')
        for (const assetRef of assetRefs) {
          dependsOn.push(assetRef)
        }
      }

      // Add reverse dependency analysis (what campaigns use this asset)
      // Only run if specifically enabled to avoid performance issues
      let usedByList = []
      if (enableCampaignAnalysis) {
        try {
          usedByList = await this.findAssetUsage(asset.id, assetType, ['email', 'form'])
        } catch (error) {
          console.warn(`Skipping usage analysis for ${asset.id}: ${error}`)
          usedByList = []
        }
      }

      return {
        id: asset.id,
        name: asset.name,
        type: assetType.toLowerCase(),
        dependsOn,
        usedBy: usedByList
      }
    } catch (error) {
      return {
        id: asset.id,
        name: asset.name,
        type: assetType.toLowerCase(),
        dependsOn: [],
        usedBy: [],
        error: `Failed to analyze: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }


  async getCampaigns(search?: string, page: number = 1, count: number = 100) {
    this.ensureInitialized()
    
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('count', count.toString())
    
    if (search) {
      params.append('search', search)
    }

    try {
      const authString = this.getAuthString()
      const endpoint = `/API/REST/1.0/assets/campaigns?${params.toString()}`
      
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'GET',
        endpoint
      })
      
      return data
    } catch (error) {
      throw new Error(`Failed to fetch campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getCampaignDetails(campaignId: string) {
    this.ensureInitialized()
    
    try {
      const authString = this.getAuthString()
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'GET',
        endpoint: `/API/REST/1.0/assets/campaign/${campaignId}?depth=complete`
      })
      return data
    } catch (error) {
      throw new Error(`Failed to fetch campaign details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getAssetsByType(type: string, searchTerm?: string) {
    switch (type.toLowerCase()) {
      case 'email':
        return await this.getEmails(searchTerm)
      case 'form':
        return await this.getForms(searchTerm)
      case 'campaign':
        return await this.getCampaigns(searchTerm)
      default:
        throw new Error(`Unsupported asset type: ${type}`)
    }
  }

  // Real Dependencies API Methods
  async getAssetDependencies(assetType: string, assetId: string) {
    this.ensureInitialized()
    
    // Map asset types to their API endpoint paths
    const assetTypeMap: Record<string, string> = {
      'email': 'email',
      'form': 'form',
      'landingpage': 'landingPage',
      'contactfield': 'contact/field',
      'segment': 'contact/segment',
      'sharedfilter': 'contact/filter',
      'sharedlist': 'contact/list'
    }
    
    const normalizedType = assetType.toLowerCase().replace(/[^a-z]/g, '')
    const apiPath = assetTypeMap[normalizedType]
    
    if (!apiPath) {
      throw new Error(`Unsupported asset type for dependency analysis: ${assetType}`)
    }
    
    try {
      const authString = this.getAuthString()
      const endpoint = `/API/REST/2.0/assets/${apiPath}/${assetId}/dependencies`
      
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'GET',
        endpoint
      })
      
      // Return the array of dependencies directly
      return data || []
    } catch (error) {
      throw new Error(`Failed to fetch dependencies for ${assetType} ${assetId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getMultipleAssetDependencies(assets: Array<{type: string, id: string, name?: string}>) {
    const results = []
    
    for (const asset of assets) {
      try {
        const dependencies = await this.getAssetDependencies(asset.type, asset.id)
        results.push({
          id: asset.id,
          name: asset.name || `${asset.type} ${asset.id}`,
          type: asset.type.toLowerCase(),
          dependencies,
          dependencyCount: dependencies.length,
          error: null
        })
      } catch (error) {
        results.push({
          id: asset.id,
          name: asset.name || `${asset.type} ${asset.id}`,
          type: asset.type.toLowerCase(),
          dependencies: [],
          dependencyCount: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return results
  }

  async findAssetUsage(targetAssetId: string, targetAssetType: string, searchInTypes: string[] = ['email', 'form'], maxAssetsToCheck: number = 100) {
    this.ensureInitialized()
    
    const usedBy = []
    
    try {
      // Search through different asset types to find what uses the target asset
      for (const searchType of searchInTypes) {
        try {
          let assets = []
          
          switch (searchType) {
            case 'email':
              const emailsResponse = await this.getEmails('', 1, Math.min(maxAssetsToCheck, 50))
              assets = emailsResponse.elements || []
              break
            case 'form':
              const formsResponse = await this.getForms('', 1, Math.min(maxAssetsToCheck, 50))
              assets = formsResponse.elements || []
              break
            default:
              continue
          }
          
          // Limit the number of assets to check
          assets = assets.slice(0, maxAssetsToCheck)
          
          // Check dependencies of each asset to see if it uses our target
          for (const asset of assets) {
            try {
              const dependencies = await this.getAssetDependencies(searchType, asset.id)
              
              // Check if this asset depends on our target asset
              const usesTarget = dependencies.some(dep => 
                dep.id === targetAssetId || dep.id === parseInt(targetAssetId)
              )
              
              if (usesTarget) {
                usedBy.push({
                  id: asset.id,
                  name: asset.name,
                  type: searchType,
                  permissions: ['Retrieve'] // Default permissions
                })
              }
            } catch (error) {
              // Skip assets that fail to analyze
              continue
            }
          }
          
        } catch (error) {
          console.warn(`Failed to search ${searchType} assets for usage:`, error)
        }
      }
      
    } catch (error) {
      console.warn(`Failed to find asset usage:`, error)
    }
    
    return usedBy
  }

  // Generic API request method for custom endpoints
  async getEmailGroups(page: number = 1, count: number = 1000) {
    this.ensureInitialized()
    
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('count', count.toString())

    try {
      const authString = this.getAuthString()
      const endpoint = `/API/REST/1.0/assets/email/groups?${params.toString()}`
      
      const data = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method: 'GET',
        endpoint
      })
      
      return data
    } catch (error) {
      throw new Error(`Failed to fetch email groups: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async makeRequest(method: string, endpoint: string, data?: any, params?: any): Promise<any> {
    this.ensureInitialized()
    
    // Validate HTTP method
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    if (!allowedMethods.includes(method.toUpperCase())) {
      throw new Error(`Invalid HTTP method: ${method}`)
    }
    
    // Validate API endpoint
    const endpointValidation = EloquaApiValidator.validateApiEndpoint(endpoint)
    if (!endpointValidation.isValid) {
      throw new Error(`Invalid API endpoint: ${endpointValidation.errors.join(', ')}`)
    }
    
    try {
      const authString = this.getAuthString()
      
      let fullEndpoint = endpointValidation.sanitizedValue
      if (params) {
        const queryParams = new URLSearchParams()
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null) {
            // Sanitize parameter values
            const sanitizedValue = InputValidator.sanitizeHtml(String(value))
            queryParams.append(key, sanitizedValue)
          }
        }
        if (queryParams.toString()) {
          fullEndpoint += (fullEndpoint.includes('?') ? '&' : '?') + queryParams.toString()
        }
      }
      
      const response = await window.electronAPI.eloquaApiCall({
        baseUrl: this.credentials!.baseUrl!,
        authString,
        method,
        endpoint: fullEndpoint,
        body: data
      })
      
      return response
    } catch (error) {
      throw new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Create singleton instance
const eloquaApiService = new EloquaApiService()

// Helper function for login/connection testing
export async function testConnection(credentials: EloquaCredentials): Promise<EloquaLoginResponse> {
  try {
    // Starting authentication process
    
    // Use the main process to make the API call
    // If this throws an error, it means authentication failed (401, 404, etc.)
    const loginData = await window.electronAPI.eloquaTestConnection(credentials)
    
    // Validate response type and structure
    
    // Check if we received a string instead of an object (indicates an error was returned as data)
    if (typeof loginData === 'string') {
      console.error('Renderer - Received string instead of object, treating as error:', loginData)
      
      // Convert generic "Not authenticated" to more helpful message
      if (loginData.toLowerCase().includes('not authenticated')) {
        throw new Error('Invalid credentials. Please check your site name, username, and password.')
      }
      
      throw new Error(loginData)
    }
    
    // Check if we received an object but it's actually an error structure
    if (loginData && typeof loginData === 'object' && (loginData.error || loginData.message)) {
      console.error('Renderer - Received error object:', loginData)
      throw new Error(loginData.error || loginData.message || 'Unknown error from authentication service')
    }
    
    // If we get here, the main process returned data successfully
    // The main process should have already validated the response structure
    // Initialize the main API service with the base URL
    const credentialsWithBaseUrl = {
      ...credentials,
      baseUrl: loginData.urls.base,
    }
    
    eloquaApiService.initialize(credentialsWithBaseUrl)
    
    return loginData
  } catch (error) {
    console.error('Renderer - Authentication failed:', error instanceof Error ? error.message : 'Unknown error')
    // Re-throw the error as-is to preserve the specific error messages from main process
    // This could be: "Invalid credentials", "Site not found", "Invalid response", etc.
    throw error
  }
}

export default eloquaApiService