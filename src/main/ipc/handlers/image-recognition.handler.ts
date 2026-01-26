import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import {
  imageRecognitionService,
  type ImageRecognitionConfig,
  type OCRResult,
  type ImageUnderstandingResult,
  type RecognitionResult
} from '../../services/image-recognition.service'

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
 * Initialize image recognition service handler
 */
async function initializeImageRecognitionHandler(
  _event: IpcMainInvokeEvent,
  config: ImageRecognitionConfig
): Promise<IpcResponse<void>> {
  console.log('[IPC:ImageRecognition] initialize 调用 - 入参:', {
    timestamp: new Date().toISOString(),
    hasOCR: !!config.ocr,
    ocrProvider: config.ocr?.provider || 'N/A',
    hasBaiduApiKey: !!config.ocr?.baidu?.apiKey,
    hasVision: !!config.vision,
    visionProvider: config.vision?.provider || 'N/A'
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    await imageRecognitionService.initialize(config)

    const duration = Date.now() - startTime
    console.log('[IPC:ImageRecognition] initialize 完成 - 出参:', {
      success: true,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
  })
}

/**
 * Update image recognition config handler
 */
async function updateImageRecognitionConfigHandler(
  _event: IpcMainInvokeEvent,
  config: Partial<ImageRecognitionConfig>
): Promise<IpcResponse<void>> {
  console.log('[IPC:ImageRecognition] updateConfig 调用 - 入参:', {
    timestamp: new Date().toISOString(),
    hasOCR: !!config.ocr,
    hasVision: !!config.vision
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    await imageRecognitionService.updateConfig(config)

    const duration = Date.now() - startTime
    console.log('[IPC:ImageRecognition] updateConfig 完成 - 出参:', {
      success: true,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
  })
}

/**
 * Recognize text from image (OCR) handler
 */
async function recognizeTextHandler(
  _event: IpcMainInvokeEvent,
  imageData: Buffer
): Promise<IpcResponse<OCRResult>> {
  console.log('[IPC:ImageRecognition] recognizeText 调用 - 入参:', {
    timestamp: new Date().toISOString(),
    imageSize: imageData.length,
    imageFormat: 'Buffer'
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    const result = await imageRecognitionService.recognizeText(imageData)

    const duration = Date.now() - startTime
    console.log('[IPC:ImageRecognition] recognizeText 完成 - 出参:', {
      success: true,
      textLength: result.text?.length || 0,
      hasError: !result.success,
      errorMessage: result.error,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

    return result
  })
}

/**
 * Understand image content handler
 */
async function understandImageHandler(
  _event: IpcMainInvokeEvent,
  imageData: Buffer,
  prompt?: string
): Promise<IpcResponse<ImageUnderstandingResult>> {
  console.log('[IPC:ImageRecognition] understandImage 调用 - 入参:', {
    timestamp: new Date().toISOString(),
    imageSize: imageData.length,
    promptLength: prompt?.length || 0
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    const result = await imageRecognitionService.understandImage(imageData, prompt)

    const duration = Date.now() - startTime
    console.log('[IPC:ImageRecognition] understandImage 完成 - 出参:', {
      success: result.success,
      hasContent: !!result.data?.content,
      contentLength: result.data?.content?.length || 0,
      hasError: !result.success,
      errorMessage: result.error,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

    return result
  })
}

/**
 * Combined recognition (OCR + understanding) handler
 */
async function recognizeImageHandler(
  _event: IpcMainInvokeEvent,
  imageData: Buffer,
  options?: {
    enableOCR?: boolean
    enableUnderstanding?: boolean
    understandingPrompt?: string
  }
): Promise<IpcResponse<RecognitionResult>> {
  console.log('[IPC:ImageRecognition] recognize 调用 - 入参:', {
    timestamp: new Date().toISOString(),
    imageSize: imageData.length,
    enableOCR: options?.enableOCR,
    enableUnderstanding: options?.enableUnderstanding,
    hasPrompt: !!options?.understandingPrompt
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    const result = await imageRecognitionService.recognize(imageData, options)

    const duration = Date.now() - startTime
    console.log('[IPC:ImageRecognition] recognize 完成 - 出参:', {
      success: result.success,
      hasOCR: !!result.ocr,
      hasUnderstanding: !!result.understanding,
      hasError: !result.success,
      errorMessage: result.error,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

    return result
  })
}

/**
 * Test image recognition configuration handler
 */
async function testImageRecognitionHandler(
  _event: IpcMainInvokeEvent,
  config: ImageRecognitionConfig
): Promise<IpcResponse<{
  ocr?: { success: boolean; error?: string }
  vision?: { success: boolean; error?: string }
}>> {
  console.log('[IPC:ImageRecognition] test 调用 - 入参:', {
    timestamp: new Date().toISOString(),
    hasOCR: !!config.ocr,
    ocrProvider: config.ocr?.provider,
    hasVision: !!config.vision,
    visionProvider: config.vision?.provider
  })

  const startTime = Date.now()

  return wrapResponse(async () => {
    const result = await imageRecognitionService.test(config)

    const duration = Date.now() - startTime
    console.log('[IPC:ImageRecognition] test 完成 - 出参:', {
      ocrSuccess: result.ocr?.success,
      ocrError: result.ocr?.error,
      visionSuccess: result.vision?.success,
      visionError: result.vision?.error,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

    return result
  })
}

/**
 * Register all image recognition IPC handlers
 */
export function registerImageRecognitionHandlers(): void {
  // Initialize service
  ipcMain.handle('image-recognition:initialize', initializeImageRecognitionHandler)

  // Update config
  ipcMain.handle('image-recognition:updateConfig', updateImageRecognitionConfigHandler)

  // OCR operations
  ipcMain.handle('image-recognition:recognizeText', recognizeTextHandler)

  // Image understanding operations
  ipcMain.handle('image-recognition:understandImage', understandImageHandler)

  // Combined operations
  ipcMain.handle('image-recognition:recognize', recognizeImageHandler)

  // Test configuration
  ipcMain.handle('image-recognition:test', testImageRecognitionHandler)

  console.log('Image Recognition IPC handlers registered successfully')
}
