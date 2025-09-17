import { ReactNode } from 'react'

export interface ToolConfig {
  id: string
  name: string
  description: string
  icon: string
  path: string
  category: 'assets' | 'operations' | 'analysis' | 'management'
  features: string[]
  requiresAuth: boolean
  version: string
}

export interface ToolExecutionContext {
  credentials: any
  electronAPI: any
  showProgress: (message: string) => void
  hideProgress: () => void
  showError: (error: string) => void
  showSuccess: (message: string) => void
}

export interface ToolResult {
  success: boolean
  data?: any
  error?: string
  message?: string
  exportPath?: string
}

export interface ToolComponent {
  render: (context: ToolExecutionContext) => ReactNode
}

export abstract class BaseTool {
  protected config: ToolConfig

  constructor(config: ToolConfig) {
    this.config = config
  }

  getConfig(): ToolConfig {
    return this.config
  }

  abstract execute(context: ToolExecutionContext, parameters?: any): Promise<ToolResult>
  abstract validateParameters(parameters: any): boolean
  abstract getParameterSchema(): any
  abstract getComponent(): ToolComponent
}

export class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map()

  register(tool: BaseTool): void {
    this.tools.set(tool.getConfig().id, tool)
  }

  get(id: string): BaseTool | undefined {
    return this.tools.get(id)
  }

  getAll(): BaseTool[] {
    return Array.from(this.tools.values())
  }

  getAllByCategory(category: ToolConfig['category']): BaseTool[] {
    return this.getAll().filter(tool => tool.getConfig().category === category)
  }

  getToolsForRoute(path: string): BaseTool[] {
    return this.getAll().filter(tool => tool.getConfig().path === path)
  }
}

// Global tool registry
export const toolRegistry = new ToolRegistry()

// Tool execution utilities
export class ToolExecutor {
  static async execute(
    toolId: string,
    context: ToolExecutionContext,
    parameters?: any
  ): Promise<ToolResult> {
    const tool = toolRegistry.get(toolId)
    
    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolId}' not found`
      }
    }

    try {
      context.showProgress(`Executing ${tool.getConfig().name}...`)
      
      if (!tool.validateParameters(parameters)) {
        return {
          success: false,
          error: 'Invalid parameters provided'
        }
      }

      const result = await tool.execute(context, parameters)
      
      if (result.success) {
        context.showSuccess(result.message || 'Operation completed successfully')
      } else {
        context.showError(result.error || 'Operation failed')
      }
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      context.showError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      context.hideProgress()
    }
  }
}

// Parameter validation utilities
export class ParameterValidator {
  static isRequired(value: any): boolean {
    return value !== null && value !== undefined && value !== ''
  }

  static isString(value: any): boolean {
    return typeof value === 'string'
  }

  static isNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value)
  }

  static isArray(value: any): boolean {
    return Array.isArray(value)
  }

  static isObject(value: any): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  static minLength(value: string, length: number): boolean {
    return typeof value === 'string' && value.length >= length
  }

  static maxLength(value: string, length: number): boolean {
    return typeof value === 'string' && value.length <= length
  }

  static isEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  static isUrl(value: string): boolean {
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }
}