<template>
  <el-dialog
    v-model="visible"
    title="截图标注"
    :fullscreen="isFullscreen"
    :close-on-click-modal="false"
    @close="handleClose"
    class="screenshot-annotation-dialog"
  >
    <div class="annotation-container" v-loading="loading">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-group">
          <el-tooltip content="选择" placement="bottom">
            <el-button
              :type="currentTool === 'select' ? 'primary' : ''"
              :icon="'Pointer'"
              @click="setTool('select')"
              size="small"
            />
          </el-tooltip>
          <el-tooltip content="画笔" placement="bottom">
            <el-button
              :type="currentTool === 'pen' ? 'primary' : ''"
              :icon="'Edit'"
              @click="setTool('pen')"
              size="small"
            />
          </el-tooltip>
          <el-tooltip content="矩形" placement="bottom">
            <el-button
              :type="currentTool === 'rect' ? 'primary' : ''"
              @click="setTool('rect')"
              size="small"
            >
              <el-icon><CropSquare /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="箭头" placement="bottom">
            <el-button
              :type="currentTool === 'arrow' ? 'primary' : ''"
              @click="setTool('arrow')"
              size="small"
            >
              <el-icon><TopRight /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="文字" placement="bottom">
            <el-button
              :type="currentTool === 'text' ? 'primary' : ''"
              :icon="'EditPen'"
              @click="setTool('text')"
              size="small"
            />
          </el-tooltip>
        </div>

        <el-divider direction="vertical" />

        <div class="toolbar-group">
          <el-tooltip content="颜色" placement="bottom">
            <el-color-picker v-model="strokeColor" size="small" />
          </el-tooltip>
          <el-tooltip content="线条粗细" placement="bottom">
            <el-slider
              v-model="strokeWidth"
              :min="1"
              :max="20"
              style="width: 100px"
              :show-tooltip="false"
            />
          </el-tooltip>
        </div>

        <el-divider direction="vertical" />

        <div class="toolbar-group">
          <el-button
            :icon="'Delete'"
            @click="undoAnnotation"
            size="small"
            :disabled="annotations.length === 0"
          >
            撤销
          </el-button>
          <el-button
            :icon="'DeleteFilled'"
            @click="clearAnnotations"
            size="small"
            :disabled="annotations.length === 0"
          >
            清空
          </el-button>
        </div>

        <el-divider direction="vertical" />

        <div class="toolbar-group">
          <el-button
            :icon="'FullScreen'"
            @click="toggleFullscreen"
            size="small"
            circle
          />
        </div>
      </div>

      <!-- Canvas Container -->
      <div class="canvas-container" ref="containerRef">
        <canvas
          ref="canvasRef"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
        />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-checkbox v-model="insertToNote">插入到当前笔记</el-checkbox>
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'

interface Annotation {
  type: 'pen' | 'rect' | 'arrow' | 'text'
  points: { x: number; y: number }[]
  color: string
  width: number
  text?: string
}

interface Props {
  modelValue: boolean
  imageData?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [data: { dataUrl: string; insertToNote?: boolean }]
}>()

const visible = ref(props.modelValue)
const loading = ref(false)
const saving = ref(false)
const isFullscreen = ref(false)
const currentTool = ref<'select' | 'pen' | 'rect' | 'arrow' | 'text'>('select')
const strokeColor = ref('#ff0000')
const strokeWidth = ref(3)
const annotations = ref<Annotation[]>([])
const insertToNote = ref(false)

const containerRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()
const ctx = ref<CanvasRenderingContext2D | null>(null)

const isDrawing = ref(false)
const startPoint = ref<{ x: number; y: number } | null>(null)
const currentPoints = ref<{ x: number; y: number }[]>([])

const image = ref<HTMLImageElement | null>(null)

// Watch for dialog visibility changes
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
  if (newVal && props.imageData) {
    loadImage()
  }
})

watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
  if (!newVal) {
    // Reset state when closing
    annotations.value = []
    currentTool.value = 'select'
  }
})

// Load image onto canvas
const loadImage = async () => {
  if (!props.imageData || !canvasRef.value) return

  loading.value = true

  await nextTick()

  const canvas = canvasRef.value
  ctx.value = canvas.getContext('2d')

  image.value = new Image()
  image.value.onload = () => {
    if (!canvas || !ctx.value || !image.value) return

    // Set canvas size to match image
    canvas.width = image.value.width
    canvas.height = image.value.height

    // Draw image
    redrawCanvas()
    loading.value = false
  }

  image.value.onerror = () => {
    ElMessage.error('图片加载失败')
    loading.value = false
  }

  image.value.src = props.imageData
}

// Redraw canvas with image and annotations
const redrawCanvas = () => {
  if (!canvasRef.value || !ctx.value || !image.value) return

  const canvas = canvasRef.value
  const context = ctx.value

  // Clear canvas
  context.clearRect(0, 0, canvas.width, canvas.height)

  // Draw image
  context.drawImage(image.value, 0, 0)

  // Draw all annotations
  annotations.value.forEach(annotation => {
    drawAnnotation(context, annotation)
  })

  // Draw current annotation being created
  if (isDrawing.value && currentPoints.value.length > 0) {
    const currentAnnotation: Annotation = {
      type: currentTool.value as any,
      points: currentPoints.value,
      color: strokeColor.value,
      width: strokeWidth.value
    }
    drawAnnotation(context, currentAnnotation)
  }
}

