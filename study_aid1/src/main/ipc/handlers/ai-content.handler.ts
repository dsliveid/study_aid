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
  console.log('[IPC:AIContent] initialize 调用 - 入参:', {
    timestamp: new Date().toISOString(),
    hasApiKey: !!config.apiKey,
    apiKeyPrefix: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'N/A',
    baseUrl: config.baseUrl || 'default',
    model: config.model || 'default'
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    initializeAIContentService(config)

    const duration = Date.now() - startTime
    console.log('[IPC:AIContent] initialize 完成 - 出参:', {
      success: true,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
  })
}

/**
 * Generate knowledge tree handler
 */
async function generateKnowledgeTreeHandler(
  _event: IpcMainInvokeEvent,
  content: string
): Promise<IpcResponse<KnowledgeTreeResult>> {
  console.log('[IPC:AIContent] generateKnowledgeTree 调用 - 入参:', {
    timestamp: new Date().toISOString(),
    contentLength: content.length,
    contentPreview: content.substring(0, 100) + '...'
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    const service = getAIContentService()
    const result = await service.generateKnowledgeTree(content)

    const duration = Date.now() - startTime
    console.log('[IPC:AIContent] generateKnowledgeTree 完成 - 出参:', {
      success: true,
      titleLength: result.title?.length || 0,
      nodeCount: result.structure?.length || 0,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

    return result
  })
}

/**
 * Extract key points handler
 */
async function extractKeyPointsHandler(
  _event: IpcMainInvokeEvent,
  content: string
): Promise<IpcResponse<KeyPointsResult>> {
  console.log('[IPC:AIContent] extractKeyPoints 调用 - 入参:', {
    timestamp: new Date().toISOString(),
    contentLength: content.length,
    contentPreview: content.substring(0, 100) + '...'
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    const service = getAIContentService()
    const result = await service.extractKeyPoints(content)

    const duration = Date.now() - startTime
    console.log('[IPC:AIContent] extractKeyPoints 完成 - 出参:', {
      success: true,
      keyPointsCount: result.keyPoints?.length || 0,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

    return result
  })
}

/**
 * Annotate difficult points handler
 */
async function annotateDifficultPointsHandler(
  _event: IpcMainInvokeEvent,
  content: string
): Promise<IpcResponse<DifficultPointsResult>> {
  console.log('[IPC:AIContent] annotateDifficultPoints 调用 - 入参:', {
    timestamp: new Date().toISOString(),
    contentLength: content.length,
    contentPreview: content.substring(0, 100) + '...'
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    const service = getAIContentService()
    const result = await service.annotateDifficultPoints(content)

    const duration = Date.now() - startTime
    console.log('[IPC:AIContent] annotateDifficultPoints 完成 - 出参:', {
      success: true,
      difficultPointsCount: result.difficultPoints?.length || 0,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

    return result
  })
}

/**
 * Update AI content service configuration handler
 */
async function updateAIContentConfigHandler(
  _event: IpcMainInvokeEvent,
  config: Partial<AIContentConfig>
): Promise<IpcResponse<void>> {
  console.log('[IPC:AIContent] updateConfig 调用 - 入参:', {
    timestamp: new Date().toISOString(),
    hasApiKey: !!config.apiKey,
    hasBaseUrl: !!config.baseUrl,
    hasModel: !!config.model
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    const service = getAIContentService()
    service.updateConfig(config)

    const duration = Date.now() - startTime
    console.log('[IPC:AIContent] updateConfig 完成 - 出参:', {
      success: true,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
  })
}

/**
 * Get AI content service configuration handler
 */
async function getAIContentConfigHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse<any>> {
  console.log('[IPC:AIContent] getConfig 调用 - 入参: {}', {
    timestamp: new Date().toISOString()
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    const service = getAIContentService()
    const config = service.getConfig()

    const duration = Date.now() - startTime
    console.log('[IPC:AIContent] getConfig 完成 - 出参:', {
      hasApiKey: !!config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

    return config
  })
}

/**
 * Test AI content service connection handler
 */
async function testAIContentServiceHandler(
  _event: IpcMainInvokeEvent,
  config: AIContentConfig
): Promise<IpcResponse<{ success: boolean; message: string }>> {
  console.log('[IPC:AIContent] test 调用 - 入参:', {
    timestamp: new Date().toISOString(),
    hasApiKey: !!config.apiKey,
    apiKeyPrefix: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'N/A',
    baseUrl: config.baseUrl || 'default',
    model: config.model || 'default'
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    // Create a temporary service instance for testing
    const tempService = initializeAIContentService(config)

    // Test with a simple prompt
    const testContent = '这是一个测试文档。'
    console.log('[IPC:AIContent] test - 开始测试，生成知识树...')

    const result = await tempService.generateKnowledgeTree(testContent)

    // Reset to avoid affecting the main instance
    resetAIContentService()

    const duration = Date.now() - startTime
    const response = {
      success: true,
      message: 'AI服务连接成功'
    }

    console.log('[IPC:AIContent] test 完成 - 出参:', {
      ...response,
      testResult: {
        titleGenerated: !!result.title,
        structureGenerated: result.structure?.length > 0
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

    return response
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
