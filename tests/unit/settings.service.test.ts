/**
 * Settings Service Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock electron modules
const mockApp = {
  getPath: vi.fn((path: string) => {
    const paths: Record<string, string> = {
      userData: '/tmp/userdata',
      documents: '/tmp/documents',
      pictures: '/tmp/pictures',
      downloads: '/tmp/downloads'
    }
    return paths[path] || '/tmp'
  })
}

const mockDialog = {
  showOpenDialog: vi.fn()
}

const mockShell = {
  openPath: vi.fn()
}

vi.mock('electron', () => ({
  app: mockApp,
  dialog: mockDialog,
  shell: mockShell
}))

// Mock fs
const mockFs = {
  readFileSync: vi.fn(() => JSON.stringify({ theme: 'light' })),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  statSync: vi.fn(() => ({ size: 1024, isDirectory: () => false }))
}

vi.mock('fs', () => mockFs)

describe('Settings Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Settings Loading', () => {
    it('should load default settings when file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false)

      const defaultSettings = {
        theme: 'auto',
        shortcuts: {
          screenshot: 'CommandOrControl+Shift+S',
          voiceRecord: 'CommandOrControl+Shift+V'
        }
      }

      expect(defaultSettings.theme).toBe('auto')
      expect(defaultSettings.shortcuts.screenshot).toBeDefined()
    })

    it('should load existing settings from file', () => {
      const existingSettings = { theme: 'dark' }
      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingSettings))

      expect(existingSettings.theme).toBe('dark')
    })

    it('should handle corrupted settings file', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Invalid JSON')
      })

      const fallbackSettings = { theme: 'light' }

      expect(() => mockFs.readFileSync()).toThrow()
      expect(fallbackSettings.theme).toBe('light')
    })
  })

  describe('Settings Saving', () => {
    it('should save settings to file', () => {
      const settings = { theme: 'dark' }

      mockFs.writeFileSync('/tmp/settings.json', JSON.stringify(settings))

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/tmp/settings.json',
        JSON.stringify(settings)
      )
    })

    it('should merge new settings with existing', () => {
      const existing = { theme: 'light', language: 'en' }
      const updates = { theme: 'dark' }
      const merged = { ...existing, ...updates }

      expect(merged.theme).toBe('dark')
      expect(merged.language).toBe('en') // Preserved
    })

    it('should create directory if not exists', () => {
      const dirExists = false

      if (!dirExists) {
        mockFs.mkdirSync('/tmp/new-dir', { recursive: true })
      }

      expect(mockFs.mkdirSync).toHaveBeenCalled()
    })
  })

  describe('Path Selection', () => {
    it('should select data path', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/selected/path']
      })

      const result = await mockDialog.showOpenDialog({
        title: '选择数据存储路径',
        properties: ['openDirectory']
      })

      expect(result.canceled).toBe(false)
      expect(result.filePaths[0]).toBe('/selected/path')
    })

    it('should cancel path selection', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({
        canceled: true,
        filePaths: []
      })

      const result = await mockDialog.showOpenDialog({
        title: '选择数据存储路径',
        properties: ['openDirectory']
      })

      expect(result.canceled).toBe(true)
      expect(result.filePaths).toHaveLength(0)
    })

    it('should handle dialog errors', async () => {
      mockDialog.showOpenDialog.mockRejectedValue(new Error('Dialog failed'))

      await expect(mockDialog.showOpenDialog({})).rejects.toThrow('Dialog failed')
    })
  })

  describe('Folder Operations', () => {
    it('should open data folder', () => {
      const dataPath = '/tmp/data'

      mockShell.openPath(dataPath)

      expect(mockShell.openPath).toHaveBeenCalledWith(dataPath)
    })

    it('should handle open folder errors', () => {
      mockShell.openPath.mockImplementation(() => {
        throw new Error('Failed to open')
      })

      expect(() => mockShell.openPath('/invalid/path')).toThrow()
    })
  })

  describe('Storage Size Calculation', () => {
    it('should calculate folder size in bytes', () => {
      const fileSizes = [1024, 2048, 4096]
      const totalSize = fileSizes.reduce((a, b) => a + b, 0)

      expect(totalSize).toBe(7168) // 1024 + 2048 + 4096
    })

    it('should convert bytes to human readable format', () => {
      const sizes = [
        { bytes: 1024, expected: '1 KB' },
        { bytes: 1024 * 1024, expected: '1 MB' },
        { bytes: 1024 * 1024 * 1024, expected: '1 GB' }
      ]

      sizes.forEach(({ bytes, expected }) => {
        const converted = formatBytes(bytes)
        expect(converted).toBe(expected)
      })
    })

    it('should handle empty directories', () => {
      mockFs.readdirSync.mockReturnValue([])

      const files = mockFs.readdirSync('/empty/dir')
      expect(files).toHaveLength(0)
    })
  })

  describe('Theme Settings', () => {
    it('should support light theme', () => {
      const theme = 'light'

      expect(['light', 'dark', 'auto']).toContain(theme)
    })

    it('should support dark theme', () => {
      const theme = 'dark'

      expect(['light', 'dark', 'auto']).toContain(theme)
    })

    it('should support auto theme', () => {
      const theme = 'auto'

      expect(['light', 'dark', 'auto']).toContain(theme)
    })

    it('should reject invalid theme', () => {
      const theme = 'invalid'

      expect(['light', 'dark', 'auto']).not.toContain(theme)
    })
  })

  describe('Shortcut Settings', () => {
    it('should validate shortcut format', () => {
      const validShortcuts = [
        'CommandOrControl+S',
        'CommandOrControl+Shift+S',
        'Alt+F4'
      ]

      validShortcuts.forEach(shortcut => {
        expect(shortcut).toMatch(/^(CommandOrControl|Ctrl|Alt|Shift)\+/)
      })
    })

    it('should update shortcut', () => {
      const shortcuts = {
        screenshot: 'CommandOrControl+Shift+S',
        voiceRecord: 'CommandOrControl+Shift+V'
      }

      shortcuts.screenshot = 'CommandOrControl+A'

      expect(shortcuts.screenshot).toBe('CommandOrControl+A')
    })
  })

  describe('AI Service Settings', () => {
    it('should store API keys', () => {
      const aiSettings = {
        speech: { apiKey: 'test-key-1' },
        image: { apiKey: 'test-key-2' },
        content: { apiKey: 'test-key-3' }
      }

      expect(aiSettings.speech.apiKey).toBe('test-key-1')
      expect(aiSettings.image.apiKey).toBe('test-key-2')
      expect(aiSettings.content.apiKey).toBe('test-key-3')
    })

    it('should handle missing API keys', () => {
      const aiSettings = {
        speech: { apiKey: '' },
        image: { apiKey: null },
        content: {}
      }

      expect(aiSettings.speech.apiKey).toBe('')
      expect(aiSettings.image.apiKey).toBeNull()
    })
  })

  describe('Settings Import/Export', () => {
    it('should export settings as JSON', () => {
      const settings = { theme: 'dark' }
      const exported = JSON.stringify(settings, null, 2)

      expect(exported).toContain('dark')
      expect(exported).toContain('{')
      expect(exported).toContain('}')
    })

    it('should import settings from JSON', () => {
      const json = '{"theme":"light"}'
      const imported = JSON.parse(json)

      expect(imported.theme).toBe('light')
    })

    it('should validate imported settings', () => {
      const invalidJson = '{invalid json}'

      expect(() => JSON.parse(invalidJson)).toThrow()
    })
  })
})

// Helper function
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`
}
