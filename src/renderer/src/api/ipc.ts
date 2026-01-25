/**
 * IPC API wrapper
 * Provides a type-safe interface for calling Electron main process APIs
 */

import type { IpcResponse } from '@/types'

class IpcAPI {
  /**
   * Invoke an IPC call and return the response data
   * @param channel IPC channel name
   * @param data Data to send
   * @returns Response data
   */
  async invoke<T = any>(channel: string, data?: any): Promise<T> {
    try {
      const response = await (window as any).electronAPI[channel](data)
      return response
    } catch (error) {
      console.error(`IPC invoke failed: ${channel}`, error)
      throw error
    }
  }

  /**
   * Ping the main process
   */
  async ping(): Promise<string> {
    return this.invoke('ping')
  }

  /**
   * Note operations
   */
  note = {
    create: (data: { title: string; content: string }) =>
      this.invoke('create', data),
    update: (id: string, data: any) =>
      this.invoke('update', id, data),
    delete: (id: string) =>
      this.invoke('delete', id),
    getAll: () =>
      this.invoke('getAll'),
    getById: (id: string) =>
      this.invoke('getById', id)
  }

  /**
   * Settings operations
   */
  settings = {
    get: () =>
      this.invoke('get'),
    set: (settings: any) =>
      this.invoke('set', settings)
  }
}

export const ipcAPI = new IpcAPI()
export default ipcAPI
