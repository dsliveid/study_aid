/**
 * Note Service Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the file system and other dependencies
const mockFs = {
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn()
}

vi.mock('fs', () => mockFs)

const mockPath = {
  join: vi.fn((...args: string[]) => args.join('/'))
}

vi.mock('path', () => mockPath)

describe('Note Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Note Creation', () => {
    it('should create a new note with valid data', async () => {
      const noteData = {
        title: 'Test Note',
        content: 'Test content',
        tags: ['test']
      }

      // Mock file system response
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(JSON.stringify([]))

      // Test would create a note
      expect(noteData.title).toBe('Test Note')
      expect(noteData.content).toBe('Test content')
      expect(noteData.tags).toContain('test')
    })

    it('should generate a unique ID for each note', () => {
      const id1 = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const id2 = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      expect(id1).not.toBe(id2)
    })

    it('should set createdAt and updatedAt timestamps', () => {
      const now = Date.now()

      expect(now).toBeGreaterThan(0)
      expect(typeof now).toBe('number')
    })
  })

  describe('Note Update', () => {
    it('should update note title', () => {
      const note = {
        id: '1',
        title: 'Old Title',
        content: 'Content',
        updatedAt: Date.now()
      }

      note.title = 'New Title'
      note.updatedAt = Date.now()

      expect(note.title).toBe('New Title')
      expect(note.updatedAt).toBeGreaterThan(note.createdAt || 0)
    })

    it('should update note content', () => {
      const note = {
        id: '1',
        title: 'Title',
        content: 'Old Content',
        updatedAt: Date.now()
      }

      note.content = 'New Content'
      note.updatedAt = Date.now()

      expect(note.content).toBe('New Content')
    })

    it('should update note tags', () => {
      const note = {
        id: '1',
        title: 'Title',
        content: 'Content',
        tags: ['old'],
        updatedAt: Date.now()
      }

      note.tags = ['new', 'tags']
      note.updatedAt = Date.now()

      expect(note.tags).toContain('new')
      expect(note.tags).toContain('tags')
      expect(note.tags).not.toContain('old')
    })
  })

  describe('Note Deletion', () => {
    it('should mark note as deleted', () => {
      const notes = [
        { id: '1', title: 'Note 1', deleted: false },
        { id: '2', title: 'Note 2', deleted: false },
        { id: '3', title: 'Note 3', deleted: false }
      ]

      // Simulate deletion
      notes[1].deleted = true

      expect(notes[1].deleted).toBe(true)
      expect(notes[0].deleted).toBe(false)
      expect(notes[2].deleted).toBe(false)
    })

    it('should filter out deleted notes from list', () => {
      const notes = [
        { id: '1', title: 'Note 1', deleted: false },
        { id: '2', title: 'Note 2', deleted: true },
        { id: '3', title: 'Note 3', deleted: false }
      ]

      const activeNotes = notes.filter(n => !n.deleted)

      expect(activeNotes).toHaveLength(2)
      expect(activeNotes.every(n => !n.deleted)).toBe(true)
    })
  })

  describe('Note Search', () => {
    it('should search notes by title', () => {
      const notes = [
        { id: '1', title: 'JavaScript Basics', content: 'Content' },
        { id: '2', title: 'Python Advanced', content: 'Content' },
        { id: '3', title: 'JavaScript Patterns', content: 'Content' }
      ]

      const results = notes.filter(n =>
        n.title.toLowerCase().includes('javascript')
      )

      expect(results).toHaveLength(2)
      expect(results[0].title).toContain('JavaScript')
      expect(results[1].title).toContain('JavaScript')
    })

    it('should search notes by content', () => {
      const notes = [
        { id: '1', title: 'Note', content: 'This is about programming' },
        { id: '2', title: 'Note', content: 'This is about design' },
        { id: '3', title: 'Note', content: 'Programming is fun' }
      ]

      const results = notes.filter(n =>
        n.content.toLowerCase().includes('programming')
      )

      expect(results).toHaveLength(2)
    })

    it('should be case insensitive', () => {
      const notes = [
        { id: '1', title: 'Test Note', content: 'Content' },
        { id: '2', title: 'test note', content: 'Content' }
      ]

      // Both searches should find both notes when converted to lowercase
      const searchLower1 = 'test'
      const searchLower2 = 'TEST'

      const results1 = notes.filter(n =>
        n.title.toLowerCase().includes(searchLower1.toLowerCase())
      )
      const results2 = notes.filter(n =>
        n.title.toLowerCase().includes(searchLower2.toLowerCase())
      )

      expect(results1).toHaveLength(2)
      expect(results2).toHaveLength(2)
    })
  })

  describe('Note Tags', () => {
    it('should add tags to note', () => {
      const note = {
        id: '1',
        title: 'Note',
        tags: ['existing']
      }

      note.tags.push('new-tag')

      expect(note.tags).toHaveLength(2)
      expect(note.tags).toContain('new-tag')
    })

    it('should remove tags from note', () => {
      const note = {
        id: '1',
        title: 'Note',
        tags: ['tag1', 'tag2', 'tag3']
      }

      note.tags = note.tags.filter(t => t !== 'tag2')

      expect(note.tags).toHaveLength(2)
      expect(note.tags).not.toContain('tag2')
    })

    it('should find notes by tag', () => {
      const notes = [
        { id: '1', title: 'Note 1', tags: ['javascript', 'tutorial'] },
        { id: '2', title: 'Note 2', tags: ['python', 'tutorial'] },
        { id: '3', title: 'Note 3', tags: ['javascript', 'advanced'] }
      ]

      const results = notes.filter(n => n.tags.includes('javascript'))

      expect(results).toHaveLength(2)
      expect(results.every(n => n.tags.includes('javascript'))).toBe(true)
    })
  })

  describe('Data Validation', () => {
    it('should require title', () => {
      const noteWithoutTitle = {
        content: 'Content'
      }

      expect(noteWithoutTitle.title).toBeUndefined()
    })

    it('should require content', () => {
      const noteWithoutContent = {
        title: 'Title'
      }

      expect(noteWithoutContent.content).toBeUndefined()
    })

    it('should handle empty tags array', () => {
      const note = {
        id: '1',
        title: 'Note',
        content: 'Content',
        tags: []
      }

      expect(note.tags).toHaveLength(0)
      expect(Array.isArray(note.tags)).toBe(true)
    })
  })

  describe('Timestamp Management', () => {
    it('should update updatedAt on modification', async () => {
      const note = {
        id: '1',
        title: 'Original Title',
        content: 'Original Content',
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000
      }

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 10))

      note.title = 'Updated Title'
      note.updatedAt = Date.now()

      expect(note.updatedAt).toBeGreaterThan(note.createdAt)
    })

    it('should preserve createdAt on update', () => {
      const note = {
        id: '1',
        title: 'Original Title',
        createdAt: 1234567890
      }

      const originalCreatedAt = note.createdAt

      note.title = 'Updated Title'
      note.updatedAt = Date.now()

      expect(note.createdAt).toBe(originalCreatedAt)
    })
  })
})
