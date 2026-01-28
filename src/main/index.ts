import { app, BrowserWindow } from 'electron'
import path from 'path'

// Initialize logger first to capture all logs
import { initLogger } from './utils/logger'
const logger = initLogger()

// Set console encoding to UTF-8 for better Chinese character support
if (process.stdout.isTTY) {
  process.stdout.setEncoding('utf-8')
}
if (process.stderr.isTTY) {
  process.stderr.setEncoding('utf-8')
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: true,
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    show: false,
    backgroundColor: '#f2f3f5'
  })

  // Load the app
  const devUrl = process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_RENDERER_URL
  if (devUrl) {
    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    // Clean up speech recognition service when window is closed
    // This prevents "Render frame was disposed" errors
    try {
      const { resetSpeechRecognitionService } = require('./services/speech-recognition.service')
      resetSpeechRecognitionService()
    } catch (error) {
      // Ignore errors during cleanup
    }

    mainWindow = null
  })
}

// App lifecycle
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Clean up logger before app quits
app.on('before-quit', () => {
  const { getLogger } = require('./utils/logger')
  getLogger().destroy()
})

// Import IPC handlers at the top level to register them
import './ipc'

export { mainWindow }
