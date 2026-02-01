import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNoteStore } from '../../src/renderer/src/stores/note'
import type { Note } from '../../src/renderer/src/types'

// Mock the electronAPI
const mockNotes: Note[] = [
  {
    id: '1',
    title: '测试笔记1',
    content: '这是测试内容1',
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: '2',
    title: '测试笔记2',
    content: '这是测试内容2',
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
]

global.window = {
  electronAPI: {
    note: {
      create: vi.fn().mockResolvedValue({
        success: true,
        data: mockNotes[0]
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockNotes[0], title: '更新后的标题', content: '更新后的内容' }
      }),
      delete: vi.fn().mockResolvedValue({
        success: true
      }),
      getAll: vi.fn().mockResolvedValue({
        success: true,
        data: mockNotes
      }),
      getById: vi.fn().mockResolvedValue({
        success: true,
        data: mockNotes[0]
      }),
      search: vi.fn().mockResolvedValue({
        success: true,
        data: [mockNotes[0]]
      })
    },
    settings: {
      get: vi.fn(),
      set: vi.fn()
    }
  }
} as any

describe('Note Store', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('should have correct initial state', () => {
    const noteStore = useNoteStore()

    expect(noteStore.notes).toEqual([])
    expect(noteStore.currentNote).toBeNull()
    expect(noteStore.loading).toBe(false)
  })

  it('should fetch notes successfully', async () => {
    const noteStore = useNoteStore()

    await noteStore.fetchNotes()

    expect(window.electronAPI.note.getAll).toHaveBeenCalled()
    expect(noteStore.notes).toHaveLength(2)
    expect(noteStore.notes[0].title).toBe('测试笔记1')
  })

  it('should create a new note', async () => {
    const noteStore = useNoteStore()

    await noteStore.createNote({
      title: '新笔记',
      content: '新内容'
    })

    expect(window.electronAPI.note.create).toHaveBeenCalledWith({
      title: '新笔记',
      content: '新内容'
    })
  })

  it('should update a note', async () => {
    const noteStore = useNoteStore()
    noteStore.notes = mockNotes

    await noteStore.updateNote('1', {
      title: '更新后的标题',
      content: '更新后的内容'
    })

    // updateNote merges id with data, so the call includes id in the object
    expect(window.electronAPI.note.update).toHaveBeenCalledWith({
      id: '1',
      title: '更新后的标题',
      content: '更新后的内容'
    })
  })

  it('should delete a note', async () => {
    const noteStore = useNoteStore()
    noteStore.notes = mockNotes

    await noteStore.deleteNote('1')

    expect(window.electronAPI.note.delete).toHaveBeenCalledWith('1')
  })

  it('should search notes', async () => {
    const noteStore = useNoteStore()

    const results = await noteStore.searchNotes('测试')

    expect(window.electronAPI.note.search).toHaveBeenCalledWith('测试')
    expect(results).toHaveLength(1)
  })

  it('should set current note', () => {
    const noteStore = useNoteStore()

    noteStore.setCurrentNote(mockNotes[0])

    expect(noteStore.currentNote).toEqual(mockNotes[0])
  })

  it('should clear current note by setting to null', () => {
    const noteStore = useNoteStore()
    noteStore.setCurrentNote(mockNotes[0])

    noteStore.setCurrentNote(null)

    expect(noteStore.currentNote).toBeNull()
  })
})
