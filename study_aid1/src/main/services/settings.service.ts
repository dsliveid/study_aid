import { app, dialog, shell } from 'electron'
import fs from 'fs'
import path from 'path'

/**
 * Settings Service
 * Manages application settings including storage paths
 */
export class SettingsService {
  private settings: any = {}
  private settingsFilePath: string

  constructor() {
    this.settingsFilePath = path.join(app.getPath('userData'), 'settings.json')
    this.loadSettings()
  }

  /**
   * Load settings from file
   */
  private loadSettings(): void {
    try {
      if (fs.existsSync(this.settingsFilePath)) {
        const data = fs.readFileSync(this.settingsFilePath, 'utf-8')
        this.settings = JSON.parse(data)
      } else {
        this.settings = this.getDefaultSettings()
        this.saveSettings()
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      this.settings = this.getDefaultSettings()
    }
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): any {
    const userDataPath = app.getPath('userData')
    return {
      theme: 'auto',
      shortcuts: {
        screenshot: 'CommandOrControl+Shift+S',
        voiceRecord: 'CommandOrControl+Shift+V'
      },
      ai: {
        speech: {
          provider: 'xunfei',
          apiKey: '',
          appId: '',
          apiSecret: ''
        },
        image: {
          provider: 'qwen',
          apiKey: '',
          secretKey: ''
        },
        content: {
          provider: 'deepseek',
          apiKey: '',
          baseUrl: ''
        }
      },
      storage: {
        dataPath: userDataPath,
        screenshotPath: path.join(userDataPath, 'screenshots')
      }
    }
  }

  /**
   * Save settings to file
   */
  private saveSettings(): void {
    try {
      const dir = path.dirname(this.settingsFilePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.settingsFilePath, JSON.stringify(this.settings, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    }
  }

  /**
   * Get all settings
   */
  getAllSettings(): any {
    return { ...this.settings }
  }

  /**
   * Get settings by key path
   */
  getSetting(keyPath: string): any {
    const keys = keyPath.split('.')
    let value = this.settings
    for (const key of keys) {
      value = value?.[key]
    }
    return value
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: any): any {
    this.settings = { ...this.settings, ...newSettings }
    this.saveSettings()
    return { ...this.settings }
  }

  /**
   * Select data path dialog
   */
  async selectDataPath(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      title: '选择数据存储路径',
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const selectedPath = result.filePaths[0]

    // Update settings
    this.settings.storage = {
      ...this.settings.storage,
      dataPath: selectedPath
    }
    this.saveSettings()

    return selectedPath
  }

  /**
   * Select screenshot path dialog
   */
  async selectScreenshotPath(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      title: '选择截图保存路径',
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const selectedPath = result.filePaths[0]

    // Update settings
    this.settings.storage = {
      ...this.settings.storage,
      screenshotPath: selectedPath
    }
    this.saveSettings()

    return selectedPath
  }

  /**
   * Open data folder in file explorer
   */
  openDataFolder(): void {
    const dataPath = this.settings.storage?.dataPath || app.getPath('userData')
    shell.openPath(dataPath)
  }

  /**
   * Calculate storage size
   */
  async calculateStorageSize(): Promise<string> {
    const dataPath = this.settings.storage?.dataPath || app.getPath('userData')

    try {
      const getSize = (dirPath: string): number => {
        let totalSize = 0

        if (!fs.existsSync(dirPath)) {
          return totalSize
        }

        const files = fs.readdirSync(dirPath)

        for (const file of files) {
          const filePath = path.join(dirPath, file)
          const stats = fs.statSync(filePath)

          if (stats.isDirectory()) {
            totalSize += getSize(filePath)
          } else {
            totalSize += stats.size
          }
        }

        return totalSize
      }

      const sizeInBytes = getSize(dataPath)

      // Convert to human readable format
      const units = ['B', 'KB', 'MB', 'GB']
      let size = sizeInBytes
      let unitIndex = 0

      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
      }

      return `约 ${size.toFixed(2)} ${units[unitIndex]}`
    } catch (error) {
      console.error('Failed to calculate storage size:', error)
      return '未知'
    }
  }

  /**
   * Get system paths
   */
  getPaths(): any {
    return {
      userData: app.getPath('userData'),
      documents: app.getPath('documents'),
      pictures: app.getPath('pictures'),
      downloads: app.getPath('downloads')
    }
  }

  /**
   * Reset settings to default
   */
  resetSettings(): any {
    this.settings = this.getDefaultSettings()
    this.saveSettings()
    return { ...this.settings }
  }

  /**
   * Export settings
   */
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2)
  }

  /**
   * Import settings
   */
  importSettings(jsonString: string): any {
    try {
      const imported = JSON.parse(jsonString)
      this.settings = { ...this.getDefaultSettings(), ...imported }
      this.saveSettings()
      return { success: true, settings: this.settings }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to import settings'
      }
    }
  }
}

// Singleton instance
let settingsServiceInstance: SettingsService | null = null

export function getSettingsService(): SettingsService {
  if (!settingsServiceInstance) {
    settingsServiceInstance = new SettingsService()
  }
  return settingsServiceInstance
}
