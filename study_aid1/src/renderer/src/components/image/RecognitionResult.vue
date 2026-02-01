<template>
  <div class="recognition-result">
    <!-- Tabs for different results -->
    <el-tabs v-model="activeTab" class="result-tabs">
      <!-- OCR Text Result -->
      <el-tab-pane label="文字识别 (OCR)" name="ocr">
        <div v-if="ocrResult" class="result-content">
          <div class="result-header">
            <div class="result-meta">
              <StatusTag :status="ocrResult.success ? 'success' : 'error'" />
              <span v-if="ocrResult.confidence" class="confidence">
                准确率: {{ (ocrResult.confidence * 100).toFixed(1) }}%
              </span>
            </div>
            <div class="result-actions">
              <el-button
                v-if="ocrResult.success"
                size="small"
                :icon="DocumentCopy"
                @click="copyOCRText"
              >
                复制
              </el-button>
              <el-button
                v-if="ocrResult.success"
                size="small"
                :icon="FolderOpened"
                @click="saveToNote"
              >
                保存到笔记
              </el-button>
            </div>
          </div>

          <div v-if="ocrResult.success" class="ocr-text">
            <el-input
              v-model="editableOCRText"
              type="textarea"
              :rows="12"
              placeholder="识别的文字将显示在这里"
              @input="handleOCRTextEdit"
            />
          </div>

          <div v-else class="error-message">
            <el-icon :size="32" color="var(--el-color-danger)">
              <CircleCloseFilled />
            </el-icon>
            <p>{{ ocrResult.error || '识别失败' }}</p>
          </div>
        </div>

        <el-empty v-else description="请先上传图片并进行识别" />
      </el-tab-pane>

      <!-- Image Understanding Result -->
      <el-tab-pane label="图像理解" name="understanding">
        <div v-if="understandingResult" class="result-content">
          <div class="result-header">
            <div class="result-meta">
              <StatusTag :status="understandingResult.success ? 'success' : 'error'" />
            </div>
            <div class="result-actions">
              <el-button
                v-if="understandingResult.success"
                size="small"
                :icon="DocumentCopy"
                @click="copyUnderstandingText"
              >
                复制
              </el-button>
              <el-button
                v-if="understandingResult.success"
                size="small"
                :icon="FolderOpened"
                @click="saveToNote"
              >
                保存到笔记
              </el-button>
            </div>
          </div>

          <div v-if="understandingResult.success" class="understanding-content">
            <!-- Key Points -->
            <div v-if="understandingResult.keyPoints && understandingResult.keyPoints.length > 0" class="key-points">
              <h4 class="section-title">
                <el-icon><List /></el-icon>
                关键信息
              </h4>
              <ul class="key-points-list">
                <li v-for="(point, index) in understandingResult.keyPoints" :key="index">
                  {{ point }}
                </li>
              </ul>
            </div>

            <!-- Description -->
            <div class="description">
              <h4 class="section-title">
                <el-icon><Document /></el-icon>
                详细描述
              </h4>
              <el-input
                v-model="editableUnderstandingText"
                type="textarea"
                :rows="12"
                placeholder="图像理解结果将显示在这里"
                @input="handleUnderstandingTextEdit"
              />
            </div>
          </div>

          <div v-else class="error-message">
            <el-icon :size="32" color="var(--el-color-danger)">
              <CircleCloseFilled />
            </el-icon>
            <p>{{ understandingResult.error || '理解失败' }}</p>
          </div>
        </div>

        <el-empty v-else description="请先上传图片并进行识别" />
      </el-tab-pane>

      <!-- Combined Result -->
      <el-tab-pane label="完整结果" name="combined">
        <div v-if="hasResults" class="result-content combined-result">
          <div class="combined-header">
            <el-button size="small" :icon="FolderOpened" @click="saveAllToNote">
              全部保存到笔记
            </el-button>
          </div>

          <!-- OCR Section -->
          <div v-if="ocrResult?.success" class="combined-section">
            <h4 class="section-title">
              <el-icon><Document /></el-icon>
              识别文字
            </h4>
            <div class="section-content">
              {{ editableOCRText }}
            </div>
          </div>

          <!-- Understanding Section -->
          <div v-if="understandingResult?.success" class="combined-section">
            <h4 class="section-title">
              <el-icon><View /></el-icon>
              图像描述
            </h4>
            <div class="section-content">
              {{ editableUnderstandingText }}
            </div>
          </div>
        </div>

        <el-empty v-else description="请先上传图片并进行识别" />
      </el-tab-pane>
    </el-tabs>

    <!-- Save to Note Dialog -->
    <el-dialog
      v-model="saveDialogVisible"
      title="保存到笔记"
      width="500px"
      @confirm="handleSaveConfirm"
    >
      <el-form :model="saveForm" label-width="80px">
        <el-form-item label="笔记标题">
          <el-input v-model="saveForm.title" placeholder="请输入笔记标题" />
        </el-form-item>
        <el-form-item label="保存内容">
          <el-checkbox-group v-model="saveForm.include">
            <el-checkbox label="ocr">识别文字</el-checkbox>
            <el-checkbox label="understanding">图像描述</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveConfirm" :disabled="!canSave">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  DocumentCopy,
  FolderOpened,
  CircleCloseFilled,
  List,
  Document,
  View
} from '@element-plus/icons-vue'
import StatusTag from '@/components/ui/StatusTag.vue'
import { useNoteStore } from '@/stores/note'

