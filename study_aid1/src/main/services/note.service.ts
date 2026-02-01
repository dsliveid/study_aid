import type { Note, CreateNoteDto, UpdateNoteDto } from '../database/models/note.model'
import { getNoteModel } from '../database/models/note.model'

/**
 * Custom Error Class
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Note Service Class
 * Business logic layer for note operations
 */
export class NoteService {
  /**
   * Create a new note
   */
  async createNote(dto: CreateNoteDto): Promise<Note> {
    // Validation
    if (!dto.title || dto.title.trim() === '') {
      throw new AppError('INVALID_TITLE', '笔记标题不能为空')
    }

    const model = getNoteModel()
    return await model.create(dto)
  }

  /**
   * Get all notes
   */
  async getNoteList(): Promise<Note[]> {
    const model = getNoteModel()
    return await model.findAll()
  }

  /**
   * Get note by ID
   */
  async getNoteById(id: string): Promise<Note> {
    const model = getNoteModel()
    const note = await model.findOne(id)

    if (!note) {
      throw new AppError('NOTE_NOT_FOUND', '笔记不存在')
    }

    return note
  }

  /**
   * Update note
   */
  async updateNote(id: string, dto: UpdateNoteDto): Promise<Note> {
    const model = getNoteModel()
    const existing = await model.findOne(id)

    if (!existing) {
      throw new AppError('NOTE_NOT_FOUND', '笔记不存在')
    }

    // Validation
    if (dto.title !== undefined && dto.title.trim() === '') {
      throw new AppError('INVALID_TITLE', '笔记标题不能为空')
    }

    const updated = await model.update(id, dto)
    if (!updated) {
      throw new AppError('UPDATE_FAILED', '更新笔记失败')
    }

    return updated
  }

  /**
   * Delete note
   */
  async deleteNote(id: string): Promise<{ success: boolean }> {
    const model = getNoteModel()
    const existing = await model.findOne(id)

    if (!existing) {
      throw new AppError('NOTE_NOT_FOUND', '笔记不存在')
    }

    await model.delete(id)
    return { success: true }
  }

  /**
   * Search notes
   */
  async searchNotes(keyword: string): Promise<Note[]> {
    if (!keyword || keyword.trim() === '') {
      return this.getNoteList()
    }

    const model = getNoteModel()
    return await model.search(keyword.trim())
  }
}

// Singleton instance
let noteServiceInstance: NoteService | null = null

/**
 * Get note service singleton instance
 */
export function getNoteService(): NoteService {
  if (!noteServiceInstance) {
    noteServiceInstance = new NoteService()
  }
  return noteServiceInstance
}
