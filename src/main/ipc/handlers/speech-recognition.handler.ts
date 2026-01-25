import { ipcMain, type IpcMainInvokeEvent } from 'electron'
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
 * Initialize speech recognition service handler
 */
async function initializeSpeechRecognitionServiceHandler(
  _event: IpcMainInvokeEvent,
  config: SpeechRecognitionConfig
): Promise<IpcResponse<void>> {
  return wrapResponse(async () => {
    const service = initializeSpeechRecognitionService(config)

    // Set up event forwarding to renderer
    service.removeAllListeners()

    service.on('statusChange', (status: RecognitionStatus) => {
      _event.sender.send('speech-recognition:statusChange', { status })
    })

    service.on('result', (result: RecognitionResult) => {
      _event.sender.send('speech-recognition:result', result)
    })

    service.on('finalResult', (result: { text: string; allResults: string[] }) => {
      _event.sender.send('speech-recognition:finalResult', result)
    })

    service.on('error', (error: any) => {
      _event.sender.send('speech-recognition:error', {
        code: error.code,
        message: error.message
      })
    })

    service.on('connected', () => {
      _event.sender.send('speech-recognition:connected')
    })

    service.on('disconnected', () => {
      _event.sender.send('speech-recognition:disconnected')
    })

    service.on('reconnecting', (attempt: number) => {
      _event.sender.send('speech-recognition:reconnecting', { attempt })
    })

    service.on('recognitionStarted', () => {
      _event.sender.send('speech-recognition:started')
    })

    service.on('recognitionStopped', () => {
      _event.sender.send('speech-recognition:stopped')
    })
  })
}

/**
 * Connect to speech recognition service handler
 */
async function connectSpeechRecognitionHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse<void>> {
  return wrapResponse(async () => {
    const service = getSpeechRecognitionService()
    await service.connect()
  })
}

/**
 * Start recognition handler
 */
async function startRecognitionHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse<void>> {
  return wrapResponse(async () => {
    const service = getSpeechRecognitionService()
    await service.startRecognition()
  })
}

/**
 * Stop recognition handler
 */
async function stopRecognitionHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse<{ text: string }>> {
  return wrapResponse(async () => {
    const service = getSpeechRecognitionService()
    service.stopRecognition()
    return { text: service.getResults() }
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
  return wrapResponse(async () => {
    // Create a temporary service instance for testing
    const tempService = initializeSpeechRecognitionService(config)

    try {
      // Try to connect
      await tempService.connect()

      // Wait a moment to ensure connection is stable
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Disconnect
      tempService.disconnect()

      // Reset to avoid affecting the main instance
      resetSpeechRecognitionService()

      return {
        success: true,
        message: '语音识别服务连接成功'
      }
    } catch (error) {
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
