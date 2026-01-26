import { ipcMain, shell } from 'electron'
import { getSettingsService } from '../../services/settings.service'
import { app } from 'electron'
import { join } from 'path'

/**
 * Settings Handler
 * Manages application settings persistence and operations
 */

const settingsService = getSettingsService()

/**
 * Get all settings
 */
async function getSettingsHandler(): Promise<any> {
  try {
    const settings = settingsService.getAllSettings()
    return { success: true, data: settings }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get settings'
    }
  }
}

/**
 * Set settings (merge with existing)
 */
async function setSettingsHandler(_event: any, settings: any): Promise<any> {
  try {
    const updatedSettings = settingsService.updateSettings(settings)
    return { success: true, data: updatedSettings }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to save settings'
    }
  }
}

/**
 * Get setting by key path
 */
async function getSettingHandler(_event: any, keyPath: string): Promise<any> {
  try {
    const value = settingsService.getSetting(keyPath)
    return { success: true, data: value }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get setting'
    }
  }
}

/**
 * Select data path
 */
async function selectDataPathHandler(): Promise<any> {
  try {
    const path = await settingsService.selectDataPath()
    if (path) {
      return { success: true, data: path }
    }
    return { success: false, error: 'Selection canceled' }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to select data path'
    }
  }
}

/**
 * Select screenshot path
 */
async function selectScreenshotPathHandler(): Promise<any> {
  try {
    const path = await settingsService.selectScreenshotPath()
    if (path) {
      return { success: true, data: path }
    }
    return { success: false, error: 'Selection canceled' }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to select screenshot path'
    }
  }
}

/**
 * Open data folder
 */
async function openDataFolderHandler(): Promise<any> {
  try {
    settingsService.openDataFolder()
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to open data folder'
    }
  }
}

/**
 * Open logs folder
 */
async function openLogsFolderHandler(): Promise<any> {
  try {
    const logsDir = join(app.getPath('userData'), 'logs')
    shell.openPath(logsDir)
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to open logs folder'
    }
  }
}

/**
 * Calculate storage size
 */
async function calculateStorageSizeHandler(): Promise<any> {
  try {
    const size = await settingsService.calculateStorageSize()
    return { success: true, data: size }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to calculate storage size'
    }
  }
}

/**
 * Get system paths
 */
async function getPathsHandler(): Promise<any> {
  try {
    const paths = settingsService.getPaths()
    return { success: true, data: paths }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get paths'
    }
  }
}

/**
 * Reset settings to default
 */
async function resetSettingsHandler(): Promise<any> {
  try {
    const settings = settingsService.resetSettings()
    return { success: true, data: settings }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to reset settings'
    }
  }
}

/**
 * Export settings
 */
async function exportSettingsHandler(): Promise<any> {
  try {
    const settings = settingsService.exportSettings()
    return { success: true, data: settings }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to export settings'
    }
  }
}

/**
 * Import settings
 */
async function importSettingsHandler(_event: any, jsonString: string): Promise<any> {
  try {
    const result = settingsService.importSettings(jsonString)
    return result
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to import settings'
    }
  }
}

/**
 * Register settings IPC handlers
 */
export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', getSettingsHandler)
  ipcMain.handle('settings:set', setSettingsHandler)
  ipcMain.handle('settings:getSetting', getSettingHandler)
  ipcMain.handle('settings:selectDataPath', selectDataPathHandler)
  ipcMain.handle('settings:selectScreenshotPath', selectScreenshotPathHandler)
  ipcMain.handle('settings:openDataFolder', openDataFolderHandler)
  ipcMain.handle('settings:openLogsFolder', openLogsFolderHandler)
  ipcMain.handle('settings:calculateStorageSize', calculateStorageSizeHandler)
  ipcMain.handle('settings:getPaths', getPathsHandler)
  ipcMain.handle('settings:reset', resetSettingsHandler)
  ipcMain.handle('settings:export', exportSettingsHandler)
  ipcMain.handle('settings:import', importSettingsHandler)

  console.log('Settings IPC handlers registered successfully')
}
