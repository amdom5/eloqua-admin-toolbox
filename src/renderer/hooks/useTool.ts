import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ToolExecutor, ToolExecutionContext, ToolResult } from '../../shared/toolFramework'
import ToolManager from '../../tools/ToolManager'

interface UseToolState {
  isExecuting: boolean
  progress: string | null
  result: ToolResult | null
  error: string | null
}

interface UseToolReturn extends UseToolState {
  executeTool: (toolId: string, parameters?: any) => Promise<ToolResult>
  clearResult: () => void
  clearError: () => void
}

export function useTool(): UseToolReturn {
  const { credentials } = useAuth()
  const [state, setState] = useState<UseToolState>({
    isExecuting: false,
    progress: null,
    result: null,
    error: null
  })

  const updateState = useCallback((updates: Partial<UseToolState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const showProgress = useCallback((message: string) => {
    updateState({ progress: message })
  }, [updateState])

  const hideProgress = useCallback(() => {
    updateState({ progress: null })
  }, [updateState])

  const showError = useCallback((error: string) => {
    updateState({ error })
  }, [updateState])

  const showSuccess = useCallback((message: string) => {
    // Success messages can be handled via the result
    // Note: Success state is managed through the result object
  }, [])

  const executeTool = useCallback(async (toolId: string, parameters?: any): Promise<ToolResult> => {
    // Clear previous state
    updateState({
      isExecuting: true,
      progress: null,
      result: null,
      error: null
    })

    try {
      // Initialize tool manager if needed
      const toolManager = ToolManager.getInstance()
      toolManager.initialize()

      // Check if tool exists
      if (!toolManager.isToolRegistered(toolId)) {
        const errorResult: ToolResult = {
          success: false,
          error: `Tool '${toolId}' not found`
        }
        updateState({ result: errorResult, isExecuting: false })
        return errorResult
      }

      // Create execution context
      const context: ToolExecutionContext = {
        credentials,
        electronAPI: window.electronAPI,
        showProgress,
        hideProgress,
        showError,
        showSuccess
      }

      // Execute the tool
      const result = await ToolExecutor.execute(toolId, context, parameters)
      
      updateState({
        result,
        isExecuting: false
      })

      return result
    } catch (error) {
      const errorResult: ToolResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
      
      updateState({
        result: errorResult,
        error: errorResult.error,
        isExecuting: false
      })

      return errorResult
    }
  }, [credentials, updateState, showProgress, hideProgress, showError, showSuccess])

  const clearResult = useCallback(() => {
    updateState({ result: null })
  }, [updateState])

  const clearError = useCallback(() => {
    updateState({ error: null })
  }, [updateState])

  return {
    ...state,
    executeTool,
    clearResult,
    clearError
  }
}

export default useTool