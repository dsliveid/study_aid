import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { getNoteService } from '../../services/note.service'

/**
 * Response wrapper for IPC calls
 */
interface IpcResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Helper function to wrap IPC handler responses
 */
function wrapResponse<T>(fn: () => Promise<T>): Promise<IpcResponse<T>> {
  return fn()
    .then((data) => ({ success: true, data }))
    .catch((error) => ({
      success: false,
      error: error.message || '操作失败'
    }))
}

/**
 * Create note handler
 */
async function createNoteHandler(
  _event: IpcMainInvokeEvent,
  data: { title: string; content: string }
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getNoteService()
    return await service.createNote(data)
  })
}

/**
 * Get all notes handler
 */
async function getAllNotesHandler(
  _event: IpcMainInvokeEvent
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getNoteService()
    return await service.getNoteList()
  })
}

/**
 * Get note by ID handler
 */
async function getNoteByIdHandler(
  _event: IpcMainInvokeEvent,
  id: string
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getNoteService()
    return await service.getNoteById(id)
  })
}

/**
 * Update note handler
 */
async function updateNoteHandler(
  _event: IpcMainInvokeEvent,
  data: { id: string; title?: string; content?: string }
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getNoteService()
    const { id, ...updateData } = data
    return await service.updateNote(id, updateData)
  })
}

/**
 * Delete note handler
 */
async function deleteNoteHandler(
  _event: IpcMainInvokeEvent,
  id: string
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getNoteService()
    return await service.deleteNote(id)
  })
}

/**
 * Search notes handler
 */
async function searchNotesHandler(
  _event: IpcMainInvokeEvent,
  keyword: string
): Promise<IpcResponse> {
  return wrapResponse(async () => {
    const service = getNoteService()
    return await service.searchNotes(keyword)
  })
}

/**
 * Register all note-related IPC handlers
 */
export function registerNoteHandlers() {
  // Create note
  ipcMain.handle('note:create', createNoteHandler)

  // Get all notes
  ipcMain.handle('note:getAll', getAllNotesHandler)

  // Get note by ID
  ipcMain.handle('note:getById', getNoteByIdHandler)

  // Update note
  ipcMain.handle('note:update', updateNoteHandler)

  // Delete note
  ipcMain.handle('note:delete', deleteNoteHandler)

  // Search notes
  ipcMain.handle('note:search', searchNotesHandler)

  console.log('Note IPC handlers registered successfully')
}
