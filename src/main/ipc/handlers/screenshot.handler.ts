import { ipcMain, type IpcMainInvokeEvent, BrowserWindow, desktopCapturer } from 'electron'
import { getScreenshotService } from '../../services/screenshot.service'

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
 * Capture full screen handler
 */
async function captureFullScreenHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getScreenshotService()
    return await service.captureFullScreen()
  })
}

/**
 * Capture screen by ID handler
 */
async function captureScreenByIdHandler(
  _event: IpcMainInvokeEvent,
  screenId: string
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getScreenshotService()
    return await service.captureScreenById(screenId)
  })
}

/**
 * Get screen sources handler
 */
async function getScreenSourcesHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getScreenshotService()
    return await service.getScreenSources()
  })
}

/**
 * Get desktop capture for region selector (high resolution)
 * This is called from the screenshot selector window
 */
async function getDesktopCaptureHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse<{ dataUrl: string; width: number; height: number }>> {
  return wrapResponse(async () => {
    console.log('[IPC:Screenshot] getDesktopCapture 调用 - 获取高分辨率截图')
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 3840, height: 2160 }
    })

    if (sources.length === 0) {
      throw new Error('未找到屏幕源')
    }

    const primaryScreen = sources[0]
    const dataUrl = primaryScreen.thumbnail.toDataURL()

    console.log('[IPC:Screenshot] getDesktopCapture 完成 - dataUrl 长度:', dataUrl.length)

    return {
      dataUrl,
      width: primaryScreen.thumbnail.getSize().width,
      height: primaryScreen.thumbnail.getSize().height
    }
  })
}

/**
 * Open region selector handler
 */
async function openRegionSelectorHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getScreenshotService()
    return await service.openRegionSelector()
  })
}

/**
 * Save screenshot handler
 */
async function saveScreenshotHandler(
  _event: IpcMainInvokeEvent,
  data: { screenshotId: string; filename?: string }
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getScreenshotService()
    return await service.saveScreenshot(data.screenshotId, data.filename)
  })
}

/**
 * Delete screenshot handler
 */
async function deleteScreenshotHandler(
  _event: IpcMainInvokeEvent,
  data: { screenshotId: string; deleteFile?: boolean }
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getScreenshotService()
    await service.deleteScreenshot(data.screenshotId, data.deleteFile)
    return { success: true }
  })
}

/**
 * Get screenshot handler
 */
async function getScreenshotHandler(
  _event: IpcMainInvokeEvent,
  screenshotId: string
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getScreenshotService()
    const screenshot = service.getScreenshot(screenshotId)
    if (!screenshot) {
      throw new Error('截图不存在')
    }
    return screenshot
  })
}

/**
 * Get all screenshots handler
 */
async function getAllScreenshotsHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getScreenshotService()
    return service.getAllScreenshots()
  })
}

/**
 * Register screenshot shortcut handler
 */
async function registerShortcutHandler(
  _event: IpcMainInvokeEvent,
  accelerator: string
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getScreenshotService()
    const success = service.registerShortcut(accelerator, async () => {
      // Trigger screenshot via IPC
      const result = await service.captureFullScreen()
      // Send to main window
      const windows = BrowserWindow.getAllWindows()
      windows.forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send('screenshot-taken', result)
        }
      })
    })
    return { success }
  })
}

/**
 * Unregister screenshot shortcut handler
 */
async function unregisterShortcutHandler(
  _event: IpcMainInvokeEvent,
  accelerator: string
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getScreenshotService()
    service.unregisterShortcut(accelerator)
    return { success: true }
  })
}

/**
 * Register all screenshot-related IPC handlers
 */
export function registerScreenshotHandlers() {
  // Capture operations
  ipcMain.handle('screenshot:captureFullScreen', captureFullScreenHandler)
  ipcMain.handle('screenshot:captureScreenById', captureScreenByIdHandler)
  ipcMain.handle('screenshot:getScreenSources', getScreenSourcesHandler)
  ipcMain.handle('screenshot:openRegionSelector', openRegionSelectorHandler)
  ipcMain.handle('screenshot:getDesktopCapture', getDesktopCaptureHandler)

  // Screenshot management
  ipcMain.handle('screenshot:save', saveScreenshotHandler)
  ipcMain.handle('screenshot:delete', deleteScreenshotHandler)
  ipcMain.handle('screenshot:get', getScreenshotHandler)
  ipcMain.handle('screenshot:getAll', getAllScreenshotsHandler)

  // Shortcut management
  ipcMain.handle('screenshot:registerShortcut', registerShortcutHandler)
  ipcMain.handle('screenshot:unregisterShortcut', unregisterShortcutHandler)

  console.log('Screenshot IPC handlers registered successfully')
}
