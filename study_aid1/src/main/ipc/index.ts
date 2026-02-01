import { ipcMain, BrowserWindow } from 'electron'

/**
 * Register all IPC handlers
 */

// App handlers
ipcMain.handle('app:ping', async () => {
  return 'pong'
})

// Register feature handlers
import { registerNoteHandlers } from './handlers/note.handler'
import { registerScreenshotHandlers } from './handlers/screenshot.handler'
import { registerDocumentHandlers } from './handlers/document.handler'
import { registerAIContentHandlers } from './handlers/ai-content.handler'
import { registerSpeechRecognitionHandlers } from './handlers/speech-recognition.handler'
import { registerSettingsHandlers } from './handlers/settings.handler'
import { registerImageRecognitionHandlers } from './handlers/image-recognition.handler'
import { registerUpdaterHandlers } from './handlers/updater.handler'

/**
 * Initialize all IPC handlers
 */
export function registerIPCHandlers(mainWindow: BrowserWindow): void {
  registerNoteHandlers()
  registerScreenshotHandlers()
  registerDocumentHandlers()
  registerAIContentHandlers()
  registerSpeechRecognitionHandlers()
  registerSettingsHandlers()
  registerImageRecognitionHandlers()
  registerUpdaterHandlers(mainWindow)

  console.log('All IPC handlers registered successfully')
}

// Auto-register handlers that don't need BrowserWindow at module load time
// Note: Updater handler is registered separately in main/index.ts when window is ready
registerNoteHandlers()
registerScreenshotHandlers()
registerDocumentHandlers()
registerAIContentHandlers()
registerSpeechRecognitionHandlers()
registerSettingsHandlers()
registerImageRecognitionHandlers()

console.log('Basic IPC handlers registered successfully')
