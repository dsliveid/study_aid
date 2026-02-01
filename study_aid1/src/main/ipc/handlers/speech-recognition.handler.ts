import { ipcMain, type IpcMainInvokeEvent, BrowserWindow } from 'electron'
import {
  getSpeechRecognitionService,
  initializeSpeechRecognitionService,
  resetSpeechRecognitionService,
  type SpeechRecognitionConfig,
  type RecognitionResult,
  RecognitionStatus,
  SpeechErrorCode
} from '../../services/speech-recognition.service'

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
 * Get the currently focused window's webContents
 * Falls back to the first available window if no focused window
 */
function getCurrentWebContents() {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  if (focusedWindow && !focusedWindow.isDestroyed()) {
    return focusedWindow.webContents
  }

  // Fall back to first available window
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      return win.webContents
    }
  }

  return null
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
 * Active sessions for managing recognition per window
 */
const activeSessions = new Map<number, any>()

/**
 * Helper function to safely send IPC messages to renderer
 * Always tries to use the current focused window, ignoring the provided webContents
 * This ensures messages go to the active window even if the original sender was closed
 */
function safeSendToRenderer(_providedWebContents: any, channel: string, ...args: any[]): boolean {
  try {
    // Always get the current window instead of using the provided webContents
    // This avoids issues where the original sender window was closed or reloaded
    const webContents = getCurrentWebContents()
    if (!webContents) {
      return false
    }

    // Double-check the webContents is not destroyed
    if (webContents.isDestroyed()) {
      return false
    }

    // Check if we can access the mainFrame without errors
    // Note: We don't check frame.url as it can throw security errors
    try {
      const frame = webContents.mainFrame
      if (!frame) {
        return false
      }
    } catch (frameError) {
      // If accessing mainFrame throws, the frame is likely disposed
      return false
    }

    // Send the message
    webContents.send(channel, ...args)
    return true
  } catch (error: any) {
    // Silently ignore all errors - the error is logged by Electron internally
    return false
  }
}

/**
 * Initialize speech recognition service handler
 */
