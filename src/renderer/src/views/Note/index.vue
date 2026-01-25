<template>
  <div class="note-page">
    <div v-if="!currentNote" class="note-list-view">
      <div class="note-header">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索笔记..."
          :prefix-icon="'Search'"
          style="width: 300px"
          @input="handleSearch"
        />
        <el-button type="primary" :icon="'Plus'" @click="showCreateDialog = true">
          新建笔记
        </el-button>
      </div>

      <div v-loading="noteStore.loading" class="note-list">
        <el-empty v-if="filteredNotes.length === 0" description="暂无笔记，点击新建笔记创建" />
        <div
          v-for="note in filteredNotes"
          :key="note.id"
          class="note-item"
          @click="openNote(note)"
        >
          <div class="note-item-header">
            <h3 class="note-title">{{ note.title || '无标题' }}</h3>
            <el-dropdown @command="(cmd) => handleNoteAction(cmd, note)">
              <el-icon class="more-icon"><MoreFilled /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="delete">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <p class="note-preview">{{ stripHtml(note.content) || '空笔记' }}</p>
          <div class="note-meta">
            <span class="note-date">{{ formatDate(note.updatedAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Note Editor View -->
    <div v-else class="note-editor-view">
      <div class="editor-header">
        <el-button :icon="'ArrowLeft'" @click="closeEditor">返回</el-button>
        <el-input
          v-model="currentNote.title"
          placeholder="笔记标题"
          class="title-input"
          @blur="saveNote"
        />
        <div class="header-actions">
          <el-button @click="currentNote.content = ''; saveNote()">清空</el-button>
          <el-button type="primary" :loading="saving" @click="saveNote">
            保存
          </el-button>
        </div>
      </div>
      <div class="editor-container">
        <RichTextEditor
          v-model="currentNote.content"
          placeholder="开始编写笔记..."
          @update="onContentUpdate"
        />
      </div>
    </div>

    <!-- Create Note Dialog -->
    <el-dialog v-model="showCreateDialog" title="新建笔记" width="500px">
      <el-form :model="newNoteForm" label-width="80px">
        <el-form-item label="标题">
          <el-input
            v-model="newNoteForm.title"
            placeholder="请输入笔记标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="内容">
          <el-input
            v-model="newNoteForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入笔记内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="noteStore.loading" @click="handleCreateNote">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useNoteStore } from '@/stores/note'
import RichTextEditor from '@/components/common/RichTextEditor.vue'
import type { Note } from '@/types'

const noteStore = useNoteStore()
const searchKeyword = ref('')
const showCreateDialog = ref(false)
const currentNote = ref<Note | null>(null)
const saving = ref(false)
const autoSaveTimer = ref<number | null>(null)

const newNoteForm = ref({
  title: '',
  content: ''
})

// Computed notes (for local search filter)
const filteredNotes = computed(() => {
  return noteStore.notes
})

const handleSearch = async () => {
  if (!searchKeyword.value) {
    await noteStore.fetchNotes()
  } else {
    const results = await noteStore.searchNotes(searchKeyword.value)
    noteStore.notes = results
  }
}

const handleCreateNote = async () => {
  if (!newNoteForm.value.title.trim()) {
    ElMessage.warning('请输入笔记标题')
    return
  }

  try {
    await noteStore.createNote({
      title: newNoteForm.value.title.trim(),
      content: newNoteForm.value.content
    })

    ElMessage.success('笔记创建成功')
    showCreateDialog.value = false
    newNoteForm.value = { title: '', content: '' }
  } catch (error: any) {
    ElMessage.error(error.message || '创建笔记失败')
  }
}

const openNote = (note: Note) => {
  currentNote.value = { ...note }
}

const closeEditor = () => {
  currentNote.value = null
}

const onContentUpdate = () => {
  // Auto-save with debounce
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
  autoSaveTimer.value = window.setTimeout(() => {
    saveNote()
  }, 2000)
}

const saveNote = async () => {
  if (!currentNote.value) return

  saving.value = true
  try {
    await noteStore.updateNote(currentNote.value.id, {
      title: currentNote.value.title,
      content: currentNote.value.content
    })
    await noteStore.fetchNotes()
    // Update current note with latest data
    const updated = noteStore.notes.find(n => n.id === currentNote.value!.id)
    if (updated) {
      currentNote.value = { ...updated }
    }
    ElMessage.success('保存成功')
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleNoteAction = async (command: string, note: Note) => {
  if (command === 'delete') {
    try {
      await ElMessageBox.confirm('确定要删除这条笔记吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })

      await noteStore.deleteNote(note.id)
      ElMessage.success('删除成功')
    } catch (error: any) {
      if (error !== 'cancel') {
        ElMessage.error(error.message || '删除失败')
      }
    }
  }
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// Strip HTML tags for preview
const stripHtml = (html: string) => {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

onMounted(() => {
  noteStore.fetchNotes()
})

onUnmounted(() => {
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
})
</script>

<style lang="scss" scoped>
.note-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: $spacing-lg;
  gap: $spacing-lg;
}

.note-list-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: $spacing-lg;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.note-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: $spacing-base;
}

.note-item {
  padding: $spacing-base;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: $border-radius-base;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: $box-shadow-base;
  }

  .note-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-sm;

    .note-title {
      font-size: $font-size-medium;
      font-weight: 600;
      margin: 0;
    }

    .more-icon {
      cursor: pointer;
      opacity: 0.6;

      &:hover {
        opacity: 1;
      }
    }
  }

  .note-preview {
    color: var(--el-text-color-secondary);
    font-size: $font-size-base;
    margin: 0 0 $spacing-sm 0;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .note-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .note-date {
      font-size: $font-size-small;
      color: var(--el-text-color-placeholder);
    }
  }
}

// Note Editor View
.note-editor-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: $spacing-base;

  .editor-header {
    display: flex;
    align-items: center;
    gap: $spacing-base;
    padding: $spacing-base;
    background-color: var(--el-bg-color);
    border-radius: $border-radius-base;

    .title-input {
      flex: 1;
      :deep(.el-input__wrapper) {
        border: none;
        box-shadow: none;
        font-size: $font-size-large;
        font-weight: 600;
      }
    }

    .header-actions {
      display: flex;
      gap: $spacing-sm;
    }
  }

  .editor-container {
    flex: 1;
    overflow: hidden;
    background-color: var(--el-bg-color);
    border-radius: $border-radius-base;
    padding: $spacing-base;
  }
}
</style>
