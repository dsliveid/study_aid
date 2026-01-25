<template>
  <div class="settings-page">
    <h2>设置</h2>

    <el-tabs v-model="activeTab" class="settings-tabs">
      <!-- 外观设置 -->
      <el-tab-pane label="外观" name="appearance">
        <el-card class="settings-card">
          <template #header>
            <div class="card-header">
              <el-icon><Setting /></el-icon>
              <span>外观设置</span>
            </div>
          </template>

          <el-form label-width="120px">
            <el-form-item label="主题模式">
              <el-radio-group v-model="settings.theme" @change="handleThemeChange">
                <el-radio-button value="light">亮色</el-radio-button>
                <el-radio-button value="dark">暗色</el-radio-button>
                <el-radio-button value="auto">跟随系统</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="主题预览">
              <div class="theme-preview">
                <div class="preview-card" :data-theme="settings.theme">
                  <h4>预览卡片</h4>
                  <p>这是一个预览卡片，用于展示当前主题效果。</p>
                  <el-button type="primary">按钮</el-button>
                </div>
              </div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 快捷键设置 -->
      <el-tab-pane label="快捷键" name="shortcuts">
        <el-card class="settings-card">
          <template #header>
            <div class="card-header">
              <el-icon><Key /></el-icon>
              <span>快捷键设置</span>
            </div>
          </template>

          <el-form label-width="200px">
            <el-form-item label="全屏截图">
              <el-input
                v-model="settings.shortcuts.screenshot"
                placeholder="例如: Ctrl+Alt+S"
                @blur="handleShortcutChange('screenshot')"
              />
            </el-form-item>

            <el-form-item label="语音识别">
              <el-input
                v-model="settings.shortcuts.voiceRecord"
                placeholder="例如: Ctrl+Alt+V"
                @blur="handleShortcutChange('voiceRecord')"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="registerShortcuts">
                注册快捷键
              </el-button>
              <el-button @click="unregisterShortcuts">
                注销快捷键
              </el-button>
            </el-form-item>
          </el-form>

          <el-divider />

          <div class="shortcuts-info">
            <p><strong>快捷键说明：</strong></p>
            <ul>
              <li>使用 Ctrl、Alt、Shift 等修饰键组合</li>
              <li>例如：Ctrl+Alt+S 表示同时按 Ctrl、Alt 和 S 键</li>
              <li>快捷键注册后生效，可能需要重启应用</li>
            </ul>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- AI 服务设置 -->
      <el-tab-pane label="AI 服务" name="ai">
        <el-card class="settings-card">
          <template #header>
            <div class="card-header">
              <el-icon><Connection /></el-icon>
              <span>AI 服务配置</span>
            </div>
          </template>

          <el-form label-width="150px">
            <!-- 语音识别服务 -->
            <div class="service-section">
              <h4>语音识别服务</h4>
              <el-form-item label="服务商">
                <el-select v-model="settings.ai.speech.provider" @change="handleSpeechProviderChange">
                  <el-option label="科大讯飞" value="xunfei" />
                  <el-option label="Azure Speech" value="azure" />
                  <el-option label="腾讯云" value="tencent" />
                </el-select>
              </el-form-item>

              <el-form-item label="API 密钥">
                <el-input
                  v-model="settings.ai.speech.apiKey"
                  type="password"
                  show-password
                  placeholder="请输入API密钥"
                  @blur="saveSettings"
                />
              </el-form-item>

              <el-form-item label="应用 ID">
                <el-input
                  v-model="settings.ai.speech.appId"
                  placeholder="请输入应用ID（部分服务商需要）"
                  @blur="saveSettings"
                />
              </el-form-item>
            </div>

            <el-divider />

            <!-- 图像识别服务 -->
            <div class="service-section">
              <h4>图像识别服务</h4>
              <el-form-item label="服务商">
                <el-select v-model="settings.ai.image.provider" @change="handleImageProviderChange">
                  <el-option label="百度OCR" value="baidu" />
                  <el-option label="通义千问VL" value="qwen" />
                  <el-option label="腾讯OCR" value="tencent" />
                </el-select>
              </el-form-item>

              <el-form-item label="API 密钥">
                <el-input
                  v-model="settings.ai.image.apiKey"
                  type="password"
                  show-password
                  placeholder="请输入API密钥"
                  @blur="saveSettings"
                />
              </el-form-item>

              <el-form-item label="Secret Key">
                <el-input
                  v-model="settings.ai.image.secretKey"
                  type="password"
                  show-password
                  placeholder="请输入Secret Key（百度OCR需要）"
                  @blur="saveSettings"
                />
              </el-form-item>
            </div>

            <el-divider />

            <!-- 内容生成服务 -->
            <div class="service-section">
              <h4>内容生成服务</h4>
              <el-form-item label="服务商">
                <el-select v-model="settings.ai.content.provider" @change="handleContentProviderChange">
                  <el-option label="DeepSeek" value="deepseek" />
                  <el-option label="Kimi (月之暗面)" value="kimi" />
                  <el-option label="OpenAI GPT-4" value="openai" />
                </el-select>
              </el-form-item>

              <el-form-item label="API 密钥">
                <el-input
                  v-model="settings.ai.content.apiKey"
                  type="password"
                  show-password
                  placeholder="请输入API密钥"
                  @blur="saveSettings"
                />
              </el-form-item>

              <el-form-item label="API 端点">
                <el-input
                  v-model="settings.ai.content.baseUrl"
                  placeholder="自定义API端点（可选）"
                  @blur="saveSettings"
                />
              </el-form-item>
            </div>

            <el-form-item>
              <el-button type="primary" @click="testAllServices" :loading="testing">
                测试所有服务
              </el-button>
              <el-button @click="saveSettings">
                保存配置
              </el-button>
            </el-form-item>
          </el-form>

          <el-alert
            title="提示"
            type="info"
            :closable="false"
            show-icon
          >
            API密钥将加密保存在本地，不会上传到云端。
          </el-alert>
        </el-card>
      </el-tab-pane>

      <!-- 存储设置 -->
      <el-tab-pane label="存储" name="storage">
        <el-card class="settings-card">
          <template #header>
            <div class="card-header">
              <el-icon><Folder /></el-icon>
              <span>存储设置</span>
            </div>
          </template>

          <el-form label-width="150px">
            <el-form-item label="数据存储路径">
              <el-input
                v-model="settings.storage.dataPath"
                placeholder="默认路径"
                readonly
              >
                <template #append>
                  <el-button @click="selectDataPath">选择</el-button>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="截图保存路径">
              <el-input
                v-model="settings.storage.screenshotPath"
                placeholder="默认路径"
                readonly
              >
                <template #append>
                  <el-button @click="selectScreenshotPath">选择</el-button>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveSettings">
                保存配置
              </el-button>
              <el-button @click="openDataFolder">
                打开数据文件夹
              </el-button>
            </el-form-item>
          </el-form>

          <el-divider />

          <div class="storage-info">
            <h4>存储信息</h4>
            <p><strong>数据存储位置：</strong>{{ settings.storage.dataPath }}</p>
            <p><strong>数据大小：</strong>{{ storageSize }}</p>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 关于 -->
      <el-tab-pane label="关于" name="about">
        <el-card class="settings-card">
          <template #header>
            <div class="card-header">
              <el-icon><InfoFilled /></el-icon>
              <span>关于</span>
            </div>
          </template>

          <div class="about-content">
            <div class="app-info">
              <h3>桌面学习助手</h3>
              <p>Desktop Learning Assistant</p>
              <p>版本：1.0.0</p>
            </div>

            <el-divider />

            <div class="links">
              <p><strong>相关链接：</strong></p>
              <el-space direction="vertical" :size="8">
                <a href="https://github.com" target="_blank">GitHub 仓库</a>
                <a href="#" @click="openDocs">使用文档</a>
                <a href="#" @click="openLicense">开源许可</a>
                <a href="#" @click="checkUpdate">检查更新</a>
              </el-space>
            </div>

            <el-divider />

            <div class="tech-stack">
              <p><strong>技术栈：</strong></p>
              <el-tag v-for="tech in techStack" :key="tech" size="small">
                {{ tech }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Setting,
  Key,
  Connection,
  Folder,
  InfoFilled
} from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
import type { Settings } from '@/types'