async function initializeSpeechRecognitionServiceHandler(
  _event: IpcMainInvokeEvent,
  config: SpeechRecognitionConfig
): Promise<IpcResponse<void>> {
  console.log('[IPC:SpeechRecognition] initialize 调用 - 入参:', {
    timestamp: new Date().toISOString(),
    hasApiKey: !!config.apiKey,
    apiKeyPrefix: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'N/A',
    hasAppId: !!config.appId,
    appId: config.appId || 'N/A',
    hasApiSecret: !!config.apiSecret,
    apiSecretPrefix: config.apiSecret ? `${config.apiSecret.substring(0, 8)}...` : 'N/A',
    provider: 'Xunfei (科大讯飞)',
    language: config.language || 'zh_cn',
    format: config.format || 'audio/L16;rate=16000'
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    const service = initializeSpeechRecognitionService(config)

    // Set up event forwarding to renderer
    service.removeAllListeners()

    service.on('statusChange', (status: RecognitionStatus) => {
      safeSendToRenderer(_event.sender, 'speech-recognition:statusChange', { status })
      console.log('[IPC:SpeechRecognition] statusChange 事件 - 出参:', { status })
    })

    service.on('result', (result: RecognitionResult) => {
      safeSendToRenderer(_event.sender, 'speech-recognition:result', result)
      console.log('[IPC:SpeechRecognition] result 事件 - 出参:', {
        text: result.text.substring(0, 50) + '...',
        isFinal: result.isFinal,
        confidence: result.confidence
      })
    })

    service.on('finalResult', (result: { text: string; allResults: string[] }) => {
      safeSendToRenderer(_event.sender, 'speech-recognition:finalResult', result)
      console.log('[IPC:SpeechRecognition] finalResult 事件 - 出参:', {
        textLength: result.text.length,
        allResultsCount: result.allResults.length
      })
    })

    service.on('error', (error: any) => {
      safeSendToRenderer(_event.sender, 'speech-recognition:error', {
        code: error.code,
        message: error.message
      })
      console.error('[IPC:SpeechRecognition] error 事件 - 出参:', {
        code: error.code,
        message: error.message
      })
    })

    service.on('connected', () => {
      safeSendToRenderer(_event.sender, 'speech-recognition:connected')
      console.log('[IPC:SpeechRecognition] connected 事件')
    })

    service.on('disconnected', () => {
      safeSendToRenderer(_event.sender, 'speech-recognition:disconnected')
      console.log('[IPC:SpeechRecognition] disconnected 事件')
    })

    service.on('reconnecting', (attempt: number) => {
      safeSendToRenderer(_event.sender, 'speech-recognition:reconnecting', { attempt })
      console.log('[IPC:SpeechRecognition] reconnecting 事件:', { attempt })
    })

    service.on('recognitionStarted', () => {
      safeSendToRenderer(_event.sender, 'speech-recognition:started')
      console.log('[IPC:SpeechRecognition] started 事件')
    })

    service.on('recognitionStopped', () => {
      safeSendToRenderer(_event.sender, 'speech-recognition:stopped')
      console.log('[IPC:SpeechRecognition] stopped 事件')
    })

    const duration = Date.now() - startTime
    console.log('[IPC:SpeechRecognition] initialize 完成 - 出参:', {
      success: true,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
  })
}

/**
 * Connect to speech recognition service handler
 */
async function connectSpeechRecognitionHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse<void>> {
  console.log('[IPC:SpeechRecognition] connect 调用 - 入参: {}', {
    timestamp: new Date().toISOString()
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    const service = getSpeechRecognitionService()
    await service.connect()

    const duration = Date.now() - startTime
    console.log('[IPC:SpeechRecognition] connect 完成 - 出参:', {
      success: true,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
  })
}

/**
 * Start recognition handler
 */
async function startRecognitionHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse<void>> {
  console.log('[IPC:SpeechRecognition] start 调用 - 入参: {}', {
    timestamp: new Date().toISOString()
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    const service = getSpeechRecognitionService()
    await service.startRecognition()

    const duration = Date.now() - startTime
    console.log('[IPC:SpeechRecognition] start 完成 - 出参:', {
      success: true,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
  })
}

/**
 * Stop recognition handler
 */
async function stopRecognitionHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse<{ text: string }>> {
  console.log('[IPC:SpeechRecognition] stop 调用 - 入参: {}', {
    timestamp: new Date().toISOString()
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    const service = getSpeechRecognitionService()
    service.stopRecognition()
    const text = service.getResults()

    const duration = Date.now() - startTime
    console.log('[IPC:SpeechRecognition] stop 完成 - 出参:', {
      success: true,
      textLength: text.length,
      textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

    return { text }
  })
}

/**
 * Send audio data handler
 */
async function sendAudioDataHandler(
  _event: IpcMainInvokeEvent,
  audioBuffer: Buffer
): Promise<IpcResponse<void>> {
  return wrapResponse(async () => {
    const service = getSpeechRecognitionService()
    service.sendAudioData(audioBuffer)
  })
}

/**
 * Get recognition status handler
 */
async function getRecognitionStatusHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse<{ status: RecognitionStatus }>> {
  return wrapResponse(async () => {
    const service = getSpeechRecognitionService()
    return { status: service.getStatus() }
  })
}

/**
 * Disconnect speech recognition service handler
 */
async function disconnectSpeechRecognitionHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse<void>> {
  return wrapResponse(async () => {
    const service = getSpeechRecognitionService()
    service.disconnect()
  })
}

/**
 * Get recognition results handler
 */
async function getRecognitionResultsHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse<{ text: string }>> {
  return wrapResponse(async () => {
    const service = getSpeechRecognitionService()
    return { text: service.getResults() }
  })
}

/**
 * Clear recognition results handler
 */
async function clearRecognitionResultsHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse<void>> {
  return wrapResponse(async () => {
    const service = getSpeechRecognitionService()
    service.clearResults()
  })
}

/**
 * Test speech recognition service handler
 */
async function testSpeechRecognitionServiceHandler(
  _event: IpcMainInvokeEvent,
  config: SpeechRecognitionConfig
): Promise<IpcResponse<{ success: boolean; message: string }>> {
  console.log('[IPC:SpeechRecognition] test 调用 - 入参:', {
    timestamp: new Date().toISOString(),
    hasApiKey: !!config.apiKey,
    apiKeyPrefix: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'N/A',
    hasAppId: !!config.appId,
    appId: config.appId || 'N/A',
    hasApiSecret: !!config.apiSecret,
    apiSecretPrefix: config.apiSecret ? `${config.apiSecret.substring(0, 8)}...` : 'N/A',
    provider: 'Xunfei (科大讯飞)'
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    // Create a temporary service instance for testing
    const tempService = initializeSpeechRecognitionService(config)

    try {
      console.log('[IPC:SpeechRecognition] test - 开始连接测试...')

      // Try to connect
      await tempService.connect()

      console.log('[IPC:SpeechRecognition] test - 连接成功，等待稳定...')

      // Wait a moment to ensure connection is stable
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Disconnect
      tempService.disconnect()

      console.log('[IPC:SpeechRecognition] test - 测试完成，重置服务')

      // Reset to avoid affecting the main instance
      resetSpeechRecognitionService()

      const duration = Date.now() - startTime
      const result = {
        success: true,
        message: '语音识别服务连接成功'
      }

      console.log('[IPC:SpeechRecognition] test 完成 - 出参:', {
        ...result,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      })

      return result
    } catch (error: any) {
      console.error('[IPC:SpeechRecognition] test 失败:', {
        error: error.message,
        code: error.code,
        stack: error.stack
      })

      // Reset even on error
      resetSpeechRecognitionService()

      throw error
    }
  })
}

/**
 * Register speech recognition handlers
 */
export function registerSpeechRecognitionHandlers() {
  ipcMain.handle('speech-recognition:initialize', initializeSpeechRecognitionServiceHandler)
  ipcMain.handle('speech-recognition:connect', connectSpeechRecognitionHandler)
  ipcMain.handle('speech-recognition:start', startRecognitionHandler)
  ipcMain.handle('speech-recognition:stop', stopRecognitionHandler)
  ipcMain.handle('speech-recognition:sendAudio', sendAudioDataHandler)
  ipcMain.handle('speech-recognition:getStatus', getRecognitionStatusHandler)
  ipcMain.handle('speech-recognition:disconnect', disconnectSpeechRecognitionHandler)
  ipcMain.handle('speech-recognition:getResults', getRecognitionResultsHandler)
  ipcMain.handle('speech-recognition:clearResults', clearRecognitionResultsHandler)
  ipcMain.handle('speech-recognition:test', testSpeechRecognitionServiceHandler)

  console.log('Speech Recognition IPC handlers registered successfully')
}

/**
 * Error code mapping for frontend
 */
export const SpeechRecognitionErrorMessages: Record<string, string> = {
  [SpeechErrorCode.CONFIG_INVALID]: '配置无效，请检查API密钥和应用ID',
  [SpeechErrorCode.CONNECTION_FAILED]: '连接失败，请检查网络连接',
  [SpeechErrorCode.AUTH_FAILED]: '认证失败，请检查API密钥',
  [SpeechErrorCode.AUDIO_ERROR]: '音频处理错误',
  [SpeechErrorCode.SERVICE_ERROR]: '语音识别服务错误',
  [SpeechErrorCode.NETWORK_ERROR]: '网络连接错误',
  [SpeechErrorCode.TIMEOUT]: '连接超时'
}
