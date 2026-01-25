<template>
  <div class="document-learning-page">
    <!-- Empty State -->
    <div v-if="!currentDocument" class="empty-state">
      <el-upload
        class="document-upload"
        drag
        :auto-upload="false"
        :on-change="handleFileSelect"
        accept=".pdf,.docx,.txt"
      >
        <el-icon class="el-icon--upload"><DocumentAdd /></el-icon>
        <div class="el-upload__text">
          拖拽文档到此处或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 PDF、DOCX、TXT 格式文档
          </div>
        </template>
      </el-upload>
    </div>

    <!-- Document View -->
    <div v-else class="document-view">
      <!-- Document Header -->
      <div class="document-header">
        <el-button :icon="'ArrowLeft'" @click="closeDocument">返回</el-button>
        <div class="document-info">
          <h3>{{ currentDocument.name }}</h3>
          <el-tag size="small">{{ currentDocument.type?.toUpperCase() }}</el-tag>
        </div>
        <div class="header-actions">
          <el-button
            type="primary"
            :icon="MagicStick"
            :loading="generating"
            @click="generateKnowledge"
          >
            生成知识目录
          </el-button>
          <el-button
            type="success"
            :icon="Star"
            :loading="generating"
            @click="markKeyPoints"
          >
            标记要点
          </el-button>
          <el-button
            type="warning"
            :icon="WarningFilled"
            :loading="generating"
            @click="markDifficulties"
          >
            标注疑难点
          </el-button>
        </div>
      </div>

      <div class="document-content">
        <!-- Document Text -->
        <div class="document-panel">
          <div class="panel-header">
            <h4>文档内容</h4>
            <el-button size="small" text @click="copyContent">复制</el-button>
          </div>
          <div class="panel-body document-text">
            {{ currentDocument.content }}
          </div>
        </div>

        <!-- AI Generated Content -->
        <div class="ai-panel">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="知识目录" name="knowledge">
              <div v-if="knowledgeTree" class="knowledge-tree-container">
                <div class="tree-header">
                  <h4>{{ knowledgeTree.title }}</h4>
                  <el-tag :type="getImportanceType(getMaxImportance(knowledgeTree.structure))">
                    {{ getImportanceLabel(getMaxImportance(knowledgeTree.structure)) }}
                  </el-tag>
                </div>
                <KnowledgeTreeNode :node="{ title: knowledgeTree.title, level: 0, importance: 'high', children: knowledgeTree.structure }" />
              </div>
              <el-empty v-else description="点击生成知识目录按钮生成" />
            </el-tab-pane>

            <el-tab-pane label="要点标记" name="keyPoints">
              <div v-if="keyPoints && keyPoints.keyPoints.length > 0" class="key-points-list">
                <div
                  v-for="(point, index) in keyPoints.keyPoints"
                  :key="index"
                  class="key-point-item"
                >
                  <div class="point-header">
                    <el-tag :type="getImportanceType(point.importance)" size="small">
                      {{ getImportanceLabel(point.importance) }}
                    </el-tag>
                    <span v-if="point.location" class="point-location">{{ point.location }}</span>
                  </div>
                  <div class="point-content">{{ point.content }}</div>
                </div>
              </div>
              <el-empty v-else description="点击标记要点按钮生成" />
            </el-tab-pane>

            <el-tab-pane label="疑难点" name="difficulties">
              <div v-if="difficultPoints && difficultPoints.difficultPoints.length > 0" class="difficult-points-list">
                <el-collapse>
                  <el-collapse-item
                    v-for="(point, index) in difficultPoints.difficultPoints"
                    :key="index"
                    :name="index"
                  >
                    <template #title>
                      <div class="difficulty-title">
                        <el-tag :type="getDifficultyType(point.difficulty)" size="small">
                          {{ getDifficultyLabel(point.difficulty) }}
                        </el-tag>
                        <span class="difficulty-content">{{ point.content }}</span>
                        <span v-if="point.location" class="point-location">{{ point.location }}</span>
                      </div>
                    </template>
                    <div class="difficulty-explanation">
                      <p><strong>说明：</strong></p>
                      <p>{{ point.explanation }}</p>
                    </div>
                  </el-collapse-item>
                </el-collapse>
              </div>
              <el-empty v-else description="点击标注疑难点按钮生成" />
            </el-tab-pane>
          </el-tabs>

          <div class="panel-actions">
            <el-button
              v-if="hasContent()"
              type="primary"
              size="small"
              @click="saveToNote"
            >
              保存到笔记
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentAdd, MagicStick, Star, WarningFilled } from '@element-plus/icons-vue'
import { detectFileType } from '@/utils/fileType'
import KnowledgeTreeNode from '@/components/document/KnowledgeTreeNode.vue'
import type {
  KnowledgeTreeResult,
  KeyPointsResult,
  DifficultPointsResult
} from '@/types'

interface Document {
  name: string
  type: string
  content: string
  pages?: number
}

