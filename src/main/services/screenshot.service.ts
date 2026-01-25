import { ipcMain, BrowserWindow, globalShortcut, desktopCapturer, screen } from 'electron'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { promisify } from 'util'
import { exec } from 'child_process'

const execAsync = promisify(exec)

/**
 * Screenshot data interface
 */
export interface ScreenshotData {
  id: string
  dataUrl: string // Base64 encoded image
  timestamp: number
  path?: string // Local file path if saved
}

export interface ScreenshotSource {
  id: string
  name: string
  thumbnail: string // Base64 encoded thumbnail
}

export interface Region {
  x: number
  y: number
  width: number
  height: number
}

export interface Annotation {
  type: 'rect' | 'arrow' | 'text' | 'pen'
  data: any
  color: string
  size: number
}

/**
 * Screenshot Service Class
 */
export class ScreenshotService {
  private screenshotWindow: BrowserWindow | null = null
  private screenshots: Map<string, ScreenshotData> = new Map()

  /**
   * Capture full screen using desktopCapturer
   */
  async captureFullScreen(): Promise<ScreenshotData> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      })

      if (sources.length === 0) {
        throw new Error('未找到可用的屏幕')
      }

      // Get the primary screen (usually the first one)
      const primaryScreen = sources[0]
      const dataUrl = primaryScreen.thumbnail.toDataURL()

      const screenshot: ScreenshotData = {
        id: this.generateId(),
        dataUrl,
        timestamp: Date.now()
      }

      this.screenshots.set(screenshot.id, screenshot)
      return screenshot
    } catch (error) {
      console.error('Failed to capture full screen:', error)
      throw new Error(`全屏截图失败: ${error.message}`)
    }
  }

  /**
   * Capture specific screen by ID
   */
  async captureScreenById(screenId: string): Promise<ScreenshotData> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      })

      const screen = sources.find(s => s.id === screenId)
      if (!screen) {
        throw new Error(`找不到指定的屏幕: ${screenId}`)
      }

      const dataUrl = screen.thumbnail.toDataURL()

      const screenshot: ScreenshotData = {
        id: this.generateId(),
        dataUrl,
        timestamp: Date.now()
      }

      this.screenshots.set(screenshot.id, screenshot)
      return screenshot
    } catch (error) {
      console.error('Failed to capture screen:', error)
      throw new Error(`截屏失败: ${error.message}`)
    }
  }

  /**
   * Get all available screen sources
   */
  async getScreenSources(): Promise<ScreenshotSource[]> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 300, height: 200 }
      })

      return sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL()
      }))
    } catch (error) {
      console.error('Failed to get screen sources:', error)
      throw new Error(`获取屏幕源失败: ${error.message}`)
    }
  }

  /**
   * Open screenshot selection window for region capture
   */
  async openRegionSelector(): Promise<ScreenshotData | null> {
    return new Promise((resolve, reject) => {
      try {
        // Create a transparent fullscreen window for selection
        const { width, height } = screen.getPrimaryDisplay().workAreaSize

        this.screenshotWindow = new BrowserWindow({
          width,
          height,
          x: 0,
          y: 0,
          frame: false,
          transparent: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          resizable: false,
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
          }
        })

        // Load the screenshot selector HTML
        this.screenshotWindow.loadFile(join(__dirname, '../../../renderer/screenshot-selector.html'))

        // Handle screenshot result
        this.screenshotWindow.webContents.on('ipc-message', (event, channel, data) => {
          if (channel === 'screenshot-selected') {
            const screenshot: ScreenshotData = {
              id: this.generateId(),
              dataUrl: data.dataUrl,
              timestamp: Date.now()
            }
            this.screenshots.set(screenshot.id, screenshot)
            this.closeSelectorWindow()
            resolve(screenshot)
          } else if (channel === 'screenshot-cancelled') {
            this.closeSelectorWindow()
            resolve(null)
          }
        })

        this.screenshotWindow.on('closed', () => {
          this.screenshotWindow = null
          // If cancelled without explicit message
          resolve(null)
        })
      } catch (error) {
        console.error('Failed to open region selector:', error)
        reject(error)
      }
    })
  }

  /**
   * Close the screenshot selection window
   */
  closeSelectorWindow(): void {
    if (this.screenshotWindow && !this.screenshotWindow.isDestroyed()) {
      this.screenshotWindow.close()
      this.screenshotWindow = null
    }
  }

  /**
   * Save screenshot to local file
   */
  async saveScreenshot(screenshotId: string, filename?: string): Promise<string> {
    const screenshot = this.screenshots.get(screenshotId)
    if (!screenshot) {
      throw new Error('截图不存在')
    }

    const userDataPath = app.getPath('userData')
    const screenshotsDir = join(userDataPath, 'screenshots')

    // Create filename if not provided
    const finalFilename = filename || `screenshot_${Date.now()}.png`
    const filePath = join(screenshotsDir, finalFilename)

    // Convert data URL to buffer
    const base64Data = screenshot.dataUrl.replace(/^data:image\/png;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Write file
    writeFileSync(filePath, buffer)

    // Update screenshot with file path
    screenshot.path = filePath

    return filePath
  }

  /**
   * Delete screenshot from memory and optionally from disk
   */
  async deleteScreenshot(screenshotId: string, deleteFile = false): Promise<void> {
    const screenshot = this.screenshots.get(screenshotId)
    if (!screenshot) {
      throw new Error('截图不存在')
    }

    // Delete from disk if requested and file exists
    if (deleteFile && screenshot.path) {
      try {
        unlinkSync(screenshot.path)
      } catch (error) {
        console.warn('Failed to delete screenshot file:', error)
      }
    }

    // Remove from memory
    this.screenshots.delete(screenshotId)
  }

  /**
   * Get screenshot by ID
   */
  getScreenshot(screenshotId: string): ScreenshotData | null {
    return this.screenshots.get(screenshotId) || null
  }

  /**
   * Get all screenshots
   */
  getAllScreenshots(): ScreenshotData[] {
    return Array.from(this.screenshots.values()).sort(
      (a, b) => b.timestamp - a.timestamp
    )
  }

  /**
   * Register global shortcut for screenshot
   */
  registerShortcut(accelerator: string, callback: () => void): boolean {
    return globalShortcut.register(accelerator, callback)
  }

  /**
   * Unregister global shortcut
   */
  unregisterShortcut(accelerator: string): void {
    globalShortcut.unregister(accelerator)
  }

  /**
   * Unregister all shortcuts
   */
  unregisterAllShortcuts(): void {
    globalShortcut.unregisterAll()
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Singleton instance
let screenshotServiceInstance: ScreenshotService | null = null

/**
 * Get screenshot service singleton instance
 */
export function getScreenshotService(): ScreenshotService {
  if (!screenshotServiceInstance) {
    screenshotServiceInstance = new ScreenshotService()
  }
  return screenshotServiceInstance
}
