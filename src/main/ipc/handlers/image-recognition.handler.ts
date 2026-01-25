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
  return wrapResponse(async () => {
    await imageRecognitionService.initialize(config)
  })
}

/**
 * Update image recognition config handler
 */
async function updateImageRecognitionConfigHandler(
  _event: IpcMainInvokeEvent,
  config: Partial<ImageRecognitionConfig>
): Promise<IpcResponse<void>> {
  return wrapResponse(async () => {
    await imageRecognitionService.updateConfig(config)
  })
}

/**
 * Recognize text from image (OCR) handler
 */
async function recognizeTextHandler(
  _event: IpcMainInvokeEvent,
  imageData: Buffer
): Promise<IpcResponse<OCRResult>> {
  return wrapResponse(async () => {
    return await imageRecognitionService.recognizeText(imageData)
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
  return wrapResponse(async () => {
    return await imageRecognitionService.understandImage(imageData, prompt)
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
  return wrapResponse(async () => {
    return await imageRecognitionService.recognize(imageData, options)
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
  return wrapResponse(async () => {
    return await imageRecognitionService.test(config)
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
