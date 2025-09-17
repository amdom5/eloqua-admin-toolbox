import { BaseTool, ToolConfig, ToolExecutionContext, ToolResult, ToolComponent, ParameterValidator } from '../shared/toolFramework'
import eloquaApiService from '../renderer/services/eloquaApi'

interface AssetDependencyParameters {
  assetType: 'email' | 'form' | 'landingpage' | 'contactfield' | 'segment' | 'sharedfilter' | 'sharedlist'
  assetId?: string
  includeNestedDependencies?: boolean
  exportFormat: 'csv' | 'json'
  maxResults?: number
}

interface AssetDependencySchema {
  assetType: {
    type: 'string'
    required: true
    enum: ['email', 'form', 'landingpage', 'contactfield', 'segment', 'sharedfilter', 'sharedlist']
    description: 'Type of assets to analyze (bulk analysis only supported for emails and forms)'
    category: 'basic'
  }
  assetId: {
    type: 'string'
    required: false
    description: 'Specific asset ID to analyze (required for landingpage, contactfield, segment, etc.)'
    category: 'basic'
  }
  includeNestedDependencies: {
    type: 'boolean'
    required: false
    default: false
    description: 'Include dependencies of dependencies (slower but finds nested relationships)'
    category: 'basic'
  }
  exportFormat: {
    type: 'string'
    required: true
    enum: ['csv', 'json']
    default: 'csv'
    description: 'Export format for results'
    category: 'basic'
  }
  maxResults: {
    type: 'number'
    required: false
    default: 25
    min: 1
    max: 5000
    description: 'Maximum number of assets to analyze'
    category: 'advanced'
  }
}

class AssetDependencyTool extends BaseTool {
  constructor() {
    const config: ToolConfig = {
      id: 'asset-dependency-tool',
      name: 'Dependency Analyzer',
      description: 'Analyze dependencies between Eloqua assets (emails, forms, images)',
      icon: 'Link',
      path: '/dependencies',
      category: 'analysis',
      features: [
        'Cross-asset dependency analysis',
        'Form usage tracking in emails',
        'Image and asset reference detection',
        'Unused asset identification',
        'Dependency impact analysis',
        'Export detailed dependency reports'
      ],
      requiresAuth: true,
      version: '1.0.0'
    }
    super(config)
  }

  validateParameters(parameters: AssetDependencyParameters): boolean {
    if (!parameters) return false

    // Validate asset type
    if (!ParameterValidator.isRequired(parameters.assetType) ||
        !['email', 'form', 'landingpage', 'contactfield', 'segment', 'sharedfilter', 'sharedlist'].includes(parameters.assetType)) {
      return false
    }

    // Validate that unsupported bulk asset types have an asset ID
    const supportedBulkTypes = ['email', 'form']
    if (!supportedBulkTypes.includes(parameters.assetType) && !parameters.assetId) {
      return false
    }

    // Validate export format
    if (!ParameterValidator.isRequired(parameters.exportFormat) ||
        !['csv', 'json'].includes(parameters.exportFormat)) {
      return false
    }

    // Validate max results
    if (parameters.maxResults !== undefined && 
        (!ParameterValidator.isNumber(parameters.maxResults) || 
         parameters.maxResults < 1 || 
         parameters.maxResults > 5000)) {
      return false
    }

    return true
  }

