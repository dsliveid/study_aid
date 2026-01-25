import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Note, CreateNoteDto, UpdateNoteDto } from '@/types'

export const useNoteStore = defineStore('note', () => {
  // State
  const notes = ref<Note[]>([])
  const currentNote = ref<Note | null>(null)
  const loading = ref(false)

  // Get all notes
  const fetchNotes = async () => {
    loading.value = true
    try {
      const response = await window.electronAPI.note.getAll()
      if (response.success && response.data) {
        notes.value = response.data
      } else {
        console.error('Failed to fetch notes:', response.error)
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error)
    } finally {
      loading.value = false
    }
  }

  // Get note by ID
  const fetchNoteById = async (id: string) => {
    loading.value = true
    try {
      const response = await window.electronAPI.note.getById(id)
      if (response.success && response.data) {
        currentNote.value = response.data
      } else {
        console.error('Failed to fetch note:', response.error)
      }
    } catch (error) {
      console.error('Failed to fetch note:', error)
    } finally {
      loading.value = false
    }
  }

  // Create note
  const createNote = async (data: CreateNoteDto) => {
    loading.value = true
    try {
      const response = await window.electronAPI.note.create(data)
      if (response.success && response.data) {
        notes.value.unshift(response.data)
        return response.data
      } else {
        throw new Error(response.error || '创建笔记失败')
      }
    } catch (error) {
      console.error('Failed to create note:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Update note
  const updateNote = async (id: string, data: UpdateNoteDto) => {
    loading.value = true
    try {
      const response = await window.electronAPI.note.update({ id, ...data })
      if (response.success && response.data) {
        const index = notes.value.findIndex(n => n.id === id)
        if (index !== -1) {
          notes.value[index] = response.data
        }
        if (currentNote.value?.id === id) {
          currentNote.value = response.data
        }
        return response.data
      } else {
        throw new Error(response.error || '更新笔记失败')
      }
    } catch (error) {
      console.error('Failed to update note:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Delete note
  const deleteNote = async (id: string) => {
    loading.value = true
    try {
      const response = await window.electronAPI.note.delete(id)
      if (response.success) {
        notes.value = notes.value.filter(n => n.id !== id)
        if (currentNote.value?.id === id) {
          currentNote.value = null
        }
      } else {
        throw new Error(response.error || '删除笔记失败')
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Search notes
  const searchNotes = async (keyword: string) => {
    loading.value = true
    try {
      const response = await window.electronAPI.note.search(keyword)
      if (response.success && response.data) {
        return response.data
      } else {
        console.error('Failed to search notes:', response.error)
        return []
      }
    } catch (error) {
      console.error('Failed to search notes:', error)
      return []
    } finally {
      loading.value = false
    }
  }

  // Set current note
  const setCurrentNote = (note: Note | null) => {
    currentNote.value = note
  }

  return {
    notes,
    currentNote,
    loading,
    fetchNotes,
    fetchNoteById,
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
    setCurrentNote
  }
})
