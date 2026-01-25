import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import {
  getAIContentService,
  initializeAIContentService,
  resetAIContentService,
  type AIContentConfig,
  type KnowledgeTreeResult,
  type KeyPointsResult,
  type DifficultPointsResult,
  AIContentErrorCode
} from '../../services/ai-content.service'

/**
 * Response wrapper for IPC calls
 */
interface IpcResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

/**
 * Helper function to wrap IPC handler responses
 */
function wrapResponse<T>(fn: () => Promise<T>): Promise<IpcResponse<T>> {
  return fn()
    .then((data) => ({ success: true, data }))
    .catch((error) => {
      if (error.code) {
        return {
          success: false,
          error: error.message,
          code: error.code
        }
      }
      return {
        success: false,
        error: error.message || '操作失败'
      }
    })
}

/**
 * Initialize AI content service handler
 */
async function initializeAIContentServiceHandler(
  _event: IpcMainInvokeEvent,
  config: AIContentConfig
): Promise<IpcResponse<void>> {
  return wrapResponse(async () => {
    initializeAIContentService(config)
  })
}

/**
 * Generate knowledge tree handler
 */
async function generateKnowledgeTreeHandler(
  _event: IpcMainInvokeEvent,
  content: string
): Promise<IpcResponse<KnowledgeTreeResult>> {
  return wrapResponse(async () => {
    const service = getAIContentService()
    return await service.generateKnowledgeTree(content)
  })
}

/**
 * Extract key points handler
 */
async function extractKeyPointsHandler(
  _event: IpcMainInvokeEvent,
  content: string
): Promise<IpcResponse<KeyPointsResult>> {
  return wrapResponse(async () => {
    const service = getAIContentService()
    return await service.extractKeyPoints(content)
  })
}

/**
 * Annotate difficult points handler
 */
async function annotateDifficultPointsHandler(
  _event: IpcMainInvokeEvent,
  content: string
): Promise<IpcResponse<DifficultPointsResult>> {
  return wrapResponse(async () => {
    const service = getAIContentService()
    return await service.annotateDifficultPoints(content)
  })
}

/**
 * Update AI content service configuration handler
 */
async function updateAIContentConfigHandler(
  _event: IpcMainInvokeEvent,
  config: Partial<AIContentConfig>
): Promise<IpcResponse<void>> {
  return wrapResponse(async () => {
    const service = getAIContentService()
    service.updateConfig(config)
  })
}

/**
 * Get AI content service configuration handler
 */
async function getAIContentConfigHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse<any>> {
  return wrapResponse(async () => {
    const service = getAIContentService()
    return service.getConfig()
  })
}

/**
 * Test AI content service connection handler
 */
async function testAIContentServiceHandler(
  _event: IpcMainInvokeEvent,
  config: AIContentConfig
): Promise<IpcResponse<{ success: boolean; message: string }>> {
  return wrapResponse(async () => {
    // Create a temporary service instance for testing
    const tempService = initializeAIContentService(config)

    // Test with a simple prompt
    const testContent = '这是一个测试文档。'
    const result = await tempService.generateKnowledgeTree(testContent)

    // Reset to avoid affecting the main instance
    resetAIContentService()

    return {
      success: true,
      message: 'AI服务连接成功'
    }
  })
}

/**
 * Register AI content handlers
 */
export function registerAIContentHandlers() {
  ipcMain.handle('ai-content:initialize', initializeAIContentServiceHandler)
  ipcMain.handle('ai-content:generateKnowledgeTree', generateKnowledgeTreeHandler)
  ipcMain.handle('ai-content:extractKeyPoints', extractKeyPointsHandler)
  ipcMain.handle('ai-content:annotateDifficultPoints', annotateDifficultPointsHandler)
  ipcMain.handle('ai-content:updateConfig', updateAIContentConfigHandler)
  ipcMain.handle('ai-content:getConfig', getAIContentConfigHandler)
  ipcMain.handle('ai-content:test', testAIContentServiceHandler)

  console.log('AI Content IPC handlers registered successfully')
}

/**
 * Error code mapping for frontend
 */
export const AIContentErrorMessages: Record<string, string> = {
  [AIContentErrorCode.API_KEY_INVALID]: 'API密钥无效，请检查配置',
  [AIContentErrorCode.RATE_LIMIT]: '请求过于频繁，请稍后再试',
  [AIContentErrorCode.CONTEXT_TOO_LONG]: '文档内容过长，请分段处理',
  [AIContentErrorCode.SERVICE_ERROR]: 'AI服务错误，请重试',
  [AIContentErrorCode.NETWORK_ERROR]: '网络连接失败，请检查网络',
  [AIContentErrorCode.INVALID_RESPONSE]: 'AI返回格式异常，请重试'
}
