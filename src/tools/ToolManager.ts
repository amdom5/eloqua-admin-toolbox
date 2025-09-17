import { toolRegistry } from '../shared/toolFramework'
import EmailAssetTool from './EmailAssetTool'
import FormAssetTool from './FormAssetTool'
import FormManagementTool from './FormManagementTool'
import FormBulkSubmitTool from './FormBulkSubmitTool'
import AssetDependencyTool from './AssetDependencyTool'
import BulkSyncDeletionTool from './BulkSyncDeletionTool'
import ContactFieldExportTool from './ContactFieldExportTool'
import ProgramExportTool from './ProgramExportTool'
import CampaignExportTool from './CampaignExportTool'

class ToolManager {
  private static instance: ToolManager
  private initialized = false

  private constructor() {}

  static getInstance(): ToolManager {
    if (!ToolManager.instance) {
      ToolManager.instance = new ToolManager()
    }
    return ToolManager.instance
  }

  initialize(): void {
    if (this.initialized) return

    // Register all available tools
    this.registerTools()
    this.initialized = true
  }

  private registerTools(): void {
    // Register Email Asset Tool
    toolRegistry.register(new EmailAssetTool())

    // Register Form Asset Tool
    toolRegistry.register(new FormAssetTool())

    // Register Form Management Tool
    toolRegistry.register(new FormManagementTool())

    // Register Form Bulk Submit Tool
    toolRegistry.register(new FormBulkSubmitTool())

    // Register Asset Dependency Tool
    toolRegistry.register(new AssetDependencyTool())

    // Register Bulk Sync Deletion Tool
    toolRegistry.register(new BulkSyncDeletionTool())

    // Register Contact Field Export Tool
    toolRegistry.register(new ContactFieldExportTool())

    // Register Program Export Tool
    toolRegistry.register(new ProgramExportTool())

    // Register Campaign Export Tool
    toolRegistry.register(new CampaignExportTool())
  }

  getToolsForNavigation() {
    return toolRegistry.getAll().map(tool => {
      const config = tool.getConfig()
      return {
        id: config.id,
        name: config.name,
        description: config.description,
        icon: config.icon,
        path: config.path,
        category: config.category,
        features: config.features
      }
    })
  }

  getToolsByCategory() {
    const tools = toolRegistry.getAll()
    const categories = {
      assets: tools.filter(tool => tool.getConfig().category === 'assets'),
      operations: tools.filter(tool => tool.getConfig().category === 'operations'),
      analysis: tools.filter(tool => tool.getConfig().category === 'analysis'),
      management: tools.filter(tool => tool.getConfig().category === 'management'),
      'data-export': tools.filter(tool => tool.getConfig().category === 'data-export')
    }

    return categories
  }

  getToolConfig(toolId: string) {
    const tool = toolRegistry.get(toolId)
    return tool?.getConfig()
  }

  getToolParameterSchema(toolId: string) {
    const tool = toolRegistry.get(toolId)
    return tool?.getParameterSchema()
  }

  isToolRegistered(toolId: string): boolean {
    return toolRegistry.get(toolId) !== undefined
  }

  getAllToolConfigs() {
    return toolRegistry.getAll().map(tool => tool.getConfig())
  }

  getToolsRequiringAuth() {
    return toolRegistry.getAll().filter(tool => tool.getConfig().requiresAuth)
  }

  getToolsForRoute(route: string) {
    return toolRegistry.getToolsForRoute(route)
  }
}

export default ToolManager