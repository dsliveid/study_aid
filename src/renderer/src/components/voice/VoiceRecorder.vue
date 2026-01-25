<template>
  <div class="voice-recorder">
    <!-- Status Display -->
    <div class="recorder-status">
      <StatusTag
        :status="statusTag"
        :text="statusText"
        :icon="statusIcon"
      />
      <span v-if="recordingDuration" class="recording-duration">
        {{ formatDuration(recordingDuration) }}
      </span>
    </div>

    <!-- Recognition Results -->
    <div v-if="showRecognition && recognizedText" class="recognition-results">
      <div class="results-header">
        <h4>识别结果</h4>
        <el-button size="small" text @click="copyText">
          <el-icon><DocumentCopy /></el-icon>
          复制
        </el-button>
      </div>
      <div class="results-content">
        <div class="current-text">
          {{ recognizedText }}
          <span v-if="isRecognizing" class="cursor">|</span>
        </div>
        <div v-if="finalText && finalText !== recognizedText" class="final-text">
          {{ finalText }}
        </div>
      </div>
    </div>

    <!-- Recording Controls -->
    <div class="recorder-controls">
      <!-- Audio Visualizer (simplified) -->
      <div v-if="isRecording || isRecognizing" class="audio-visualizer">
        <div
          v-for="(level, index) in audioLevels"
          :key="index"
          class="visualizer-bar"
          :style="{ height: `${level}%` }"
        />
      </div>

      <!-- Control Buttons -->
      <div class="control-buttons">
        <!-- Connect/Disconnect -->
        <el-button
          v-if="!isConnected"
          type="primary"
          :icon="Connection"
          :loading="isConnecting"
          @click="handleConnect"
        >
          连接服务
        </el-button>
        <el-button
          v-else
          type="danger"
          :icon="SwitchButton"
          @click="handleDisconnect"
        >
          断开连接
        </el-button>

        <!-- Start/Stop Recording -->
        <el-button
          v-if="!isRecording"
          type="primary"
          :icon="VideoPlay"
          :disabled="!isConnected || isRecognizing"
          :loading="isStarting"
          size="large"
          circle
          @click="handleStartRecording"
        />

        <el-button
          v-else
          type="danger"
          :icon="VideoPause"
          size="large"
          circle
          @click="handleStopRecording"
        />

        <!-- Save to Note -->
        <el-button
          v-if="finalText && !isRecording"
          type="success"
          :icon="DocumentAdd"
          :disabled="!finalText"
          @click="handleSaveToNote"
        >
          保存到笔记
        </el-button>

        <!-- Clear Results -->
        <el-button
          v-if="finalText && !isRecording"
          :icon="Delete"
          @click="handleClearResults"
        >
          清空
        </el-button>
      </div>
    </div>

    <!-- Settings -->
    <div v-if="showSettings" class="recorder-settings">
      <div class="setting-item">
        <label>显示识别结果</label>
        <el-switch v-model="showRecognition" />
      </div>
      <div class="setting-item">
        <label>自动保存到笔记</label>
        <el-switch v-model="autoSave" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Connection,
  SwitchButton,
  VideoPlay,
  VideoPause,
  DocumentAdd,
  Delete,
  DocumentCopy
} from '@element-plus/icons-vue'
import StatusTag from '@/components/ui/StatusTag.vue'

type RecognitionStatus = 'idle' | 'connecting' | 'connected' | 'recognizing' | 'error'

const status = ref<RecognitionStatus>('idle')
const isConnecting = ref(false)
const isStarting = ref(false)
const isRecording = ref(false)
const isRecognizing = ref(false)
const isConnected = ref(false)
const recordingDuration = ref(0)
const recognizedText = ref('')
const finalText = ref('')
const showRecognition = ref(true)
const autoSave = ref(false)
const showSettings = ref(true)

// Audio visualizer
const audioLevels = ref<number[]>([])
const visualizerInterval = ref<number | null>(null)

// Recording state
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
const durationInterval = ref<number | null>(null)
let startTime: number | null = null

