<template>
  <div class="image-uploader">
    <el-upload
      ref="uploadRef"
      class="upload-area"
      :show-file-list="false"
      :before-upload="handleBeforeUpload"
      :on-change="handleFileChange"
      drag
      accept="image/*"
    >
      <div class="upload-content">
        <el-icon class="upload-icon" :size="48">
          <UploadFilled />
        </el-icon>
        <div class="upload-text">
          <p class="upload-title">拖拽图片到此处，或点击上传</p>
          <p class="upload-hint">支持 JPG、PNG、BMP、GIF 格式</p>
          <p class="upload-limit">建议图片大小不超过 10MB</p>
        </div>
      </div>
    </el-upload>

    <!-- Image Preview -->
    <div v-if="previewUrl" class="image-preview">
      <div class="preview-header">
        <span class="file-name">{{ fileName }}</span>
        <div class="preview-actions">
          <el-button type="primary" size="small" :icon="View" @click="handlePreview">
            预览
          </el-button>
          <el-button type="danger" size="small" :icon="Delete" @click="handleClear">
            清除
          </el-button>
        </div>
      </div>
      <div class="preview-image">
        <img :src="previewUrl" :alt="fileName" />
      </div>
      <div class="preview-info">
        <span>大小: {{ formatFileSize(fileSize) }}</span>
      </div>
    </div>

    <!-- Image Preview Dialog -->
    <el-dialog v-model="previewDialogVisible" title="图片预览" width="70%" center>
      <img :src="previewUrl" :alt="fileName" style="width: 100%; max-height: 70vh; object-fit: contain;" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, View, Delete } from '@element-plus/icons-vue'
import type { UploadFile } from 'element-plus'

// Props
interface Props {
  modelValue?: Buffer | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: Buffer | null]
  'change': [file: File, buffer: Buffer]
}>()

// Refs
const uploadRef = ref()
const previewDialogVisible = ref(false)
const previewUrl = ref<string>('')
const fileName = ref('')
const fileSize = ref(0)

// Computed
const hasImage = computed(() => !!previewUrl.value)

// Methods
const handleBeforeUpload = (file: File): boolean => {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/gif']
  if (!validTypes.includes(file.type)) {
    ElMessage.error('只支持 JPG、PNG、BMP、GIF 格式的图片')
    return false
  }

  // Validate file size (10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('图片大小不能超过 10MB')
    return false
  }

  return true
}

const handleFileChange = (file: UploadFile): void => {
  if (!file.raw) return

  const reader = new FileReader()

  reader.onload = (e) => {
    const result = e.target?.result as string
    const buffer = Buffer.from(result.split(',')[1], 'base64')

    previewUrl.value = result
    fileName.value = file.name
    fileSize.value = file.size

    emit('update:modelValue', buffer)
    emit('change', file.raw, buffer)
  }

  reader.onerror = () => {
    ElMessage.error('图片读取失败')
  }

  reader.readAsDataURL(file.raw)
}

const handlePreview = (): void => {
  previewDialogVisible.value = true
}

const handleClear = (): void => {
  previewUrl.value = ''
  fileName.value = ''
  fileSize.value = 0
  emit('update:modelValue', null)

  // Clear upload ref
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

// Expose methods
defineExpose({
  clear: handleClear
})
</script>

<style lang="scss" scoped>
.image-uploader {
  display: flex;
  flex-direction: column;
  gap: $spacing-base;
}

.upload-area {
  width: 100%;
}

:deep(.el-upload) {
  width: 100%;
}

:deep(.el-upload-dragger) {
  width: 100%;
  padding: $spacing-xl 0;
  border: 2px dashed var(--el-border-color);
  border-radius: $border-radius-large;
  background-color: var(--el-bg-color-page);
  transition: all 0.3s;

  &:hover {
    border-color: var(--el-color-primary);
    background-color: var(--el-fill-color-light);
  }
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-base;
}

.upload-icon {
  color: var(--el-text-color-secondary);
}

.upload-text {
  text-align: center;
}

.upload-title {
  margin: 0;
  font-size: $font-size-base;
  color: var(--el-text-color-primary);
}

.upload-hint {
  margin: 0;
  font-size: $font-size-small;
  color: var(--el-text-color-secondary);
}

.upload-limit {
  margin: 0;
  font-size: $font-size-extra-small;
  color: var(--el-text-color-placeholder);
}

// Image Preview
.image-preview {
  padding: $spacing-base;
  background-color: var(--el-bg-color-page);
  border-radius: $border-radius-base;
  border: 1px solid var(--el-border-color-light);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-base;
}

.file-name {
  font-size: $font-size-base;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.preview-actions {
  display: flex;
  gap: $spacing-sm;
}

.preview-image {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--el-bg-color);
  border-radius: $border-radius-base;
  overflow: hidden;

  img {
    max-width: 100%;
    max-height: 400px;
    object-fit: contain;
  }
}

.preview-info {
  margin-top: $spacing-sm;
  font-size: $font-size-small;
  color: var(--el-text-color-secondary);
  text-align: right;
}
</style>