const currentDocument = ref<Document | null>(null)
const generating = ref(false)
const activeTab = ref('knowledge')
const knowledgeTree = ref<KnowledgeTreeResult | null>(null)
const keyPoints = ref<KeyPointsResult | null>(null)
const difficultPoints = ref<DifficultPointsResult | null>(null)

// Check if AI service is configured
const isAIConfigured = ref(false)

// Load AI service configuration on mount
const checkAIConfig = async () => {
  try {
    const settings = await window.electronAPI.settings.get?.()
    if (settings?.success && settings.data?.ai?.content?.apiKey) {
      isAIConfigured.value = true
    }
  } catch (error) {
    console.error('Failed to check AI config:', error)
  }
}

// Initialize
checkAIConfig()

const handleFileSelect = async (file: any) => {
  const fileType = detectFileType(file.name)
  if (fileType === 'unknown') {
    ElMessage.error('不支持的文件格式，请上传 PDF、DOCX 或 TXT 文件')
    return
  }

  try {
    const buffer = await file.raw.arrayBuffer()
    const result = await window.electronAPI.document?.parse(Buffer.from(buffer), fileType)
    if (result?.success && result.data) {
      currentDocument.value = {
        name: file.name,
        type: fileType,
        content: result.data.text,
        pages: result.data.pages
      }
      ElMessage.success('文档解析成功')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '文档解析失败')
  }
}

const closeDocument = () => {
  currentDocument.value = null
  knowledgeTree.value = ''
  keyPoints.value = ''
  difficultPoints.value = ''
}

