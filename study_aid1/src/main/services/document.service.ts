import { promises as fs } from 'fs'
import mammoth from 'mammoth'

// Lazy load PDF.js to avoid ESM/CommonJS issues
let pdfjsLib: any = null

async function getPdfjsLib() {
  if (!pdfjsLib) {
    // Dynamic import to handle ESM module
    const pdfjsModule = await import('pdfjs-dist')
    pdfjsLib = pdfjsModule.default || pdfjsModule

    // Configure worker
    const path = await import('path')
    const workerPath = path.join(__dirname, '../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs')
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath
  }
  return pdfjsLib
}

/**
 * Parsed document content
 */
export interface ParsedDocument {
  text: string
  pages?: number
  metadata?: Record<string, any>
  images?: { index: number; data: string; width: number; height: number }[]
}

/**
 * Parse PDF document using PDF.js
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  try {
    // Get PDF.js lib (lazy loaded)
    const lib = await getPdfjsLib()

    // Load the PDF document
    const loadingTask = lib.getDocument({ data: buffer })
    const pdfDocument = await loadingTask.promise

    const numPages = pdfDocument.numPages
    let fullText = ''
    const images: { index: number; data: string; width: number; height: number }[] = []

    // Extract text from all pages
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      const textContent = await page.getTextContent()

      // Concatenate text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')

      fullText += pageText + '\n\n'

      // Extract images from page (optional - requires more complex implementation)
      // For now, we'll focus on text extraction
    }

    // Get document metadata
    const metadata = await pdfDocument.getMetadata()

    return {
      text: fullText.trim(),
      pages: numPages,
      metadata: {
        info: metadata.info,
        metadata: metadata.metadata
      },
      images: images.length > 0 ? images : undefined
    }
  } catch (error) {
    console.error('Failed to parse PDF:', error)
    throw new Error(`PDF解析失败: ${error.message}`)
  }
}

/**
 * Parse DOCX document using mammoth
 */
export async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer })

    // Also extract images if present
    const convertResult = await mammoth.convertToHtml({ buffer })

    return {
      text: result.value || '',
      metadata: {
        messages: result.messages
      }
    }
  } catch (error) {
    console.error('Failed to parse DOCX:', error)
    throw new Error(`DOCX解析失败: ${error.message}`)
  }
}

/**
 * Parse TXT document with encoding detection
 */
export async function parseTxt(buffer: Buffer): Promise<ParsedDocument> {
  try {
    // Try UTF-8 first
    let text = buffer.toString('utf-8')

    // Check for common encoding issues
    const hasReplacementChars = text.includes('\uFFFD') // Replacement character

    if (hasReplacementChars || text.length === 0) {
      // Try GBK/GB2312 encoding (common for Chinese text files)
      try {
        // Dynamic import for iconv-lite
        const iconvModule = await import('iconv-lite')
        const iconv = iconvModule.default || iconvModule
        text = iconv.decode(buffer, 'gbk')
      } catch (iconvError) {
        // If iconv-lite is not available, try latin1 as fallback
        text = buffer.toString('latin1')
      }
    }

    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    return {
      text: text || '',
      metadata: {
        encoding: hasReplacementChars ? 'gbk' : 'utf-8'
      }
    }
  } catch (error) {
    console.error('Failed to parse TXT:', error)
    throw new Error(`TXT解析失败: ${error.message}`)
  }
}

/**
 * Parse document by file type
 */
export async function parseDocument(
  buffer: Buffer,
  fileType: 'pdf' | 'docx' | 'txt'
): Promise<ParsedDocument> {
  switch (fileType) {
    case 'pdf':
      return await parsePdf(buffer)
    case 'docx':
      return await parseDocx(buffer)
    case 'txt':
      return await parseTxt(buffer)
    default:
      throw new Error(`不支持的文件类型: ${fileType}`)
  }
}

/**
 * Detect file type from buffer or filename
 */
export function detectFileType(filename: string): 'pdf' | 'docx' | 'txt' | 'unknown' {
  const ext = filename.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'pdf':
      return 'pdf'
    case 'docx':
    case 'doc':
      return 'docx'
    case 'txt':
    case 'text':
      return 'txt'
    default:
      return 'unknown'
  }
}

/**
 * Get document statistics
 */
export function getDocumentStats(document: ParsedDocument) {
  const lines = document.text.split('\n').filter(line => line.trim().length > 0)
  const words = document.text.split(/\s+/).filter(word => word.trim().length > 0)
  const characters = document.text.replace(/\s/g, '').length

  return {
    pages: document.pages || 1,
    lines: lines.length,
    words: words.length,
    characters: characters,
    estimatedReadingTime: Math.ceil(words.length / 250) // Average 250 words per minute
  }
}

/**
 * Extract images from PDF (advanced feature)
 * Note: This is a simplified version. Full implementation requires more work.
 */
export async function extractPdfImages(buffer: Buffer): Promise<Array<{
  index: number
  data: string
  width: number
  height: number
}>> {
  try {
    const lib = await getPdfjsLib()
    const loadingTask = lib.getDocument({ data: buffer })
    const pdfDocument = await loadingTask.promise
    const images: Array<{ index: number; data: string; width: number; height: number }> = []

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      const operatorList = await page.getOperatorList()

      // Look for image operators
      for (const op of operatorList.fnArray) {
        if (op === lib.OPS.paintImageXObject) {
          // Image found - would need more complex handling to extract
          // This is a placeholder for the actual implementation
        }
      }
    }

    return images
  } catch (error) {
    console.error('Failed to extract PDF images:', error)
    return []
  }
}

/**
 * Document Service Class
 */
export class DocumentService {
  /**
   * Parse document file
   */
  async parseDocument(buffer: Buffer, fileType: 'pdf' | 'docx' | 'txt'): Promise<ParsedDocument> {
    return await parseDocument(buffer, fileType)
  }

  /**
   * Detect file type from filename
   */
  detectFileType(filename: string): 'pdf' | 'docx' | 'txt' | 'unknown' {
    return detectFileType(filename)
  }

  /**
   * Get document statistics
   */
  getDocumentStats(document: ParsedDocument) {
    return getDocumentStats(document)
  }
}

// Singleton instance
let documentServiceInstance: DocumentService | null = null

/**
 * Get document service singleton instance
 */
export function getDocumentService(): DocumentService {
  if (!documentServiceInstance) {
    documentServiceInstance = new DocumentService()
  }
  return documentServiceInstance
}
