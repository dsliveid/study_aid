/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.scss' {
  const content: string
  export default content
}

interface ElectronAPI {
  // App operations
  ping(): Promise<string>

  // Note operations
  note: {
    create(data: { title: string; content: string }): Promise<{
      success: boolean
      data?: import('./src/types').Note
      error?: string
    }>
    update(data: { id: string; title?: string; content?: string }): Promise<{
      success: boolean
      data?: import('./src/types').Note
      error?: string
    }>
    delete(id: string): Promise<{
      success: boolean
      error?: string
    }>
    getAll(): Promise<{
      success: boolean
      data?: import('./src/types').Note[]
      error?: string
    }>
    getById(id: string): Promise<{
      success: boolean
      data?: import('./src/types').Note
      error?: string
    }>
    search(keyword: string): Promise<{
      success: boolean
      data?: import('./src/types').Note[]
      error?: string
    }>
  }

  // Screenshot operations
  screenshot: {
    getSources(): Promise<{
      success: boolean
      data?: Array<{
        id: string
        name: string
        thumbnail: string
      }>
      error?: string
    }>
    getScreenSources(): Promise<{
      success: boolean
      data?: Array<{
        id: string
        name: string
        thumbnail: string
      }>
      error?: string
    }>
    captureFullScreen(): Promise<{
      success: boolean
      data?: string
      error?: string
    }>
    captureSource(sourceId: string): Promise<{
      success: boolean
      data?: string
      error?: string
    }>
  }

  // Document operations
  document: {
    parse(buffer: Buffer, fileType: 'pdf' | 'docx' | 'txt'): Promise<{
      success: boolean
      data?: {
        text: string
        pages?: number
        metadata?: Record<string, any>
      }
      error?: string
    }>
  }

  // Settings operations
  settings: {
    get(): Promise<any>
    set(settings: any): Promise<any>
  }

  // Event listeners
  on(channel: string, callback: (...args: any[]) => void): void
  off(channel: string, callback: (...args: any[]) => void): void
}

interface Window {
  electronAPI: ElectronAPI
}