// Draw a single annotation
const drawAnnotation = (context: CanvasRenderingContext2D, annotation: Annotation) => {
  context.strokeStyle = annotation.color
  context.lineWidth = annotation.width
  context.lineCap = 'round'
  context.lineJoin = 'round'

  if (annotation.type === 'pen') {
    context.beginPath()
    annotation.points.forEach((point, index) => {
      if (index === 0) {
        context.moveTo(point.x, point.y)
      } else {
        context.lineTo(point.x, point.y)
      }
    })
    context.stroke()
  } else if (annotation.type === 'rect') {
    if (annotation.points.length >= 2) {
      const start = annotation.points[0]
      const end = annotation.points[annotation.points.length - 1]
      const width = end.x - start.x
      const height = end.y - start.y
      context.strokeRect(start.x, start.y, width, height)
    }
  } else if (annotation.type === 'arrow') {
    if (annotation.points.length >= 2) {
      const start = annotation.points[0]
      const end = annotation.points[annotation.points.length - 1]
      drawArrow(context, start.x, start.y, end.x, end.y)
    }
  } else if (annotation.type === 'text' && annotation.text) {
    context.font = `${annotation.width * 5}px Arial`
    context.fillStyle = annotation.color
    if (annotation.points.length > 0) {
      context.fillText(annotation.text, annotation.points[0].x, annotation.points[0].y)
    }
  }
}

// Draw arrow
const drawArrow = (
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) => {
  const headLength = 15
  const angle = Math.atan2(toY - fromY, toX - fromX)

  context.beginPath()
  context.moveTo(fromX, fromY)
  context.lineTo(toX, toY)
  context.stroke()

  // Arrow head
  context.beginPath()
  context.moveTo(toX, toY)
  context.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6)
  )
  context.moveTo(toX, toY)
  context.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6)
  )
  context.stroke()
}

// Get mouse position relative to canvas
const getMousePos = (event: MouseEvent): { x: number; y: number } => {
  if (!canvasRef.value) return { x: 0, y: 0 }

  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasRef.value.width / rect.width
  const scaleY = canvasRef.value.height / rect.height

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  }
}

// Mouse event handlers
const handleMouseDown = (event: MouseEvent) => {
  if (currentTool.value === 'select') return

  const pos = getMousePos(event)
  isDrawing.value = true
  startPoint.value = pos
  currentPoints.value = [pos]

  if (currentTool.value === 'text') {
    const text = prompt('请输入文字:', '')
    if (text && text.trim()) {
      annotations.value.push({
        type: 'text',
        points: [pos],
        color: strokeColor.value,
        width: strokeWidth.value,
        text: text.trim()
      })
      redrawCanvas()
    }
    isDrawing.value = false
    currentPoints.value = []
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isDrawing.value) return

  const pos = getMousePos(event)

  if (currentTool.value === 'pen') {
    currentPoints.value.push(pos)
  } else if (currentTool.value === 'rect' || currentTool.value === 'arrow') {
    currentPoints.value = [startPoint.value!, pos]
  }

  redrawCanvas()
}

const handleMouseUp = () => {
  if (!isDrawing.value) return

  if (currentPoints.value.length > 0 && currentTool.value !== 'text') {
    annotations.value.push({
      type: currentTool.value as any,
      points: [...currentPoints.value],
      color: strokeColor.value,
      width: strokeWidth.value
    })
  }

  isDrawing.value = false
  startPoint.value = null
  currentPoints.value = []
  redrawCanvas()
}

// Tool selection
const setTool = (tool: typeof currentTool.value) => {
  currentTool.value = tool
}

// Undo last annotation
const undoAnnotation = () => {
  annotations.value.pop()
  redrawCanvas()
}

// Clear all annotations
const clearAnnotations = () => {
  annotations.value = []
  redrawCanvas()
}

// Toggle fullscreen
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// Handle save
const handleSave = () => {
  if (!canvasRef.value) return

  saving.value = true

  try {
    const dataUrl = canvasRef.value.toDataURL('image/png')
    emit('save', {
      dataUrl,
      insertToNote: insertToNote.value ? true : undefined
    })
    visible.value = false
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// Handle close
const handleClose = () => {
  visible.value = false
}

onBeforeUnmount(() => {
  // Cleanup
  annotations.value = []
})
</script>

<style lang="scss" scoped>
.screenshot-annotation-dialog {
  :deep(.el-dialog__body) {
    padding: 0;
  }
}

.annotation-container {
  display: flex;
  flex-direction: column;
  height: 70vh;
  background-color: #f0f0f0;

  .toolbar {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-sm;
    background-color: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-light);
    flex-wrap: wrap;

    .toolbar-group {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
    }
  }

  .canvas-container {
    flex: 1;
    overflow: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: $spacing-base;

    canvas {
      max-width: 100%;
      max-height: 100%;
      box-shadow: $box-shadow-light;
      cursor: crosshair;
    }
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
</style>
