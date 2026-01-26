/**
 * Renderer Process Type Definitions
 */

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface CreateNoteDto {
  title: string
  content: string
  tags?: string[]
}

export interface UpdateNoteDto {
  title?: string
  content?: string
  tags?: string[]
}

export interface IpcResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto'
  language: 'zh-CN' | 'en-US'
  storagePath: string
  shortcuts: {
    newNote: string
    saveNote: string
    screenshot: string
  }
}

/**
 * Settings type definition
 */
export interface Settings {
  theme: 'light' | 'dark' | 'auto'
  shortcuts: {
    screenshot: string
    voiceRecord: string
  }
  ai: {
    speech: AIServiceConfig
    image: AIImageServiceConfig
    content: AIContentServiceConfig
  }
  storage: {
    dataPath: string
    screenshotPath: string
  }
}

export interface AIServiceConfig {
  provider: string
  apiKey: string
  appId?: string
  apiSecret?: string
}

export interface AIImageServiceConfig {
  provider: string
  apiKey: string
  secretKey?: string
}

export interface AIContentServiceConfig {
  provider: string
  apiKey: string
  baseUrl?: string
}

/**
 * AI Content Generation types
 */
export interface KnowledgeTreeNode {
  title: string
  level: number
  importance: 'high' | 'medium' | 'low'
  children: KnowledgeTreeNode[]
}

export interface KnowledgeTreeResult {
  title: string
  structure: KnowledgeTreeNode[]
}

export interface KeyPoint {
  content: string
  importance: 'high' | 'medium' | 'low'
  location?: string
}

export interface KeyPointsResult {
  keyPoints: KeyPoint[]
}

export interface DifficultPoint {
  content: string
  explanation: string
  difficulty: 'high' | 'medium' | 'low'
  location?: string
}

export interface DifficultPointsResult {
  difficultPoints: DifficultPoint[]
}