// Computed
const statusTag = computed(() => {
  const tagMap: Record<RecognitionStatus, any> = {
    idle: 'inactive',
    connecting: 'pending',
    connected: 'active',
    recognizing: 'processing',
    error: 'error'
  }
  return tagMap[status.value]
})

const statusText = computed(() => {
  const textMap: Record<RecognitionStatus, string> = {
    idle: '未连接',
    connecting: '连接中...',
    connected: '已连接',
    recognizing: '识别中',
    error: '错误'
  }
  return textMap[status.value]
})

const statusIcon = computed(() => {
  if (status.value === 'recognizing') return 'VideoPause'
  if (status.value === 'connected') return 'Connection'
  if (status.value === 'error') return 'Warning'
  return 'Connection'
})

// Methods
const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

const startAudioVisualizer = () => {
  visualizerInterval.value = window.setInterval(() => {
    // Generate random audio levels for visualizer
    const levels = Array.from({ length: 20 }, () => Math.random() * 80 + 20)
    audioLevels.value = isRecording.value ? levels : []
  }, 100)
}

const stopAudioVisualizer = () => {
  if (visualizerInterval.value) {
    clearInterval(visualizerInterval.value)
    visualizerInterval.value = null
  }
  audioLevels.value = []
}

const startDurationCounter = () => {
  startTime = Date.now()
  durationInterval.value = window.setInterval(() => {
    if (startTime) {
      recordingDuration.value = Date.now() - startTime
    }
  }, 100)
}

const stopDurationCounter = () => {
  if (durationInterval.value) {
    clearInterval(durationInterval.value)
    durationInterval.value = null
  }
}

const handleConnect = async () => {
  isConnecting.value = true
  status.value = 'connecting'

  try {
    const settings = await window.electronAPI.settings.get?.()
    const config = settings?.data?.ai?.speech

    if (!config?.apiKey || !config?.appId) {
      ElMessage.warning('请先在设置中配置语音识别服务')
      status.value = 'idle'
      return
    }

    await window.electronAPI.speechRecognition?.initialize?.({
      apiKey: config.apiKey,
      appId: config.appId,
      apiSecret: config.apiSecret
    })

    await window.electronAPI.speechRecognition?.connect?.()

    isConnected.value = true
    status.value = 'connected'
    ElMessage.success('语音识别服务连接成功')
  } catch (error: any) {
    status.value = 'error'
    ElMessage.error(error.message || '连接失败')
  } finally {
    isConnecting.value = false
  }
}

const handleDisconnect = () => {
  if (isRecording.value) {
    handleStopRecording()
  }

  window.electronAPI.speechRecognition?.disconnect?.()
  isConnected.value = false
  status.value = 'idle'
  recognizedText.value = ''
  finalText.value = ''
  recordingDuration.value = 0
}

const handleStartRecording = async () => {
  isStarting.value = true

  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.start(100) // Capture in 100ms chunks
    isRecording.value = true

    // Start speech recognition
    await window.electronAPI.speechRecognition?.start?.()

    isRecognizing.value = true
    status.value = 'recognizing'

    // Start counters and visualizer
    startDurationCounter()
    startAudioVisualizer()

    ElMessage.info('开始录音...')
  } catch (error: any) {
    ElMessage.error(error.message || '无法访问麦克风')
  } finally {
    isStarting.value = false
  }
}

const handleStopRecording = async () => {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
    mediaRecorder.stream.getTracks().forEach(track => track.stop())
    mediaRecorder = null
  }

  isRecording.value = false
  stopDurationCounter()
  stopAudioVisualizer()

  // Stop speech recognition
  try {
    const result = await window.electronAPI.speechRecognition?.stop?.()
    if (result?.success && result.data) {
      finalText.value = result.data.text || recognizedText.value
      recognizedText.value = finalText.value
    }
  } catch (error: any) {
    ElMessage.error(error.message || '停止识别失败')
  }

  isRecognizing.value = false
  status.value = 'connected'

  // Auto save if enabled
  if (autoSave.value && finalText.value) {
    handleSaveToNote()
  }
}

const copyText = () => {
  const textToCopy = finalText.value || recognizedText.value
  if (textToCopy) {
    navigator.clipboard.writeText(textToCopy)
    ElMessage.success('已复制到剪贴板')
  }
}

