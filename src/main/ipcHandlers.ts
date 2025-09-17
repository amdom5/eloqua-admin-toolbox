import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { SecurityUtils } from './security'

// Rate limiter for API calls
const apiRateLimiter = SecurityUtils.createRateLimiter(100, 60000) // 100 requests per minute

export function registerSecureHandler(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: any[]) => any
) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      // Validate input based on channel
      const validation = SecurityUtils.validateIpcInput(channel, args)
      if (!validation.valid) {
        throw new Error(`Invalid input: ${validation.errors.join(', ')}`)
      }

      // Apply rate limiting for API calls
      if (channel.startsWith('eloqua:')) {
        const identifier = `${event.sender.id}` // Use sender ID for rate limiting
        if (!apiRateLimiter.check(identifier)) {
          throw new Error('Rate limit exceeded. Please wait before making more requests.')
        }
      }

      // Execute the handler
      return await handler(event, ...args)
    } catch (error) {
      console.error(`Error in IPC handler ${channel}:`, error)
      throw error
    }
  })
}

// Wrapper for removing handlers
export function removeSecureHandler(channel: string) {
  ipcMain.removeHandler(channel)
}

// Clear rate limit for a specific sender
export function clearRateLimit(senderId: string) {
  apiRateLimiter.reset(senderId)
}