// Types
interface OCRResult {
  success: boolean
  text: string
  confidence?: number
  wordsResult?: Array<{
    words: string
    confidence?: number
  }>
  error?: string
}

interface ImageUnderstandingResult {
  success: boolean
  description: string
  keyPoints?: string[]
  error?: string
}

// Props
interface Props {
  ocrResult?: OCRResult | null
  understandingResult?: ImageUnderstandingResult | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:ocrResult': [value: OCRResult]
  'update:understandingResult': [value: ImageUnderstandingResult]
}>()

// Store
const noteStore = useNoteStore()

// Refs
const activeTab = ref('ocr')
const editableOCRText = ref('')
const editableUnderstandingText = ref('')
const saveDialogVisible = ref(false)
const saveForm = ref({
  title: '',
  include: ['ocr', 'understanding']
})

// Computed
const hasResults = computed(() => {
  return props.ocrResult?.success || props.understandingResult?.success
})

const canSave = computed(() => {
  return saveForm.value.title.trim() !== '' && saveForm.value.include.length > 0
})

// Watch for result changes
watch(() => props.ocrResult, (newVal) => {
  if (newVal?.success) {
    editableOCRText.value = newVal.text
  }
}, { immediate: true })

watch(() => props.understandingResult, (newVal) => {
  if (newVal?.success) {
    editableUnderstandingText.value = newVal.description
  }
}, { immediate: true })

// Methods
const handleOCRTextEdit = (): void => {
  if (props.ocrResult) {
    emit('update:ocrResult', {
      ...props.ocrResult,
      text: editableOCRText.value
    })
  }
}

const handleUnderstandingTextEdit = (): void => {
  if (props.understandingResult) {
    emit('update:understandingResult', {
      ...props.understandingResult,
      description: editableUnderstandingText.value
    })
  }
}

const copyOCRText = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(editableOCRText.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const copyUnderstandingText = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(editableUnderstandingText.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const saveToNote = (): void => {
  saveForm.value.title = generateTitle()
  saveDialogVisible.value = true
}

const saveAllToNote = (): void => {
  saveForm.value.include = []
  if (props.ocrResult?.success) {
    saveForm.value.include.push('ocr')
  }
  if (props.understandingResult?.success) {
    saveForm.value.include.push('understanding')
  }
  saveToNote()
}

const handleSaveConfirm = async (): Promise<void> => {
  if (!canSave.value) return

  try {
    let content = ''

    if (saveForm.value.include.includes('understanding') && editableUnderstandingText.value) {
      content += `## 图像描述\n\n${editableUnderstandingText.value}\n\n`
    }

    if (saveForm.value.include.includes('ocr') && editableOCRText.value) {
      content += `## 识别文字\n\n${editableOCRText.value}`
    }

    await noteStore.createNote({
      title: saveForm.value.title.trim(),
      content: content.trim()
    })

    ElMessage.success('已保存到笔记')
    saveDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

const generateTitle = (): string => {
  const date = new Date().toLocaleString('zh-CN')
  let title = `图像识别 - ${date}`

  if (props.understandingResult?.keyPoints && props.understandingResult.keyPoints.length > 0) {
    title = props.understandingResult.keyPoints[0].substring(0, 20)
    if (props.understandingResult.keyPoints[0].length > 20) {
      title += '...'
    }
  }

  return title
}
</script>

<style lang="scss" scoped>
.recognition-result {
  display: flex;
  flex-direction: column;
  gap: $spacing-base;
}

.result-tabs {
  :deep(.el-tabs__content) {
    padding: 0;
  }
}

.result-content {
  padding: $spacing-base;
  background-color: var(--el-bg-color-page);
  border-radius: $border-radius-base;
  border: 1px solid var(--el-border-color-light);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-base;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: $spacing-base;

  .confidence {
    font-size: $font-size-small;
    color: var(--el-text-color-secondary);
  }
}

.result-actions {
  display: flex;
  gap: $spacing-sm;
}

.ocr-text {
  :deep(.el-textarea) {
    .el-textarea__inner {
      font-family: 'Courier New', monospace;
      line-height: 1.6;
    }
  }
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-base;
  padding: $spacing-xxl 0;
  color: var(--el-text-color-secondary);
}

.understanding-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.key-points {
  padding: $spacing-base;
  background-color: var(--el-bg-color);
  border-radius: $border-radius-base;
}

.section-title {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin: 0 0 $spacing-base 0;
  font-size: $font-size-medium;
  font-weight: 600;
  color: var(--el-text-color-primary);

  .el-icon {
    color: var(--el-color-primary);
  }
}

.key-points-list {
  margin: 0;
  padding-left: $spacing-lg;

  li {
    margin-bottom: $spacing-sm;
    color: var(--el-text-color-regular);
    line-height: 1.6;
  }
}

.description {
  display: flex;
  flex-direction: column;
}

.combined-result {
  .combined-header {
    display: flex;
    justify-content: flex-end;
    padding-bottom: $spacing-base;
    border-bottom: 1px solid var(--el-border-color-lighter);
    margin-bottom: $spacing-base;
  }
}

.combined-section {
  margin-bottom: $spacing-lg;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-content {
  padding: $spacing-base;
  background-color: var(--el-bg-color);
  border-radius: $border-radius-base;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
