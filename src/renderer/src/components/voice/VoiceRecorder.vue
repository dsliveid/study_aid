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
    console.log('[VoiceRecorder] 开始连接语音识别服务...')

    const settings = await window.electronAPI.settings.get?.()
    const config = settings?.data?.ai?.speech

    console.log('[VoiceRecorder] 读取到的配置:', {
      hasApiKey: !!config?.apiKey,
      hasAppId: !!config?.appId,
      hasApiSecret: !!config?.apiSecret,
      provider: config?.provider || 'N/A'
    })

    // Check configuration with detailed messages
    const missingFields: string[] = []
    if (!config?.apiKey) missingFields.push('API 密钥')
    if (!config?.appId) missingFields.push('应用 ID')
    if (!config?.apiSecret) missingFields.push('API 密钥 Secret')

    if (missingFields.length > 0) {
      const message = `语音识别服务配置不完整\n\n缺失配置项：\n${missingFields.map(f => `  • ${f}`).join('\n')}\n\n配置步骤：\n1. 点击上方导航栏的「设置」\n2. 进入「AI 服务」选项卡\n3. 在「语音识别服务」部分填写：\n   - API 密钥\n   - 应用 ID\n   - API 密钥 Secret\n4. 保存设置后重新连接`

      console.warn('[VoiceRecorder] 配置不完整:', { missingFields })

      ElMessage({
        message,
        type: 'warning',
        duration: 8000,
        dangerouslyUseHTMLString: false,
        customClass: 'config-warning-message'
      })

      status.value = 'idle'
      isConnecting.value = false
      return
    }

    console.log('[VoiceRecorder] 配置验证通过，开始初始化服务...')

    await window.electronAPI.speechRecognition?.initialize?.({
      apiKey: config.apiKey,
      appId: config.appId,
      apiSecret: config.apiSecret
    })

    console.log('[VoiceRecorder] 服务初始化完成，开始连接...')

    // The connection success message will be shown by the onConnected event listener
    await window.electronAPI.speechRecognition?.connect?.()
  } catch (error: any) {
    console.error('[VoiceRecorder] 连接失败:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    })

    status.value = 'error'
    isConnected.value = false
    // Error message will be shown by the onError event listener
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
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })

    console.log('[VoiceRecorder] 获取麦克风成功')

    // Create audio context for processing
    const audioContext = new AudioContext({
      sampleRate: 16000
    })
    const source = audioContext.createMediaStreamSource(stream)

    // 使用较小的缓冲区大小以获得更实时的音频处理
    // 2048 个采样点 @ 16000Hz = 128ms 每个音频块
    const processor = audioContext.createScriptProcessor(2048, 1, 1)

    let frameCount = 0

    processor.onaudioprocess = async (e) => {
      if (!isRecording.value) return

      frameCount++

      const audioData = e.inputBuffer.getChannelData(0)

      // Convert Float32Array to Int16Array (16-bit PCM)
      const int16Data = new Int16Array(audioData.length)
      for (let i = 0; i < audioData.length; i++) {
        const s = Math.max(-1, Math.min(1, audioData[i]))
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }

      // Convert Int16Array to Uint8Array (buffer format for IPC)
      const uint8Data = new Uint8Array(int16Data.buffer)

      // 只在开始时打印日志，避免日志过多
      if (frameCount <= 5 || frameCount % 50 === 0) {
        console.log('[VoiceRecorder] 发送音频帧:', {
          frame: frameCount,
          size: uint8Data.length,
          duration: audioData.length / 16000 // 秒
        })
      }

      try {
        await window.electronAPI.speechRecognition?.sendAudio?.(uint8Data)
      } catch (error) {
        console.error('[VoiceRecorder] 发送音频数据失败:', error)
      }
    }

    // Store for cleanup FIRST (before connecting audio nodes)
    mediaRecorder = {
      stream,
      audioContext,
      source,
      processor,
      gainNode,  // Store gainNode for cleanup
      stop: () => {
        console.log('[VoiceRecorder] 清理音频资源...')
        try {
          if (gainNode) {
            gainNode.disconnect()
          }
          processor.disconnect()
          source.disconnect()
          audioContext.close()
          stream.getTracks().forEach(track => track.stop())
          console.log('[VoiceRecorder] ✅ 音频资源清理完成')
        } catch (error) {
          console.error('[VoiceRecorder] ❌ Cleanup error:', error)
        }
      }
    } as any

    console.log('[VoiceRecorder] 音频处理器设置完成')

    // IMPORTANT: Set isRecording = true BEFORE connecting audio nodes!
    // Otherwise onaudioprocess will skip all data
    isRecording.value = true
    console.log('[VoiceRecorder] ✅ isRecording 设置为 true')

    // Create a gain node to prevent audio feedback (set volume to 0)
    // ScriptProcessorNode only works when connected to an output
    const gainNode = audioContext.createGain()
    gainNode.gain.value = 0  // Mute the output to prevent feedback

    // Connect the audio graph: source -> processor -> gainNode -> destination
    // The gainNode with volume 0 prevents audio feedback while keeping processor working
    source.connect(processor)
    processor.connect(gainNode)
    gainNode.connect(audioContext.destination)
    console.log('[VoiceRecorder] ✅ 音频节点连接完成 (包含静音输出)，音频处理回调已激活')

    // Start speech recognition
    console.log('[VoiceRecorder] 调用主进程开始识别')
    await window.electronAPI.speechRecognition?.start?.()
    console.log('[VoiceRecorder] ✅ 主进程开始识别完成')

    isRecognizing.value = true
    status.value = 'recognizing'

    // Start counters and visualizer
    startDurationCounter()
    startAudioVisualizer()

    ElMessage.info('开始录音...')
  } catch (error: any) {
    console.error('[VoiceRecorder] 启动录音失败:', error)
    ElMessage.error(error.message || '无法访问麦克风')
  } finally {
    isStarting.value = false
  }
}

