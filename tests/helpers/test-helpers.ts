/**
 * Test Helpers
 * Common utility functions for testing
 */

/**
 * Create a mock Note object
 */
export function createMockNote(overrides = {}) {
  return {
    id: 'test-note-1',
    title: 'Test Note',
    content: 'This is a test note content',
    tags: ['test', 'mock'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  }
}

/**
 * Create a mock Document object
 */
export function createMockDocument(overrides = {}) {
  return {
    name: 'test-document.pdf',
    type: 'pdf',
    content: 'Test document content',
    pages: 5,
    wordCount: 1000,
    ...overrides
  }
}

/**
 * Create a mock Settings object
 */
export function createMockSettings(overrides = {}) {
  return {
    theme: 'light',
    shortcuts: {
      screenshot: 'CommandOrControl+Shift+S',
      voiceRecord: 'CommandOrControl+Shift+V'
    },
    ai: {
      speech: {
        provider: 'xunfei',
        apiKey: 'test-key',
        appId: 'test-app-id'
      },
      image: {
        provider: 'qwen',
        apiKey: 'test-key',
        secretKey: 'test-secret'
      },
      content: {
        provider: 'deepseek',
        apiKey: 'test-key',
        baseUrl: ''
      }
    },
    storage: {
      dataPath: '/tmp/data',
      screenshotPath: '/tmp/screenshots'
    },
    ...overrides
  }
}

/**
 * Create a mock IPC response
 */
export function createMockIPCResponse<T>(data: T, success = true) {
  return {
    success,
    data,
    error: success ? undefined : 'Test error'
  }
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error(`Condition not met within ${timeout}ms`)
}

/**
 * Create a delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Mock electronAPI for renderer tests
 */
export function mockElectronAPI() {
  return {
    ping: vi.fn().mockResolvedValue('pong'),
    note: {
      create: vi.fn().mockResolvedValue({ success: true, data: createMockNote() }),
      update: vi.fn().mockResolvedValue({ success: true }),
      delete: vi.fn().mockResolvedValue({ success: true }),
      getAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
      getById: vi.fn().mockResolvedValue({ success: true, data: createMockNote() }),
      search: vi.fn().mockResolvedValue({ success: true, data: [] })
    },
    screenshot: {
      getScreenSources: vi.fn().mockResolvedValue({ success: true, data: [] }),
      captureFullScreen: vi.fn().mockResolvedValue({ success: true, data: { dataUrl: 'data:image/png;base64,abc' } }),
      captureScreenById: vi.fn().mockResolvedValue({ success: true, data: { dataUrl: 'data:image/png;base64,abc' } }),
      registerShortcut: vi.fn().mockResolvedValue({ success: true }),
      unregisterShortcut: vi.fn().mockResolvedValue({ success: true })
    },
    document: {
      parse: vi.fn().mockResolvedValue({ success: true, data: { content: 'Test content' } }),
      parseFromPath: vi.fn().mockResolvedValue({ success: true, data: { content: 'Test content' } })
    },
    settings: {
      get: vi.fn().mockResolvedValue({ success: true, data: createMockSettings() }),
      set: vi.fn().mockResolvedValue({ success: true }),
      getPaths: vi.fn().mockResolvedValue({ success: true, data: { userData: '/tmp' } })
    },
    aiContent: {
      initialize: vi.fn().mockResolvedValue({ success: true }),
      generateKnowledgeTree: vi.fn().mockResolvedValue({
        success: true,
        data: { title: 'Test Tree', structure: [] }
      }),
      extractKeyPoints: vi.fn().mockResolvedValue({
        success: true,
        data: { keyPoints: [] }
      })
    },
    speechRecognition: {
      initialize: vi.fn().mockResolvedValue({ success: true }),
      connect: vi.fn().mockResolvedValue({ success: true }),
      start: vi.fn().mockResolvedValue({ success: true }),
      stop: vi.fn().mockResolvedValue({ success: true }),
      getStatus: vi.fn().mockResolvedValue({ success: true, data: 'idle' })
    },
    imageRecognition: {
      initialize: vi.fn().mockResolvedValue({ success: true }),
      recognize: vi.fn().mockResolvedValue({
        success: true,
        data: {
          ocr: { success: true, text: 'Test OCR' },
          understanding: { success: true, description: 'Test description' }
        }
      })
    }
  }
}

/**
 * Clean up mocks
 */
export function cleanupMocks() {
  vi.clearAllMocks()
}
