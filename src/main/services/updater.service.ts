import { autoUpdater } from 'electron-updater'
import { BrowserWindow, app } from 'electron'
import { EventEmitter } from 'events'

/**
 * Auto Update Service
 * Manages application auto-updates using electron-updater
 */

export interface UpdateInfo {
  version: string
  releaseDate: string
  files: Array<{
    url: string
    sha512: string
    size: number
  }>
  path?: string
  sha512?: string
}

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'installing' | 'error'

export class UpdaterService extends EventEmitter {
  private mainWindow: BrowserWindow | null = null
  private status: UpdateStatus = 'idle'
  private updateInfo: UpdateInfo | null = null
  private downloadProgress: number = 0

  constructor() {
    super()
    this.configureAutoUpdater()
  }

  /**
   * Set the main window for sending events
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /**
   * Configure auto updater settings
   */
  private configureAutoUpdater(): void {
    // Configure auto updater
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    // Set update check URL (will be configured in electron-builder)
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'your-username',
      repo: 'study-aid'
    })

    // Event handlers
    autoUpdater.on('checking-for-update', () => {
      this.status = 'checking'
      this.emit('status-change', 'checking')
      this.sendToRenderer('update-status', { status: 'checking' })
    })

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.status = 'available'
      this.updateInfo = info
      this.emit('status-change', 'available', info)
      this.sendToRenderer('update-available', { info })
    })

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      this.status = 'not-available'
      this.emit('status-change', 'not-available', info)
      this.sendToRenderer('update-not-available', { info })
    })

    autoUpdater.on('download-progress', (progress) => {
      this.status = 'downloading'
      this.downloadProgress = progress.percent || 0
      this.emit('download-progress', progress)
      this.sendToRenderer('update-download-progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond
      })
    })

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.status = 'downloaded'
      this.updateInfo = info
      this.emit('status-change', 'downloaded', info)
      this.sendToRenderer('update-downloaded', { info })
    })

    autoUpdater.on('error', (error: Error) => {
      this.status = 'error'
      this.emit('error', error)
      this.sendToRenderer('update-error', { error: error.message })
    })
  }

  /**
   * Send event to renderer process
   */
  private sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      const result = await autoUpdater.checkForUpdates()
      if (result && result.downloadPromise) {
        await result.downloadPromise
      }
      return this.updateInfo
    } catch (error: any) {
      console.error('Update check failed:', error)
      throw error
    }
  }

  /**
   * Download update manually
   */
  async downloadUpdate(): Promise<void> {
    try {
      await autoUpdater.downloadUpdate()
    } catch (error: any) {
      console.error('Update download failed:', error)
      throw error
    }
  }

  /**
   * Install update and restart app
   */
  installAndRestart(): void {
    setImmediate(() => {
      autoUpdater.quitAndInstall()
      app.exit(0)
    })
  }

  /**
   * Get current status
   */
  getStatus(): UpdateStatus {
    return this.status
  }

  /**
   * Get update info
   */
  getUpdateInfo(): UpdateInfo | null {
    return this.updateInfo
  }

  /**
   * Get download progress
   */
  getDownloadProgress(): number {
    return this.downloadProgress
  }

  /**
   * Enable automatic update checks on startup
   */
  enableAutoCheck(interval: number = 3600000): void {
    // Check for updates on startup
    app.on('ready', () => {
      this.checkForUpdates().catch(error => {
        console.error('Auto update check failed:', error)
      })
    })

    // Set up interval for periodic checks
    setInterval(() => {
      if (this.status === 'idle' || this.status === 'not-available') {
        this.checkForUpdates().catch(error => {
          console.error('Periodic update check failed:', error)
        })
      }
    }, interval)
  }

  /**
   * Disable automatic update checks
   */
  disableAutoCheck(): void {
    // Clear any intervals
    // (In a real implementation, you'd want to store the interval ID)
  }
}

// Singleton instance
let updaterServiceInstance: UpdaterService | null = null

export function getUpdaterService(): UpdaterService {
  if (!updaterServiceInstance) {
    updaterServiceInstance = new UpdaterService()
  }
  return updaterServiceInstance
}
