<template>
  <div class="video-learning-page">
    <div class="learning-header">
      <h2>视频学习</h2>
      <div class="header-actions">
        <el-button
          type="primary"
          :icon="Microphone"
          @click="toggleRecording"
        >
          语音识别
        </el-button>
        <el-button
          type="success"
          :icon="Camera"
          @click="captureFullScreen"
        >
          全屏截图
        </el-button>
        <el-button
          type="info"
          :icon="Crop"
          @click="captureRegion"
        >
          区域截图
        </el-button>
        <el-button
          type="warning"
          :icon="Picture"
          @click="showImageRecognitionDialog"
        >
          图片识别
        </el-button>
      </div>
    </div>

    <div class="learning-content">
      <!-- Speech Recognition Panel -->
      <div class="panel speech-panel">
        <div class="panel-header">
          <h3>语音识别</h3>
        </div>
        <div class="panel-body">
          <VoiceRecorder />
        </div>
      </div>

      <!-- Screenshot Preview Panel -->
      <div class="panel screenshot-panel">
        <div class="panel-header">
          <h3>截图预览</h3>
          <div class="panel-actions">
            <el-button
              v-if="currentScreenshot"
              type="primary"
              size="small"
              @click="openAnnotationDialog"
            >
              标注
            </el-button>
            <el-button
              v-if="currentScreenshot"
              type="success"
              size="small"
              @click="insertScreenshotToNote"
            >
              插入笔记
            </el-button>
          </div>
        </div>
        <div class="panel-body">
          <div v-if="currentScreenshot" class="screenshot-preview">
            <el-image :src="currentScreenshot" fit="contain" />
          </div>
          <el-empty v-else description="点击截图按钮进行截图" />
        </div>
      </div>

      <!-- Image Recognition Panel -->
      <div class="panel recognition-panel">
        <div class="panel-header">
          <h3>图片识别</h3>
          <div class="panel-actions">
            <el-button
              v-if="hasImage"
              type="primary"
              size="small"
              :loading="recognizing"
              :icon="MagicStick"
              @click="handleRecognize"
            >
              识别
            </el-button>
          </div>
        </div>
        <div class="panel-body">
          <!-- Image Upload -->
          <ImageUploader v-model="uploadedImage" @change="handleImageChange" />

          <!-- Recognition Result -->
          <RecognitionResult
            v-if="hasResults"
            :ocrResult="ocrResult"
            :understandingResult="understandingResult"
            @update:ocrResult="handleOCRResultUpdate"
            @update:understandingResult="handleUnderstandingResultUpdate"
          />
        </div>
      </div>
    </div>

    <!-- Screenshot Source Selector Dialog -->
    <el-dialog v-model="showSourceDialog" title="选择截图源" width="600px">
      <div v-loading="loadingSources" class="source-list">
        <div
          v-for="source in sources"
          :key="source.id"
          class="source-item"
          @click="captureFromSource(source.id)"
        >
          <img :src="source.thumbnail" :alt="source.name" />
          <span>{{ source.name }}</span>
        </div>
      </div>
    </el-dialog>

    <!-- Image Recognition Dialog -->
    <el-dialog
      v-model="showImageRecognition"
      title="图片识别"
      width="900px"
      @close="handleDialogClose"
    >
      <div class="image-recognition-dialog">
        <!-- Upload Section -->
        <div class="dialog-upload">
          <ImageUploader v-model="dialogImageData" @change="handleDialogImageChange" />
        </div>

        <!-- Action Buttons -->
        <div class="dialog-actions">
          <el-button
            type="primary"
            :loading="recognizing"
            :disabled="!dialogImageData"
            @click="handleDialogRecognize"
          >
            <el-icon class="button-icon"><MagicStick /></el-icon>
            开始识别
          </el-button>
          <el-checkbox v-model="recognitionOptions.enableOCR">OCR 文字</el-checkbox>
          <el-checkbox v-model="recognitionOptions.enableUnderstanding">图像理解</el-checkbox>
        </div>

        <!-- Results Section -->
        <div v-if="dialogResults" class="dialog-results">
          <RecognitionResult
            :ocrResult="dialogResults.ocr"
            :understandingResult="dialogResults.understanding"
            @update:ocrResult="handleDialogOCRUpdate"
            @update:understandingResult="handleDialogUnderstandingUpdate"
          />
        </div>
      </div>
    </el-dialog>

    <!-- Screenshot Annotation Dialog -->
    <ScreenshotAnnotation
      v-model="showAnnotationDialog"
      :imageData="currentScreenshot"
      @save="handleAnnotationSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Microphone,
  Camera,
  Picture,
  Crop,
  MagicStick
} from '@element-plus/icons-vue'
import ScreenshotAnnotation from '@/components/common/ScreenshotAnnotation.vue'
import VoiceRecorder from '@/components/voice/VoiceRecorder.vue'
import ImageUploader from '@/components/image/ImageUploader.vue'
import RecognitionResult from '@/components/image/RecognitionResult.vue'