const handleSaveToNote = () => {
  const text = finalText.value || recognizedText.value
  if (!text) {
    ElMessage.warning('没有可保存的内容')
    return
  }

  // TODO: Implement save to note functionality
  ElMessage.info('保存到笔记功能开发中...')
}

const handleClearResults = () => {
  finalText.value = ''
  recognizedText.value = ''
  window.electronAPI.speechRecognition?.clearResults?.()
}

// Listen for recognition events
const setupEventListeners = () => {
  window.electronAPI.speechRecognition?.onStatusChange?.((newStatus: string) => {
    console.log('Status changed:', newStatus)
  })

  window.electronAPI.speechRecognition?.onResult?.((result: any) => {
    if (result.text) {
      recognizedText.value = result.text
    }
  })

  window.electronAPI.speechRecognition?.onFinalResult?.((result: any) => {
    if (result.text) {
      finalText.value = result.text
      recognizedText.value = result.text
    }
  })

  window.electronAPI.speechRecognition?.onError?.((error: any) => {
    ElMessage.error(error.message || '语音识别错误')
    status.value = 'error'
    isRecording.value = false
    isRecognizing.value = false
    stopDurationCounter()
    stopAudioVisualizer()
  })

  window.electronAPI.speechRecognition?.onDisconnected?.(() => {
    isConnected.value = false
    status.value = 'idle'
    isRecording.value = false
    isRecognizing.value = false
  })
}

const removeEventListeners = () => {
  // Clean up event listeners if needed
}

onMounted(() => {
  setupEventListeners()
})

onUnmounted(() => {
  if (isRecording.value) {
    handleStopRecording()
  }
  removeEventListeners()
  stopDurationCounter()
  stopAudioVisualizer()
})
</script>

<style lang="scss" scoped>
.voice-recorder {
  display: flex;
  flex-direction: column;
  gap: $spacing-base;
  padding: $spacing-base;
  background-color: var(--el-bg-color);
  border-radius: $border-radius-base;

  .recorder-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-sm $spacing-base;
    background-color: var(--el-fill-color-light);
    border-radius: $border-radius-small;

    .recording-duration {
      font-size: $font-size-large;
      font-weight: 500;
      font-family: monospace;
      color: var(--el-text-color-primary);
    }
  }

  .recognition-results {
    border: 1px solid var(--el-border-color-light);
    border-radius: $border-radius-small;
    overflow: hidden;

    .results-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: $spacing-sm $spacing-base;
      background-color: var(--el-fill-color-light);
      border-bottom: 1px solid var(--el-border-color-lighter);

      h4 {
        margin: 0;
        font-size: $font-size-base;
      }
    }

    .results-content {
      padding: $spacing-base;
      max-height: 200px;
      overflow-y: auto;

      .current-text {
        font-size: $font-size-base;
        line-height: 1.8;
        color: var(--el-text-color-primary);

        .cursor {
          animation: blink 1s infinite;
        }
      }

      .final-text {
        margin-top: $spacing-base;
        padding-top: $spacing-base;
        border-top: 1px dashed var(--el-border-color-lighter);
        font-size: $font-size-base;
        line-height: 1.8;
        color: var(--el-text-color-secondary);
      }
    }
  }

  .recorder-controls {
    display: flex;
    flex-direction: column;
    gap: $spacing-base;

    .audio-visualizer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      height: 60px;
      padding: $spacing-base;
      background-color: var(--el-fill-color-lighter);
      border-radius: $border-radius-small;

      .visualizer-bar {
        width: 4px;
        background: linear-gradient(to top, var(--el-color-primary), var(--el-color-success));
        border-radius: 2px;
        transition: height 0.1s ease;
      }
    }

    .control-buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: $spacing-base;
    }
  }

  .recorder-settings {
    padding-top: $spacing-base;
    border-top: 1px solid var(--el-border-color-lighter);

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: $spacing-sm;

      &:last-child {
        margin-bottom: 0;
      }

      label {
        font-size: $font-size-base;
        color: var(--el-text-color-primary);
      }
    }
  }
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}
</style>