const generateKnowledge = async () => {
  if (!isAIConfigured.value) {
    ElMessage.warning('请先在设置中配置AI内容生成服务的API密钥')
    return
  }

  if (!currentDocument.value?.content) {
    ElMessage.error('请先上传文档')
    return
  }

  generating.value = true
  try {
    const settings = await window.electronAPI.settings.get?.()
    const config = settings?.data?.ai?.content

    if (!config) {
      ElMessage.error('AI服务配置未找到，请检查设置')
      return
    }

    // Initialize AI service
    await window.electronAPI.aiContent?.initialize?.({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || undefined,
      model: 'deepseek-chat'
    })

    // Generate knowledge tree
    const result = await window.electronAPI.aiContent?.generateKnowledgeTree?.(currentDocument.value.content)

    if (result?.success && result.data) {
      knowledgeTree.value = result.data
      activeTab.value = 'knowledge'
      ElMessage.success('知识目录生成成功')
    } else {
      ElMessage.error(result?.error || '生成失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '生成失败')
  } finally {
    generating.value = false
  }
}

const markKeyPoints = async () => {
  if (!isAIConfigured.value) {
    ElMessage.warning('请先在设置中配置AI内容生成服务的API密钥')
    return
  }

  if (!currentDocument.value?.content) {
    ElMessage.error('请先上传文档')
    return
  }

  generating.value = true
  try {
    const settings = await window.electronAPI.settings.get?.()
    const config = settings?.data?.ai?.content

    if (!config) {
      ElMessage.error('AI服务配置未找到，请检查设置')
      return
    }

    // Initialize AI service
    await window.electronAPI.aiContent?.initialize?.({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || undefined,
      model: 'deepseek-chat'
    })

    // Extract key points
    const result = await window.electronAPI.aiContent?.extractKeyPoints?.(currentDocument.value.content)

    if (result?.success && result.data) {
      keyPoints.value = result.data
      activeTab.value = 'keyPoints'
      ElMessage.success('要点标记成功')
    } else {
      ElMessage.error(result?.error || '生成失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '生成失败')
  } finally {
    generating.value = false
  }
}

const markDifficulties = async () => {
  if (!isAIConfigured.value) {
    ElMessage.warning('请先在设置中配置AI内容生成服务的API密钥')
    return
  }

  if (!currentDocument.value?.content) {
    ElMessage.error('请先上传文档')
    return
  }

  generating.value = true
  try {
    const settings = await window.electronAPI.settings.get?.()
    const config = settings?.data?.ai?.content

    if (!config) {
      ElMessage.error('AI服务配置未找到，请检查设置')
      return
    }

    // Initialize AI service
    await window.electronAPI.aiContent?.initialize?.({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || undefined,
      model: 'deepseek-chat'
    })

    // Annotate difficult points
    const result = await window.electronAPI.aiContent?.annotateDifficultPoints?.(currentDocument.value.content)

    if (result?.success && result.data) {
      difficultPoints.value = result.data
      activeTab.value = 'difficulties'
      ElMessage.success('疑难点标注成功')
    } else {
      ElMessage.error(result?.error || '生成失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '生成失败')
  } finally {
    generating.value = false
  }
}

const copyContent = () => {
  if (currentDocument.value?.content) {
    navigator.clipboard.writeText(currentDocument.value.content)
    ElMessage.success('已复制到剪贴板')
  }
}

const saveToNote = () => {
  ElMessage.info('保存到笔记功能开发中...')
}

// Helper functions for displaying AI results
const getImportanceType = (importance: string) => {
  const types: Record<string, any> = {
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return types[importance] || 'info'
}

const getImportanceLabel = (importance: string) => {
  const labels: Record<string, string> = {
    high: '重要',
    medium: '中等',
    low: '一般'
  }
  return labels[importance] || '一般'
}

const getDifficultyType = (difficulty: string) => {
  const types: Record<string, any> = {
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return types[difficulty] || 'info'
}

const getDifficultyLabel = (difficulty: string) => {
  const labels: Record<string, string> = {
    high: '难点',
    medium: '较难',
    low: '一般'
  }
  return labels[difficulty] || '一般'
}

const getMaxImportance = (nodes: any[]): string => {
  if (!nodes || nodes.length === 0) return 'low'
  let maxImportance = 'low'
  const importanceOrder = ['low', 'medium', 'high']

  for (const node of nodes) {
    if (importanceOrder.indexOf(node.importance) > importanceOrder.indexOf(maxImportance)) {
      maxImportance = node.importance
    }
    if (node.children && node.children.length > 0) {
      const childMax = getMaxImportance(node.children)
      if (importanceOrder.indexOf(childMax) > importanceOrder.indexOf(maxImportance)) {
        maxImportance = childMax
      }
    }
  }

  return maxImportance
}

const hasContent = () => {
  return (activeTab.value === 'knowledge' && knowledgeTree.value) ||
         (activeTab.value === 'keyPoints' && keyPoints.value?.keyPoints.length) ||
         (activeTab.value === 'difficulties' && difficultPoints.value?.difficultPoints.length)
}
</script>

<style lang="scss" scoped>
.document-learning-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: $spacing-lg;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;

  .document-upload {
    width: 100%;
    max-width: 600px;
  }
}

.document-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-base;
  overflow: hidden;
}

.document-header {
  display: flex;
  align-items: center;
  gap: $spacing-base;
  padding: $spacing-base;
  background-color: var(--el-bg-color);
  border-radius: $border-radius-base;

  .document-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: $spacing-base;

    h3 {
      margin: 0;
      font-size: $font-size-large;
    }
  }

  .header-actions {
    display: flex;
    gap: $spacing-sm;
  }
}

.document-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-base;
  overflow: hidden;
}

.document-panel,
.ai-panel {
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

    h4 {
      margin: 0;
      font-size: $font-size-medium;
    }
  }

  .panel-body {
    flex: 1;
    padding: $spacing-base;
    overflow-y: auto;
  }
}

.document-text {
  white-space: pre-wrap;
  line-height: 1.8;
  font-size: $font-size-base;
}

.ai-panel {
  .panel-body {
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  :deep(.el-tabs) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .el-tabs__content {
      flex: 1;
      overflow-y: auto;
    }
  }

  // Knowledge Tree Styles
  .knowledge-tree-container {
    padding: $spacing-base;

    .tree-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: $spacing-base;
      padding-bottom: $spacing-sm;
      border-bottom: 1px solid var(--el-border-color-lighter);

      h4 {
        margin: 0;
        font-size: $font-size-large;
      }
    }
  }

  // Key Points Styles
  .key-points-list {
    padding: $spacing-base;

    .key-point-item {
      margin-bottom: $spacing-base;
      padding: $spacing-sm;
      background-color: var(--el-fill-color-light);
      border-radius: $border-radius-small;
      border-left: 3px solid var(--el-color-primary);

      .point-header {
        display: flex;
        align-items: center;
        gap: $spacing-xs;
        margin-bottom: $spacing-xs;

        .point-location {
          font-size: $font-size-small;
          color: var(--el-text-color-secondary);
        }
      }

      .point-content {
        line-height: 1.6;
        color: var(--el-text-color-primary);
      }
    }
  }

  // Difficult Points Styles
  .difficult-points-list {
    padding: $spacing-base;

    :deep(.el-collapse) {
      border: none;

      .el-collapse-item {
        margin-bottom: $spacing-sm;

        .el-collapse-item__header {
          background-color: var(--el-fill-color-light);
          border-radius: $border-radius-small;
          padding: $spacing-xs $spacing-sm;
          height: auto;
          line-height: 1.5;

          &:hover {
            background-color: var(--el-fill-color);
          }
        }

        .el-collapse-item__wrap {
          border: none;
          background-color: var(--el-fill-color-lighter);
          border-radius: $border-radius-small;
          margin-top: $spacing-xs;

          .el-collapse-item__content {
            padding: $spacing-sm;
          }
        }
      }
    }

    .difficulty-title {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
      flex: 1;

      .difficulty-content {
        flex: 1;
        font-weight: 500;
      }

      .point-location {
        font-size: $font-size-small;
        color: var(--el-text-color-secondary);
      }
    }

    .difficulty-explanation {
      p {
        margin: $spacing-xs 0;
        line-height: 1.6;
      }
    }
  }

  .panel-actions {
    padding: $spacing-base;
    border-top: 1px solid var(--el-border-color-lighter);
    display: flex;
    justify-content: flex-end;
    gap: $spacing-sm;
  }
}
</style>