// Types
interface OCRResult {
  success: boolean
  text: string
  confidence?: number
  error?: string
}

interface ImageUnderstandingResult {
  success: boolean
  description: string
  keyPoints?: string[]
  error?: string
}

interface RecognitionResults {
  ocr?: OCRResult
  understanding?: ImageUnderstandingResult
}

// Refs
const recording = ref(false)
const currentScreenshot = ref('')
const showSourceDialog = ref(false)
const showAnnotationDialog = ref(false)
const loadingSources = ref(false)
const sources = ref<Array<{ id: string; name: string; thumbnail: string }>>([])

// Image recognition
const showImageRecognition = ref(false)
const uploadedImage = ref<Buffer | null>(null)
const dialogImageData = ref<Buffer | null>(null)
const recognizing = ref(false)
const ocrResult = ref<OCRResult | null>(null)
const understandingResult = ref<ImageUnderstandingResult | null>(null)
const dialogResults = ref<RecognitionResults | null>(null)
const recognitionOptions = ref({
  enableOCR: true,
  enableUnderstanding: true
})

// Computed
const hasImage = computed(() => !!uploadedImage.value)
const hasResults = computed(() => !!ocrResult.value || !!understandingResult.value)

// Methods
const toggleRecording = () => {
  ElMessage.info('请使用语音识别面板中的控制按钮')
}

const captureFullScreen = async () => {
  try {
    const result = await window.electronAPI.screenshot.captureFullScreen()
    if (result.success && result.data) {
      currentScreenshot.value = result.data.dataUrl
      ElMessage.success('截图成功')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '截图失败')
  }
}

