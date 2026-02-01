/**
 * Main Process Type Definitions
 */

// IPC Channel Types
export type IpcChannel =
  | 'app:ping'
  | 'note:create'
  | 'note:update'
  | 'note:delete'
  | 'note:getAll'
  | 'note:getById'
  | 'settings:get'
  | 'settings:set'

// IPC Request/Response Types
export interface IpcRequest<T = any> {
  channel: IpcChannel
  data?: T
}

export interface IpcResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Note Types
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

// Settings Types
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto'
  language: 'zh-CN' | 'en-US'
  storagePath: string
  shortcuts: {
    newNote: string
    saveNote: string
    screenshot: string
  }
  aiServices: {
    speech: {
      provider: string
      apiKey?: string
    }
    image: {
      provider: string
      apiKey?: string
    }
    llm: {
      provider: string
      apiKey?: string
    }
  }
}
