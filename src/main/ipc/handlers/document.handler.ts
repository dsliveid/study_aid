import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import {
  parseDocument,
  detectFileType,
  getDocumentStats,
  getDocumentService
} from '../../services/document.service'

/**
 * Response wrapper for IPC calls
 */
interface IpcResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Helper function to wrap IPC handler responses
 */
function wrapResponse<T>(fn: () => Promise<T>): Promise<IpcResponse<T>> {
  return fn()
    .then((data) => ({ success: true, data }))
    .catch((error) => ({
      success: false,
      error: error.message || '操作失败'
    }))
}

/**
 * Parse document handler
 */
async function parseDocumentHandler(
  _event: IpcMainInvokeEvent,
  buffer: Buffer,
  fileType: 'pdf' | 'docx' | 'txt'
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getDocumentService()
    const result = await service.parseDocument(buffer, fileType)
    return result
  })
}

/**
 * Detect file type handler
 */
async function detectFileTypeHandler(
  _event: IpcMainInvokeEvent,
  filename: string
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getDocumentService()
    return service.detectFileType(filename)
  })
}

/**
 * Get document statistics handler
 */
async function getDocumentStatsHandler(
  _event: IpcMainInvokeEvent,
  document: { text: string; pages?: number }
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getDocumentService()
    return service.getDocumentStats(document)
  })
}

/**
 * Parse document from file path handler
 */
async function parseDocumentFromPathHandler(
  _event: IpcMainInvokeEvent,
  filePath: string
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const fs = await import('fs')
    const { ext } = await import('path')

    const buffer = fs.default.readFileSync(filePath)
    const fileType = ext(filePath).slice(1).toLowerCase() as 'pdf' | 'docx' | 'txt'

    const service = getDocumentService()
    const result = await service.parseDocument(buffer, fileType)

    // Include statistics in the response
    const stats = service.getDocumentStats(result)

    return {
      ...result,
      stats,
      fileName: filePath
    }
  })
}

/**
 * Register document handlers
 */
export function registerDocumentHandlers() {
  ipcMain.handle('document:parse', parseDocumentHandler)
  ipcMain.handle('document:detectFileType', detectFileTypeHandler)
  ipcMain.handle('document:getStats', getDocumentStatsHandler)
  ipcMain.handle('document:parseFromPath', parseDocumentFromPathHandler)

  console.log('Document IPC handlers registered successfully')
}
