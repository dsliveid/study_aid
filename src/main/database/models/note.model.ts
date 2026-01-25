import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'

/**
 * Note Data Interface
 */
export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

/**
 * Create Note DTO
 */
export interface CreateNoteDto {
  title: string
  content: string
  tags?: string[]
}

/**
 * Update Note DTO
 */
export interface UpdateNoteDto {
  title?: string
  content?: string
  tags?: string[]
}

/**
 * Note Store - File-based storage
 * Stores notes as JSON array in a file
 */
class NoteStore {
  private data: Map<string, Note> = new Map()
  private filePath: string
  private initPromise: Promise<void> | null = null

  constructor() {
    this.filePath = join(app.getPath('userData'), 'notes.json')
    this.initPromise = this.loadFromFile()
  }

  private async loadFromFile(): Promise<void> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8')
      const notes: Note[] = JSON.parse(content)
      this.data.clear()
      notes.forEach(note => {
        this.data.set(note.id, note)
      })
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      this.data.clear()
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const notes = Array.from(this.data.values())
      await fs.writeFile(this.filePath, JSON.stringify(notes, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to save notes:', error)
    }
  }

  async ready(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise
      this.initPromise = null
    }
  }

  private generateId(): string {
    return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async create(dto: CreateNoteDto): Promise<Note> {
    await this.ready()

    const now = Date.now()
    const note: Note = {
      id: this.generateId(),
      title: dto.title,
      content: dto.content,
      tags: dto.tags || [],
      createdAt: now,
      updatedAt: now
    }

    this.data.set(note.id, note)
    await this.saveToFile()
    return note
  }

  async findAll(): Promise<Note[]> {
    await this.ready()
    return Array.from(this.data.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async findOne(id: string): Promise<Note | null> {
    await this.ready()
    return this.data.get(id) || null
  }

  async update(id: string, dto: UpdateNoteDto): Promise<Note | null> {
    await this.ready()

    const existing = this.data.get(id)
    if (!existing) {
      return null
    }

    const updated: Note = {
      ...existing,
      ...dto,
      updatedAt: Date.now()
    }

    this.data.set(id, updated)
    await this.saveToFile()
    return updated
  }

  async delete(id: string): Promise<boolean> {
    await this.ready()

    const result = this.data.delete(id)
    if (result) {
      await this.saveToFile()
    }
    return result
  }

  async search(keyword: string): Promise<Note[]> {
    await this.ready()

    const lowerKeyword = keyword.toLowerCase()
    return Array.from(this.data.values())
      .filter(note =>
        note.title.toLowerCase().includes(lowerKeyword) ||
        note.content.toLowerCase().includes(lowerKeyword)
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }
}

// Singleton instance
let noteStoreInstance: NoteStore | null = null

/**
 * Get note store singleton instance
 */
export function getNoteStore(): NoteStore {
  if (!noteStoreInstance) {
    noteStoreInstance = new NoteStore()
  }
  return noteStoreInstance
}

/**
 * Note Model Class ( facade over NoteStore)
 * Provides the same interface as the database model
 */
export class NoteModel {
  private store: NoteStore

  constructor() {
    this.store = getNoteStore()
  }

  async create(dto: CreateNoteDto): Promise<Note> {
    return this.store.create(dto)
  }

  async findAll(): Promise<Note[]> {
    return this.store.findAll()
  }

  async findOne(id: string): Promise<Note | null> {
    return this.store.findOne(id)
  }

  async update(id: string, dto: UpdateNoteDto): Promise<Note | null> {
    return this.store.update(id, dto)
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id)
  }

  async search(keyword: string): Promise<Note[]> {
    return this.store.search(keyword)
  }
}

// Singleton instance for NoteModel
let noteModelInstance: NoteModel | null = null

/**
 * Get note model singleton instance
 */
export function getNoteModel(): NoteModel {
  if (!noteModelInstance) {
    noteModelInstance = new NoteModel()
  }
  return noteModelInstance
}