  getParameterSchema(): AssetDependencySchema {
    return {
      assetType: {
        type: 'string',
        required: true,
        enum: ['email', 'form', 'landingpage', 'contactfield', 'segment', 'sharedfilter', 'sharedlist'],
        description: 'Type of assets to analyze (bulk analysis only supported for emails and forms)',
        category: 'basic'
      },
      assetId: {
        type: 'string',
        required: false,
        description: 'Specific asset ID to analyze (required for landingpage, contactfield, segment, etc.)',
        category: 'basic'
      },
      includeNestedDependencies: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Include dependencies of dependencies (slower but finds nested relationships)',
        category: 'basic'
      },
      exportFormat: {
        type: 'string',
        required: true,
        enum: ['csv', 'json'],
        default: 'csv',
        description: 'Export format for results',
        category: 'basic'
      },
      maxResults: {
        type: 'number',
        required: false,
        default: 25,
        min: 1,
        max: 5000,
        description: 'Maximum number of assets to analyze',
        category: 'advanced'
      }
    }
  }

  async execute(context: ToolExecutionContext, parameters: AssetDependencyParameters): Promise<ToolResult> {
    try {
      // Initialize API service if needed
      if (!eloquaApiService) {
        throw new Error('Eloqua API service not initialized')
      }

      const {
        assetType,
        assetId,
        includeNestedDependencies = false,
        exportFormat = 'csv',
        maxResults = 25
      } = parameters

      context.showProgress('Starting dependency analysis...')

      let results = []

      if (assetId) {
        // Analyze specific asset
        context.showProgress(`Analyzing specific ${assetType} asset: ${assetId}`)
        try {
          const dependencies = await eloquaApiService.getAssetDependencies(assetType, assetId)
          
          // Initialize empty reverse dependencies (not implemented)
          let usedBy = []
          
          results = [{
            id: assetId,
            name: `${assetType} ${assetId}`,
            type: assetType,
            dependencies,
            dependencyCount: dependencies.length,
            usedBy,
            usageCount: usedBy.length,
            error: null
          }]
        } catch (error) {
          results = [{
            id: assetId,
            name: `${assetType} ${assetId}`,
            type: assetType,
            dependencies: [],
            dependencyCount: 0,
            usedBy: [],
            usageCount: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          }]
        }
      } else {
        // Analyze multiple assets - only supported for emails and forms
        const supportedTypes = ['email', 'form']
        
        // Validate that the selected asset type is supported for bulk analysis
        if (!supportedTypes.includes(assetType)) {
          return {
            success: false,
            error: `Bulk analysis for "${assetType}" assets is not yet supported. Please use a specific asset ID, or select "email" or "form" for bulk analysis.`
          }
        }

        const assetTypes = [assetType]

        for (const type of assetTypes) {
          context.showProgress(`Getting ${type} assets...`)
          
          try {
            // Get assets of this type
            let assets = []
            
            switch (type) {
              case 'email':
                const emailsResponse = await eloquaApiService.getEmails(undefined, 1, Math.min(maxResults, 200))
                assets = emailsResponse.elements || []
                break
              case 'form':
                const formsResponse = await eloquaApiService.getForms(undefined, 1, Math.min(maxResults, 200))
                assets = formsResponse.elements || []
                break
              default:
                context.showProgress(`${type} bulk analysis not supported - skipping`)
                continue
            }

            if (assets.length === 0) {
              context.showProgress(`No ${type} assets found`)
              continue
            }

            context.showProgress(`Analyzing dependencies for ${assets.length} ${type} assets...`)
            
            // Limit assets to analyze
            const assetsToAnalyze = assets.slice(0, Math.min(maxResults, 50)) // Limit for performance
            
            const assetDependencies = await eloquaApiService.getMultipleAssetDependencies(
              assetsToAnalyze.map(asset => ({
                type,
                id: asset.id,
                name: asset.name
              }))
            )
            
            results.push(...assetDependencies)
            
          } catch (error) {
            context.showProgress(`Warning: Failed to analyze ${type} assets: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      if (results.length === 0) {
        return {
          success: false,
          error: 'No assets found matching the specified criteria'
        }
      }


      context.showProgress('Processing dependency data...')

      // Process results for enhanced analysis
      const processedResults = await this.processResults(results, includeNestedDependencies, context)

      context.showProgress('Preparing results...')

      return {
        success: true,
        data: processedResults,
        message: `Successfully analyzed dependencies for ${processedResults.length} assets`
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private async processResults(
    results: any[], 
    includeNestedDependencies: boolean,
    context: ToolExecutionContext
  ): Promise<any[]> {
    const processed = []

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      context.showProgress(`Processing asset ${i + 1}/${results.length}: ${result.name}`)

      let dependencies = result.dependencies || []
      let dependencyCount = result.dependencyCount || dependencies.length
      const usedBy = result.usedBy || []
      const usageCount = result.usageCount || usedBy.length

      // If nested dependencies are enabled, get dependencies of dependencies
      if (includeNestedDependencies && dependencies.length > 0) {
        context.showProgress(`Getting nested dependencies for ${result.name}...`)
        dependencies = await this.getCascadingDependencies(dependencies, context, 2) // Max depth of 2
        dependencyCount = dependencies.length
      }

      const processedResult = {
        id: result.id,
        name: result.name,
        type: result.type,
        dependencyCount,
        usageCount,
        dependsOn: dependencies,  // Changed from 'dependencies' to match component interface
        usedBy,
        error: result.error,
        analysisDate: new Date().toISOString(),
        // Summary fields for easy CSV export with safe mapping
        dependsOnSummary: dependencies.filter(dep => dep && dep.name).map((dep: any) => `${dep.name} (${dep.type || 'unknown'})`).join('; '),
        usedBySummary: usedBy.filter(usage => usage && usage.name).map((usage: any) => `${usage.name} (${usage.type || 'unknown'})`).join('; '),
        hasDependencies: dependencyCount > 0,
        isUsed: usageCount > 0,
        riskLevel: this.calculateRiskLevel({
          dependsOn: dependencies,
          usedBy
        }),
        // Additional fields from real API with safe mapping
        dependencyTypes: [...new Set(dependencies.filter(dep => dep && dep.type).map((dep: any) => dep.type))],
        dependencyDetails: dependencies.filter(dep => dep && dep.id).map((dep: any) => ({
          id: dep.id,
          name: dep.name || 'Unknown',
          type: dep.type || 'unknown',
          permissions: dep.permissions || [],
          dependencyType: dep.DependencyType || null
        }))
      }


      processed.push(processedResult)
    }

    // Sort by dependency count (most dependencies first)
    processed.sort((a, b) => b.dependencyCount - a.dependencyCount)

    return processed
  }

  private async getCascadingDependencies(dependencies: any[], context: ToolExecutionContext, maxDepth: number = 2): Promise<any[]> {
    const allDependencies = [...dependencies]
    const processed = new Set<string>()
    
    // Add initial dependencies to processed set
    dependencies.forEach(dep => processed.add(dep.id))
    
    for (let depth = 1; depth < maxDepth; depth++) {
      const currentLevelDeps = allDependencies.filter(dep => !processed.has(`${dep.id}-${depth}`))
      if (currentLevelDeps.length === 0) break
      
      for (const dep of currentLevelDeps) {
        if (processed.has(`${dep.id}-${depth}`)) continue
        processed.add(`${dep.id}-${depth}`)
        
        try {
          const nestedDeps = await eloquaApiService.getAssetDependencies(dep.type, dep.id)
          
          // Add nested dependencies with depth information
          for (const nestedDep of nestedDeps) {
            const depKey = `${nestedDep.id}-${nestedDep.type}`
            if (!allDependencies.some(existing => `${existing.id}-${existing.type}` === depKey)) {
              allDependencies.push({
                ...nestedDep,
                depth,
                parentId: dep.id,
                parentName: dep.name
              })
            }
          }
        } catch (error) {
          context.showProgress(`Warning: Could not get dependencies for ${dep.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }
    
    return allDependencies
  }

  private calculateRiskLevel(asset: any): string {
    const dependencyCount = asset.dependsOn?.length || 0
    const usageCount = asset.usedBy?.length || 0
    
    if (dependencyCount === 0 && usageCount === 0) return 'Isolated'
    if (dependencyCount > 5 || usageCount > 10) return 'High'
    if (dependencyCount > 2 || usageCount > 5) return 'Medium'
    return 'Low'
  }


  getComponent(): ToolComponent {
    return {
      render: () => null // Will be implemented with React component
    }
  }
}

export default AssetDependencyTool