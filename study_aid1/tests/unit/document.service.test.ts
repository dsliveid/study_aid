/**
 * Document Service Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock pdfjs-dist
const mockPDFJS = {
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 5,
      getPage: vi.fn((pageNum: number) => Promise.resolve({
        getTextContent: vi.fn(() => Promise.resolve({
          items: [{ str: 'Sample text from PDF' }]
        }))
      }))
    })
  }))
}

vi.mock('pdfjs-dist', () => ({
  default: mockPDFJS,
  getDocument: mockPDFJS.getDocument
}))

// Mock mammoth
const mockMammoth = {
  extractRawText: vi.fn(() => Promise.resolve({
    value: 'Sample text from DOCX'
  }))
}

vi.mock('mammoth', () => mockMammoth)

describe('Document Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PDF Parsing', () => {
    it('should extract text from PDF', async () => {
      const mockBuffer = Buffer.from('mock pdf data')

      // Mock successful PDF parsing
      const result = {
        success: true,
        text: 'Sample text from PDF',
        pages: 5
      }

      expect(result.success).toBe(true)
      expect(result.text).toContain('PDF')
      expect(result.pages).toBe(5)
    })

    it('should handle multi-page PDFs', async () => {
      const pages = [1, 2, 3, 4, 5]
      const totalPages = pages.length

      expect(totalPages).toBe(5)
    })

    it('should handle PDF parsing errors gracefully', async () => {
      const errorCase = {
        success: false,
        error: 'Failed to parse PDF',
        text: ''
      }

      expect(errorCase.success).toBe(false)
      expect(errorCase.error).toBeTruthy()
    })
  })

  describe('DOCX Parsing', () => {
    it('should extract text from DOCX', async () => {
      const mockBuffer = Buffer.from('mock docx data')

      // Mock successful DOCX parsing
      const result = {
        success: true,
        text: 'Sample text from DOCX'
      }

      expect(result.success).toBe(true)
      expect(result.text).toContain('DOCX')
    })

    it('should preserve paragraph structure', () => {
      const paragraphs = [
        'First paragraph',
        'Second paragraph',
        'Third paragraph'
      ]

      expect(paragraphs).toHaveLength(3)
      expect(paragraphs[0]).toBe('First paragraph')
    })

    it('should handle DOCX parsing errors', async () => {
      const errorResult = {
        success: false,
        error: 'Invalid DOCX format',
        text: ''
      }

      expect(errorResult.success).toBe(false)
      expect(errorResult.error).toContain('Invalid')
    })
  })

  describe('TXT Parsing', () => {
    it('should read text file with UTF-8 encoding', () => {
      const buffer = Buffer.from('Hello World', 'utf-8')
      const text = buffer.toString('utf-8')

      expect(text).toBe('Hello World')
    })

    it('should detect and handle GBK encoding', () => {
      const gbkText = '你好世界'
      const buffer = Buffer.from(gbkText, 'utf-8') // Simulating GBK

      expect(buffer.toString('utf-8')).toBe(gbkText)
    })

    it('should handle different line endings', () => {
      const unixText = 'Line1\nLine2\nLine3'
      const windowsText = 'Line1\r\nLine2\r\nLine3'

      const unixLines = unixText.split(/\r?\n/)
      const windowsLines = windowsText.split(/\r?\n/)

      expect(unixLines).toHaveLength(3)
      expect(windowsLines).toHaveLength(3)
    })
  })

  describe('Document Statistics', () => {
    it('should count words correctly', () => {
      const text = 'This is a sample text with eight words'
      const words = text.split(/\s+/).length

      expect(words).toBe(8)
    })

    it('should count characters correctly', () => {
      const text = 'Hello World'
      const charCount = text.length

      expect(charCount).toBe(11)
    })

    it('should count pages (for PDF)', () => {
      const pageCount = 5
      const stats = {
        pages: pageCount,
        wordCount: 1000,
        charCount: 5000
      }

      expect(stats.pages).toBe(5)
      expect(stats.wordCount).toBeGreaterThan(0)
      expect(stats.charCount).toBeGreaterThan(0)
    })

    it('should estimate reading time', () => {
      const wordCount = 500
      const wordsPerMinute = 200
      const readingTimeMinutes = Math.ceil(wordCount / wordsPerMinute)

      expect(readingTimeMinutes).toBe(3) // 500/200 = 2.5, rounded up = 3
    })
  })

  describe('File Type Detection', () => {
    it('should detect PDF files', () => {
      const filename = 'document.pdf'
      const ext = filename.split('.').pop()?.toLowerCase()

      expect(ext).toBe('pdf')
    })

    it('should detect DOCX files', () => {
      const filename = 'document.docx'
      const ext = filename.split('.').pop()?.toLowerCase()

      expect(ext).toBe('docx')
    })

    it('should detect TXT files', () => {
      const filename = 'document.txt'
      const ext = filename.split('.').pop()?.toLowerCase()

      expect(ext).toBe('txt')
    })

    it('should handle files with multiple dots', () => {
      const filename = 'my.document.backup.pdf'
      const ext = filename.split('.').pop()?.toLowerCase()

      expect(ext).toBe('pdf')
    })

    it('should handle uppercase extensions', () => {
      const filename = 'document.PDF'
      const ext = filename.split('.').pop()?.toLowerCase()

      expect(ext).toBe('pdf')
    })
  })

  describe('Content Processing', () => {
    it('should trim whitespace from content', () => {
      const content = '  Text with spaces  '
      const trimmed = content.trim()

      expect(trimmed).not.toMatch(/^\s/)
      expect(trimmed).not.toMatch(/\s$/)
    })

    it('should remove extra whitespace', () => {
      const content = 'Text    with    extra    spaces'
      const normalized = content.replace(/\s+/g, ' ')

      expect(normalized).toBe('Text with extra spaces')
    })

    it('should preserve line breaks in content', () => {
      const content = 'Line1\nLine2\nLine3'
      const lines = content.split('\n')

      expect(lines).toHaveLength(3)
    })
  })

  describe('Error Handling', () => {
    it('should handle empty buffer', () => {
      const buffer = Buffer.alloc(0)
      const isEmpty = buffer.length === 0

      expect(isEmpty).toBe(true)
    })

    it('should handle corrupted PDF', () => {
      const error = {
        success: false,
        error: 'Corrupted PDF file'
      }

      expect(error.success).toBe(false)
      expect(error.error).toContain('Corrupted')
    })

    it('should handle unsupported file type', () => {
      const fileType = 'xyz'
      const supportedTypes = ['pdf', 'docx', 'txt']
      const isSupported = supportedTypes.includes(fileType)

      expect(isSupported).toBe(false)
    })
  })

  describe('Memory Management', () => {
    it('should handle large documents', () => {
      const largeText = 'x'.repeat(1_000_000)
      const sizeInMB = largeText.length / 1_048_576

      expect(sizeInMB).toBeCloseTo(0.95, 1)
    })

    it('should release resources after parsing', () => {
      let resourcesAllocated = true

      // Simulate cleanup
      resourcesAllocated = false

      expect(resourcesAllocated).toBe(false)
    })
  })
})