const appStore = useAppStore()
const activeTab = ref('appearance')
const testing = ref(false)

// Default settings
const defaultSettings: Settings = {
  theme: 'auto',
  shortcuts: {
    screenshot: 'CommandOrControl+Shift+S',
    voiceRecord: 'CommandOrControl+Shift+V'
  },
  ai: {
    speech: {
      provider: 'xunfei',
      apiKey: '',
      appId: ''
    },
    image: {
      provider: 'qwen',
      apiKey: '',
      secretKey: ''
    },
    content: {
      provider: 'deepseek',
      apiKey: '',
      baseUrl: ''
    }
  },
  storage: {
    dataPath: '',
    screenshotPath: ''
  }
}

const settings = ref<Settings>({ ...defaultSettings })

// Tech stack info
const techStack = [
  'Electron',
  'Vue 3',
  'TypeScript',
  'Element Plus',
  'Pinia',
  'SQLite'
]

// Storage size (mock for now)
const storageSize = ref('计算中...')

// Initialize settings from store
onMounted(async () => {
  try {
    // Load settings from store or electron store (already deep-merged in loadSettings)
    const savedSettings = await loadSettings()
    if (savedSettings) {
      settings.value = savedSettings
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }

  // Initialize storage path if not set
  if (!settings.value.storage.dataPath) {
    const paths = await window.electronAPI.settings.getPaths?.()
    if (paths) {
      settings.value.storage.dataPath = paths.userData
      settings.value.storage.screenshotPath = paths.userData + '/screenshots'
    }
  }

  // Calculate storage size
  calculateStorageSize()
})

async function loadSettings(): Promise<Settings | null> {
  // Try to load from electron store
  const result = await window.electronAPI.settings.get?.()
  if (!result?.success || !result.data) {
    return null
  }

  // Perform deep merge to preserve nested defaults
  const savedSettings = result.data
  return {
    theme: savedSettings.theme ?? defaultSettings.theme,
    shortcuts: { ...defaultSettings.shortcuts, ...savedSettings.shortcuts },
    ai: {
      speech: { ...defaultSettings.ai.speech, ...savedSettings.ai?.speech },
      image: { ...defaultSettings.ai.image, ...savedSettings.ai?.image },
      content: { ...defaultSettings.ai.content, ...savedSettings.ai?.content }
    },
    storage: { ...defaultSettings.storage, ...savedSettings.storage }
  }
}

function handleThemeChange(value: 'light' | 'dark' | 'auto') {
  settings.value.theme = value
  appStore.setTheme(value)
  saveSettings()
}

function handleShortcutChange(key: string) {
  console.log(`Shortcut changed: ${key} = ${settings.value.shortcuts[key as keyof typeof settings.value.shortcuts]}`)
  saveSettings()
}

async function handleSpeechProviderChange() {
  // Initialize speech recognition service with new config
  try {
    const speechConfig = settings.value.ai.speech
    await window.electronAPI.speechRecognition.initialize?.(speechConfig)
    await saveSettings()
  } catch (error: any) {
    console.error('Failed to initialize speech recognition:', error)
  }
}

async function handleImageProviderChange() {
  // Initialize image recognition service with new config
  try {
    const imageConfig = settings.value.ai.image
    const config = {
      ocr: {
        provider: imageConfig.provider as any,
        baidu: imageConfig.provider === 'baidu' ? {
          apiKey: imageConfig.apiKey,
          secretKey: imageConfig.secretKey
        } : undefined
      }
    }
    await window.electronAPI.imageRecognition.initialize?.(config)
    await saveSettings()
  } catch (error: any) {
    console.error('Failed to initialize image recognition:', error)
  }
}

async function handleContentProviderChange() {
  // Initialize AI content service with new config
  try {
    const contentConfig = settings.value.ai.content
    await window.electronAPI.aiContent.initialize?.({
      apiKey: contentConfig.apiKey,
      baseUrl: contentConfig.baseUrl,
      model: contentConfig.provider === 'deepseek' ? 'deepseek-chat' :
             contentConfig.provider === 'kimi' ? 'moonshot-v1-8k' :
             contentConfig.provider === 'openai' ? 'gpt-4' : 'deepseek-chat'
    })
    await saveSettings()
  } catch (error: any) {
    console.error('Failed to initialize AI content service:', error)
  }
}

async function saveSettings() {
  try {
    await window.electronAPI.settings.set?.(settings.value)
    ElMessage.success('设置已保存')
  } catch (error: any) {
    ElMessage.error(error.message || '保存设置失败')
  }
}

async function registerShortcuts() {
  try {
    const screenshotResult = await window.electronAPI.screenshot.registerShortcut?.(settings.value.shortcuts.screenshot)
    if (screenshotResult?.success) {
      ElMessage.success('快捷键注册成功')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '快捷键注册失败')
  }
}

async function unregisterShortcuts() {
  try {
    await window.electronAPI.screenshot.unregisterShortcut?.(settings.value.shortcuts.screenshot)
    ElMessage.success('快捷键已注销')
  } catch (error: any) {
    ElMessage.error(error.message || '快捷键注销失败')
  }
}

async function testAllServices() {
  testing.value = true
  const results: string[] = []

  try {
    // Test AI content generation service
    const contentService = settings.value.ai.content
    if (contentService.apiKey) {
      try {
        const testConfig = {
          apiKey: contentService.apiKey,
          baseUrl: contentService.baseUrl || undefined,
          model: contentService.provider === 'deepseek' ? 'deepseek-chat' :
                 contentService.provider === 'kimi' ? 'moonshot-v1-8k' :
                 contentService.provider === 'openai' ? 'gpt-4' : 'deepseek-chat'
        }

        const result = await window.electronAPI.aiContent.test?.(testConfig)
        if (result?.success) {
          results.push('✓ AI内容生成服务测试成功')
        } else {
          results.push(`✗ AI内容生成服务测试失败: ${result?.error || '未知错误'}`)
        }
      } catch (error: any) {
        results.push(`✗ AI内容生成服务测试失败: ${error.message || '未知错误'}`)
      }
    } else {
      results.push('- AI内容生成服务: 未配置API密钥')
    }

    // Test speech recognition service
    const speechService = settings.value.ai.speech
    if (speechService.apiKey && speechService.appId) {
      try {
        const result = await window.electronAPI.speechRecognition.test?.(speechService)
        if (result?.success) {
          results.push('✓ 语音识别服务测试成功')
        } else {
          results.push(`✗ 语音识别服务测试失败: ${result?.error || '未知错误'}`)
        }
      } catch (error: any) {
        results.push(`✗ 语音识别服务测试失败: ${error.message || '未知错误'}`)
      }
    } else {
      results.push('- 语音识别服务: 未配置完整API信息')
    }

    // Test image recognition service
    const imageService = settings.value.ai.image
    if (imageService.apiKey) {
      try {
        const config = {
          ocr: {
            provider: imageService.provider as any,
            baidu: imageService.provider === 'baidu' ? {
              apiKey: imageService.apiKey,
              secretKey: imageService.secretKey || ''
            } : undefined
          }
        }
        const result = await window.electronAPI.imageRecognition.test?.(config)
        if (result?.success) {
          results.push('✓ 图像识别服务测试成功')
        } else {
          results.push(`✗ 图像识别服务测试失败: ${result?.error || '未知错误'}`)
        }
      } catch (error: any) {
        results.push(`✗ 图像识别服务测试失败: ${error.message || '未知错误'}`)
      }
    } else {
      results.push('- 图像识别服务: 未配置API密钥')
    }

    // Display results
    ElMessage({
      message: results.join('\n'),
      type: results.some(r => r.startsWith('✗')) ? 'warning' : 'success',
      duration: 5000,
      dangerouslyUseHTMLString: false,
      customClass: 'test-results-message'
    })

    // Also log to console for better visibility
    console.log('Service Test Results:', results.join('\n'))
  } catch (error: any) {
    ElMessage.error(error.message || '服务测试失败')
  } finally {
    testing.value = false
  }
}

async function selectDataPath() {
  try {
    const result = await window.electronAPI.settings.selectDataPath?.()
    if (result?.success) {
      settings.value.storage.dataPath = result.data
      await saveSettings()
      ElMessage.success('数据存储路径已更新')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '选择文件夹失败')
  }
}

async function selectScreenshotPath() {
  try {
    const result = await window.electronAPI.settings.selectScreenshotPath?.()
    if (result?.success) {
      settings.value.storage.screenshotPath = result.data
      await saveSettings()
      ElMessage.success('截图保存路径已更新')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '选择文件夹失败')
  }
}

async function openDataFolder() {
  try {
    await window.electronAPI.settings.openDataFolder?.()
  } catch (error: any) {
    ElMessage.error(error.message || '打开文件夹失败')
  }
}

async function calculateStorageSize() {
  try {
    const result = await window.electronAPI.settings.calculateStorageSize?.()
    if (result?.success) {
      storageSize.value = result.data
    }
  } catch (error: any) {
    console.error('Failed to calculate storage size:', error)
    storageSize.value = '未知'
  }
}

function openDocs() {
  ElMessage.info('使用文档功能开发中')
}

function openLicense() {
  ElMessage.info('开源许可信息功能开发中')
}

function checkUpdate() {
  ElMessage.info('检查更新功能开发中')
}
</script>

<style lang="scss" scoped>
.settings-page {
  padding: $spacing-xl;
  max-width: 900px;
  margin: 0 auto;

  h2 {
    margin-bottom: $spacing-xl;
  }
}

.settings-tabs {
  :deep(.el-tabs__content) {
    padding-top: $spacing-lg;
  }
}

.settings-card {
  margin-bottom: $spacing-lg;

  .card-header {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    .el-icon {
      font-size: 20px;
    }
  }
}

.service-section {
  margin-bottom: $spacing-lg;
  padding: $spacing-base;
  background-color: var(--el-fill-color-light);
  border-radius: $border-radius-base;

  h4 {
    margin: 0 0 $spacing-base 0;
    font-size: $font-size-medium;
    color: var(--el-text-color-primary);
  }
}

.shortcuts-info {
  margin-top: $spacing-lg;
  padding: $spacing-base;
  background-color: var(--el-fill-color-light);
  border-radius: $border-radius-base;

  ul {
    margin: $spacing-sm 0 0 0 $spacing-lg;
    li {
      margin-bottom: $spacing-xs;
      color: var(--el-text-color-secondary);
    }
  }
}

.storage-info {
  margin-top: $spacing-lg;
  padding: $spacing-base;
  background-color: var(--el-fill-color-light);
  border-radius: $border-radius-base;

  h4 {
    margin: 0 0 $spacing-sm 0;
    font-size: $font-size-medium;
  }

  p {
    margin: $spacing-xs 0;
    color: var(--el-text-color-secondary);
  }
}

.about-content {
  .app-info {
    text-align: center;
    margin-bottom: $spacing-xl;

    h3 {
      margin: 0 0 $spacing-sm 0;
      font-size: $font-size-extra-large;
    }

    p {
      margin: $spacing-xs 0;
      color: var(--el-text-color-secondary);
    }
  }

  .links {
    a {
      color: var(--el-color-primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .tech-stack {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;

    .el-tag {
      margin: 0;
    }
  }
}

.theme-preview {
  .preview-card {
    padding: $spacing-base;
    background-color: var(--el-bg-color);
    border: 1px solid var(--el-border-color);
    border-radius: $border-radius-base;
    max-width: 300px;

    h4 {
      margin: 0 0 $spacing-sm 0;
    }

    p {
      margin-bottom: $spacing-sm;
      color: var(--el-text-color-secondary);
    }
  }
}

// Theme preview styles
[data-theme="light"] .preview-card {
  background-color: #ffffff;
  color: #303133;
}

[data-theme="dark"] .preview-card {
  background-color: #1d1d1d;
  color: #e5e5e5;
}
</style>
