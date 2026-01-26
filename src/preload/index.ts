import { contextBridge, ipcRenderer } from 'electron'

/**
 * Expose protected methods that allow the renderer process to use
 * the ipcRenderer without exposing the entire object
 */

const electronAPI = {
  // App operations
  ping: () => ipcRenderer.invoke('app:ping'),

  // Note operations
  note: {
    create: (data: { title: string; content: string }) =>
      ipcRenderer.invoke('note:create', data),
    update: (data: { id: string; title?: string; content?: string }) =>
      ipcRenderer.invoke('note:update', data),
    delete: (id: string) =>
      ipcRenderer.invoke('note:delete', id),
    getAll: () =>
      ipcRenderer.invoke('note:getAll'),
    getById: (id: string) =>
      ipcRenderer.invoke('note:getById', id),
    search: (keyword: string) =>
      ipcRenderer.invoke('note:search', keyword)
  },

  // Screenshot operations
  screenshot: {
    getSources: () =>
      ipcRenderer.invoke('screenshot:getSources'),
    getScreenSources: () =>
      ipcRenderer.invoke('screenshot:getScreenSources'),
    captureFullScreen: () =>
      ipcRenderer.invoke('screenshot:captureFullScreen'),
    captureScreenById: (screenId: string) =>
      ipcRenderer.invoke('screenshot:captureScreenById', screenId),
    openRegionSelector: () =>
      ipcRenderer.invoke('screenshot:openRegionSelector'),
    getDesktopCapture: () =>
      ipcRenderer.invoke('screenshot:getDesktopCapture'),
    save: (data: { screenshotId: string; filename?: string }) =>
      ipcRenderer.invoke('screenshot:save', data),
    delete: (data: { screenshotId: string; deleteFile?: boolean }) =>
      ipcRenderer.invoke('screenshot:delete', data),
    get: (screenshotId: string) =>
      ipcRenderer.invoke('screenshot:get', screenshotId),
    getAll: () =>
      ipcRenderer.invoke('screenshot:getAll'),
    registerShortcut: (accelerator: string) =>
      ipcRenderer.invoke('screenshot:registerShortcut', accelerator),
    unregisterShortcut: (accelerator: string) =>
      ipcRenderer.invoke('screenshot:unregisterShortcut', accelerator)
  },

  // Document operations
  document: {
    parse: (buffer: Buffer, fileType: 'pdf' | 'docx' | 'txt') =>
      ipcRenderer.invoke('document:parse', buffer, fileType),
    detectFileType: (filename: string) =>
      ipcRenderer.invoke('document:detectFileType', filename),
    getStats: (document: { text: string; pages?: number }) =>
      ipcRenderer.invoke('document:getStats', document),
    parseFromPath: (filePath: string) =>
      ipcRenderer.invoke('document:parseFromPath', filePath)
  },

  // Settings operations
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings: any) => ipcRenderer.invoke('settings:set', settings),
    getSetting: (keyPath: string) => ipcRenderer.invoke('settings:getSetting', keyPath),
    selectDataPath: () => ipcRenderer.invoke('settings:selectDataPath'),
    selectScreenshotPath: () => ipcRenderer.invoke('settings:selectScreenshotPath'),
    openDataFolder: () => ipcRenderer.invoke('settings:openDataFolder'),
    openLogsFolder: () => ipcRenderer.invoke('settings:openLogsFolder'),
    calculateStorageSize: () => ipcRenderer.invoke('settings:calculateStorageSize'),
    getPaths: () => ipcRenderer.invoke('settings:getPaths'),
    reset: () => ipcRenderer.invoke('settings:reset'),
    export: () => ipcRenderer.invoke('settings:export'),
    import: (jsonString: string) => ipcRenderer.invoke('settings:import', jsonString)
  },

  // AI Content operations
  aiContent: {
    initialize: (config: { apiKey: string; baseUrl?: string; model?: string }) =>
      ipcRenderer.invoke('ai-content:initialize', config),
    generateKnowledgeTree: (content: string) =>
      ipcRenderer.invoke('ai-content:generateKnowledgeTree', content),
    extractKeyPoints: (content: string) =>
      ipcRenderer.invoke('ai-content:extractKeyPoints', content),
    annotateDifficultPoints: (content: string) =>
      ipcRenderer.invoke('ai-content:annotateDifficultPoints', content),
    updateConfig: (config: { apiKey?: string; baseUrl?: string; model?: string }) =>
      ipcRenderer.invoke('ai-content:updateConfig', config),
    getConfig: () =>
      ipcRenderer.invoke('ai-content:getConfig'),
    test: (config: { apiKey: string; baseUrl?: string; model?: string }) =>
      ipcRenderer.invoke('ai-content:test', config)
  },

  // Speech Recognition operations
  speechRecognition: {
    initialize: (config: { apiKey: string; appId: string; apiSecret?: string }) =>
      ipcRenderer.invoke('speech-recognition:initialize', config),
    connect: () =>
      ipcRenderer.invoke('speech-recognition:connect'),
    start: () =>
      ipcRenderer.invoke('speech-recognition:start'),
    stop: () =>
      ipcRenderer.invoke('speech-recognition:stop'),
    sendAudio: (audioBuffer: Buffer) =>
      ipcRenderer.invoke('speech-recognition:sendAudio', audioBuffer),
    getStatus: () =>
      ipcRenderer.invoke('speech-recognition:getStatus'),
    disconnect: () =>
      ipcRenderer.invoke('speech-recognition:disconnect'),
    getResults: () =>
      ipcRenderer.invoke('speech-recognition:getResults'),
    clearResults: () =>
      ipcRenderer.invoke('speech-recognition:clearResults'),
    test: (config: { apiKey: string; appId: string; apiSecret?: string }) =>
      ipcRenderer.invoke('speech-recognition:test', config),
    onStatusChange: (callback: (status: string) => void) =>
      ipcRenderer.on('speech-recognition:statusChange', (_, data) => callback(data.status)),
    onResult: (callback: (result: any) => void) =>
      ipcRenderer.on('speech-recognition:result', (_, result) => callback(result)),
    onFinalResult: (callback: (result: any) => void) =>
      ipcRenderer.on('speech-recognition:finalResult', (_, result) => callback(result)),
    onError: (callback: (error: any) => void) =>
      ipcRenderer.on('speech-recognition:error', (_, error) => callback(error)),
    onConnected: (callback: () => void) =>
      ipcRenderer.on('speech-recognition:connected', () => callback()),
    onDisconnected: (callback: () => void) =>
      ipcRenderer.on('speech-recognition:disconnected', () => callback()),
    onRecognitionStarted: (callback: () => void) =>
      ipcRenderer.on('speech-recognition:started', () => callback()),
    onRecognitionStopped: (callback: () => void) =>
      ipcRenderer.on('speech-recognition:stopped', () => callback())
  },

  // Image Recognition operations
  imageRecognition: {
    initialize: (config: {
      ocr?: {
        provider: 'baidu' | 'tencent' | 'qwen'
        baidu?: { apiKey: string; secretKey: string }
      }
      vision?: {
        provider: 'qwen' | 'openai'
        qwen?: { apiKey: string; model: 'qwen-vl-plus' | 'qwen-vl-max' }
      }
    }) =>
      ipcRenderer.invoke('image-recognition:initialize', config),
    updateConfig: (config: {
      ocr?: {
        provider: 'baidu' | 'tencent' | 'qwen'
        baidu?: { apiKey: string; secretKey: string }
      }
      vision?: {
        provider: 'qwen' | 'openai'
        qwen?: { apiKey: string; model: 'qwen-vl-plus' | 'qwen-vl-max' }
      }
    }) =>
      ipcRenderer.invoke('image-recognition:updateConfig', config),
    recognizeText: (imageData: Buffer) =>
      ipcRenderer.invoke('image-recognition:recognizeText', imageData),
    understandImage: (imageData: Buffer, prompt?: string) =>
      ipcRenderer.invoke('image-recognition:understandImage', imageData, prompt),
    recognize: (imageData: Buffer, options?: {
      enableOCR?: boolean
      enableUnderstanding?: boolean
      understandingPrompt?: string
    }) =>
      ipcRenderer.invoke('image-recognition:recognize', imageData, options),
    test: (config: {
      ocr?: {
        provider: 'baidu' | 'tencent' | 'qwen'
        baidu?: { apiKey: string; secretKey: string }
      }
      vision?: {
        provider: 'qwen' | 'openai'
        qwen?: { apiKey: string; model: 'qwen-vl-plus' | 'qwen-vl-max' }
      }
    }) =>
      ipcRenderer.invoke('image-recognition:test', config)
  },

  // Event listeners can be added here
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args))
  },

  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  },

  // Updater operations
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
    downloadUpdate: () => ipcRenderer.invoke('updater:downloadUpdate'),
    installAndRestart: () => ipcRenderer.invoke('updater:installAndRestart'),
    getStatus: () => ipcRenderer.invoke('updater:getStatus'),
    onStatusChange: (callback: (data: any) => void) =>
      ipcRenderer.on('updater:status-change', (_, data) => callback(data)),
    onDownloadProgress: (callback: (progress: any) => void) =>
      ipcRenderer.on('updater:download-progress', (_, progress) => callback(progress)),
    onError: (callback: (error: any) => void) =>
      ipcRenderer.on('updater:error', (_, error) => callback(error))
  }
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type definitions for the exposed API
export type ElectronAPI = typeof electronAPI

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