const handleStopRecording = async () => {
  if (mediaRecorder && isRecording.value) {
    // Stop the custom recorder
    if (mediaRecorder.stop) {
      mediaRecorder.stop()
    }
    mediaRecorder = null
  }

  isRecording.value = false
  stopDurationCounter()
  stopAudioVisualizer()

  // Stop speech recognition
  try {
    console.log('[VoiceRecorder] 停止语音识别，当前识别文本:', recognizedText.value)
    const result = await window.electronAPI.speechRecognition?.stop?.()
    console.log('[VoiceRecorder] 停止识别结果:', result)

    if (result?.success && result.data) {
      console.log('[VoiceRecorder] 最终识别文本:', result.data.text)
      finalText.value = result.data.text || recognizedText.value
      recognizedText.value = finalText.value

      if (finalText.value) {
        ElMessage.success(`识别完成：${finalText.value.substring(0, 50)}${finalText.value.length > 50 ? '...' : ''}`)
      }
    } else {
      console.warn('[VoiceRecorder] 识别结果为空或失败:', result)
      if (!recognizedText.value) {
        ElMessage.warning('未识别到语音内容，请重试')
      }
    }
  } catch (error: any) {
    console.error('[VoiceRecorder] 停止识别失败:', error)
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

  window.electronAPI.speechRecognition?.onConnected?.(() => {
    if (isConnecting.value) {
      isConnected.value = true
      status.value = 'connected'
      ElMessage.success('语音识别服务连接成功')
    }
  })

  window.electronAPI.speechRecognition?.onResult?.((result: any) => {
    console.log('[VoiceRecorder] onResult 事件触发:', {
      hasResult: !!result,
      hasText: !!result?.text,
      text: result?.text || '(空)',
      textLength: result?.text?.length || 0,
      isFinal: result?.isFinal,
      confidence: result?.confidence
    })

    if (result && result.text) {
      recognizedText.value = result.text
      console.log('[VoiceRecorder] recognizedText 已更新:', recognizedText.value)
    } else {
      console.warn('[VoiceRecorder] onResult - result.text 为空')
    }
  })

  window.electronAPI.speechRecognition?.onFinalResult?.((result: any) => {
    console.log('[VoiceRecorder] onFinalResult 事件触发:', {
      hasResult: !!result,
      hasText: !!result?.text,
      text: result?.text || '(空)',
      textLength: result?.text?.length || 0,
      allResultsCount: result?.allResults?.length || 0
    })

    if (result && result.text) {
      finalText.value = result.text
      recognizedText.value = result.text
      console.log('[VoiceRecorder] finalText 已更新:', finalText.value)
    } else {
      console.warn('[VoiceRecorder] onFinalResult - result.text 为空')
    }
  })

  window.electronAPI.speechRecognition?.onError?.((error: any) => {
    // Only show error message and update status if we're not in the process of connecting
    // This prevents duplicate error messages during connection failures
    if (!isConnecting.value) {
      ElMessage.error(error.message || '语音识别错误')
    }
    status.value = 'error'
    isConnected.value = false
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