const captureRegion = async () => {
  showSourceDialog.value = true
  loadingSources.value = true

  try {
    const result = await window.electronAPI.screenshot.getScreenSources()
    if (result.success && result.data) {
      sources.value = result.data
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取截图源失败')
  } finally {
    loadingSources.value = false
  }
}

const captureFromSource = async (sourceId: string) => {
  try {
    const result = await window.electronAPI.screenshot.captureScreenById(sourceId)
    if (result.success && result.data) {
      currentScreenshot.value = result.data.dataUrl
      showSourceDialog.value = false
      ElMessage.success('截图成功')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '截图失败')
  }
}

const openAnnotationDialog = () => {
  showAnnotationDialog.value = true
}

const handleAnnotationSave = (data: { dataUrl: string; insertToNote?: boolean }) => {
  currentScreenshot.value = data.dataUrl
  if (data.insertToNote) {
    insertScreenshotToNote()
  }
}

const insertScreenshotToNote = async () => {
  // TODO: Implement actual note insertion
  ElMessage.success('截图已添加到笔记（功能开发中）')
}

// Image Recognition Methods
const handleImageChange = (file: File, buffer: Buffer): void => {
  console.log('Image uploaded:', file.name, buffer.length)
  // Clear previous results when new image is uploaded
  ocrResult.value = null
  understandingResult.value = null
}

const handleRecognize = async (): Promise<void> => {
  if (!uploadedImage.value) return

  recognizing.value = true
  try {
    const result = await window.electronAPI.imageRecognition.recognize(
      uploadedImage.value,
      {
        enableOCR: recognitionOptions.value.enableOCR,
        enableUnderstanding: recognitionOptions.value.enableUnderstanding
      }
    )

    if (result.success) {
      if (result.data?.ocr) {
        ocrResult.value = result.data.ocr
      }
      if (result.data?.understanding) {
        understandingResult.value = result.data.understanding
      }
      ElMessage.success('识别完成')
    } else {
      ElMessage.error(result.error || '识别失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '识别失败')
  } finally {
    recognizing.value = false
  }
}

const handleOCRResultUpdate = (value: OCRResult): void => {
  ocrResult.value = value
}

const handleUnderstandingResultUpdate = (value: ImageUnderstandingResult): void => {
  understandingResult.value = value
}

// Dialog Methods
const showImageRecognitionDialog = (): void => {
  showImageRecognition.value = true
  dialogImageData.value = null
  dialogResults.value = null
}

const handleDialogClose = (): void => {
  // Don't clear results when closing, so user can still view them
}

const handleDialogImageChange = (file: File, buffer: Buffer): void => {
  console.log('Dialog image uploaded:', file.name, buffer.length)
  dialogResults.value = null
}

const handleDialogRecognize = async (): Promise<void> => {
  if (!dialogImageData.value) return

  recognizing.value = true
  try {
    const result = await window.electronAPI.imageRecognition.recognize(
      dialogImageData.value,
      {
        enableOCR: recognitionOptions.value.enableOCR,
        enableUnderstanding: recognitionOptions.value.enableUnderstanding
      }
    )

    if (result.success) {
      dialogResults.value = result.data
      ElMessage.success('识别完成')
    } else {
      ElMessage.error(result.error || '识别失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '识别失败')
  } finally {
    recognizing.value = false
  }
}

const handleDialogOCRUpdate = (value: OCRResult): void => {
  if (dialogResults.value) {
    dialogResults.value.ocr = value
  }
}

const handleDialogUnderstandingUpdate = (value: ImageUnderstandingResult): void => {
  if (dialogResults.value) {
    dialogResults.value.understanding = value
  }
}
</script>

<style lang="scss" scoped>
.video-learning-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: $spacing-lg;
  gap: $spacing-lg;
}

.learning-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2 {
    margin: 0;
    font-size: $font-size-extra-large;
  }

  .header-actions {
    display: flex;
    gap: $spacing-base;
  }
}

.learning-content {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: $spacing-base;
  overflow: hidden;
}

.panel {
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: $border-radius-base;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-base;
    border-bottom: 1px solid var(--el-border-color-lighter);

    h3 {
      margin: 0;
      font-size: $font-size-medium;
    }

    .panel-actions {
      display: flex;
      gap: $spacing-xs;
      align-items: center;
    }
  }

  .panel-body {
    flex: 1;
    padding: $spacing-base;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: $spacing-base;
  }
}

.speech-panel {
  grid-column: 1 / 2;
  grid-row: 1 / 3;

  .panel-body {
    padding: 0;
  }
}

.screenshot-panel {
  grid-column: 2 / 3;
  grid-row: 1 / 2;

  .screenshot-preview {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #000;

    :deep(.el-image) {
      max-height: 100%;
    }
  }
}

.recognition-panel {
  grid-column: 1 / 2;
  grid-row: 2 / 3;
}

.source-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-base;

  .source-item {
    cursor: pointer;
    border: 2px solid var(--el-border-color-light);
    border-radius: $border-radius-base;
    padding: $spacing-sm;
    text-align: center;
    transition: all 0.3s;

    &:hover {
      border-color: var(--el-color-primary);
    }

    img {
      width: 100%;
      height: 120px;
      object-fit: cover;
    }

    span {
      display: block;
      margin-top: $spacing-sm;
      font-size: $font-size-small;
    }
  }
}

// Image Recognition Dialog
.image-recognition-dialog {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.dialog-upload {
  padding: $spacing-base;
  background-color: var(--el-bg-color-page);
  border-radius: $border-radius-base;
  border: 1px solid var(--el-border-color-light);
}

.dialog-actions {
  display: flex;
  align-items: center;
  gap: $spacing-base;
  padding: $spacing-base;
  background-color: var(--el-bg-color-page);
  border-radius: $border-radius-base;
  border: 1px solid var(--el-border-color-light);

  .button-icon {
    margin-right: $spacing-xs;
  }
}

.dialog-results {
  padding: $spacing-base;
  background-color: var(--el-bg-color-page);
  border-radius: $border-radius-base;
  border: 1px solid var(--el-border-color-light);
}
</style>
