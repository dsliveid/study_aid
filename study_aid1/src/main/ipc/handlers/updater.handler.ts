import { ipcMain, BrowserWindow } from 'electron'
import { getUpdaterService } from '../../services/updater.service'

/**
 * Updater Handler
 * Manages application auto-update functionality
 */

const updaterService = getUpdaterService()

/**
 * Register updater IPC handlers
 */
export function registerUpdaterHandlers(mainWindow: BrowserWindow): void {
  // Set main window for the updater service
  updaterService.setMainWindow(mainWindow)

  /**
   * Check for updates
   */
  ipcMain.handle('updater:checkForUpdates', async () => {
    try {
      const updateInfo = await updaterService.checkForUpdates()
      return {
        success: true,
        data: updateInfo,
        status: updaterService.getStatus()
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to check for updates'
      }
    }
  })

  /**
   * Download update
   */
  ipcMain.handle('updater:downloadUpdate', async () => {
    try {
      await updaterService.downloadUpdate()
      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to download update'
      }
    }
  })

  /**
   * Install update and restart
   */
  ipcMain.handle('updater:installAndRestart', async () => {
    try {
      updaterService.installAndRestart()
      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to install update'
      }
    }
  })

  /**
   * Get update status
   */
  ipcMain.handle('updater:getStatus', async () => {
    return {
      success: true,
      data: {
        status: updaterService.getStatus(),
        updateInfo: updaterService.getUpdateInfo(),
        downloadProgress: updaterService.getDownloadProgress()
      }
    }
  })

  // Forward events from updater service to renderer
  updaterService.on('status-change', (status, info) => {
    mainWindow.webContents.send('updater:status-change', { status, info })
  })

  updaterService.on('download-progress', (progress) => {
    mainWindow.webContents.send('updater:download-progress', progress)
  })

  updaterService.on('error', (error) => {
    mainWindow.webContents.send('updater:error', { error: error.message })
  })

  console.log('Updater IPC handlers registered successfully')
}
