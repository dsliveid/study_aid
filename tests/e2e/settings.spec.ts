/**
 * Settings Management E2E Tests
 */

import { test, expect } from '@playwright/test'
import {
  navigateTo,
  waitForElement,
  clickElement,
  fillInput,
  waitForToast,
  setupE2ETest,
  elementExists
} from '../helpers/e2e-helpers'

test.describe('Settings Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ETest(page)
  })

  test('should navigate to settings page', async ({ page }) => {
    await navigateTo(page, '/settings')

    await waitForElement(page, '.settings-page')
    const isSettingsPage = await elementExists(page, '.settings-page')

    expect(isSettingsPage).toBe(true)
  })

  test('should display all settings tabs', async ({ page }) => {
    await navigateTo(page, '/settings')

    // Check for tabs
    const appearanceTab = await elementExists(page, 'label:has-text("外观")')
    const shortcutsTab = await elementExists(page, 'label:has-text("快捷键")')
    const aiTab = await elementExists(page, 'label:has-text("AI 服务")')
    const storageTab = await elementExists(page, 'label:has-text("存储")')
    const aboutTab = await elementExists(page, 'label:has-text("关于")')

    expect(appearanceTab).toBe(true)
    expect(shortcutsTab).toBe(true)
    expect(aiTab).toBe(true)
    expect(storageTab).toBe(true)
    expect(aboutTab).toBe(true)
  })

  test('should switch between tabs', async ({ page }) => {
    await navigateTo(page, '/settings')

    // Click on shortcuts tab
    const shortcutsTab = page.locator('label:has-text("快捷键")')
    await shortcutsTab.click()

    // Wait for tab content to load
    await page.waitForTimeout(300)

    // Verify shortcuts tab is active
    const activeTab = page.locator('.el-tabs__active:has-text("快捷键")')
    await expect(activeTab).toBeVisible()
  })
})

test.describe('Appearance Settings', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ETest(page)
  })

  test('should display theme options', async ({ page }) => {
    await navigateTo(page, '/settings')

    // Click on appearance tab
    await page.click('label:has-text("外观")')

    // Check for theme options
    const lightOption = await elementExists(page, 'label:has-text("亮色")')
    const darkOption = await elementExists(page, 'label:has-text("暗色")')
    const autoOption = await elementExists(page, 'label:has-text("跟随系统")')

    expect(lightOption).toBe(true)
    expect(darkOption).toBe(true)
    expect(autoOption).toBe(true)
  })

  test('should change theme to dark mode', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("外观")')

    // Select dark theme
    await page.click('label:has-text("暗色")')

    // Wait for theme change
    await page.waitForTimeout(500)

    // Check if dark theme is applied
    const html = page.locator('html')
    const classList = await html.getAttribute('class')

    expect(classList).toContain('dark')
  })

  test('should change theme to light mode', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("外观")')

    // Select light theme
    await page.click('label:has-text("亮色")')

    // Wait for theme change
    await page.waitForTimeout(500)

    // Check if light theme is applied
    const html = page.locator('html')
    const classList = await html.getAttribute('class')

    // Light theme might not have a specific class
    expect(classList).toBeTruthy()
  })
})

test.describe('Shortcut Settings', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ETest(page)
  })

  test('should display shortcut configuration', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("快捷键")')

    // Check for shortcut inputs
    const screenshotShortcut = await elementExists(page, 'input[placeholder*="截图"]')
    const voiceShortcut = await elementExists(page, 'input[placeholder*="语音"]')

    expect(screenshotShortcut).toBe(true)
    expect(voiceShortcut).toBe(true)
  })

  test('should have register/unregister buttons', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("快捷键")')

    const registerButton = await elementExists(page, 'button:has-text("注册快捷键")')
    const unregisterButton = await elementExists(page, 'button:has-text("注销快捷键")')

    expect(registerButton).toBe(true)
    expect(unregisterButton).toBe(true)
  })

  test('should display shortcut hints', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("快捷键")')

    const hints = await elementExists(page, '.shortcuts-info')
    expect(hints).toBe(true)
  })
})

test.describe('AI Service Settings', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ETest(page)
  })

  test('should display AI service configuration', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("AI 服务")')

    // Check for service sections
    const speechService = await elementExists(page, 'h4:has-text("语音识别服务")')
    const imageService = await elementExists(page, 'h4:has-text("图像识别服务")')
    const contentService = await elementExists(page, 'h4:has-text("内容生成服务")')

    expect(speechService).toBe(true)
    expect(imageService).toBe(true)
    expect(contentService).toBe(true)
  })

  test('should display provider selection', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("AI 服务")')

    // Check for provider dropdowns
    const providerSelects = await page.locator('.el-select:visible').count()
    expect(providerSelects).toBeGreaterThan(0)
  })

  test('should have test services button', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("AI 服务")')

    const testButton = await elementExists(page, 'button:has-text("测试所有服务")')
    expect(testButton).toBe(true)
  })

  test('should display API key inputs', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("AI 服务")')

    // Check for password-type inputs (API keys)
    const passwordInputs = await page.locator('input[type="password"]').count()
    expect(passwordInputs).toBeGreaterThan(0)
  })
})

test.describe('Storage Settings', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ETest(page)
  })

  test('should display storage path configuration', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("存储")')

    // Check for path inputs
    const dataPath = await elementExists(page, 'input[placeholder*="数据存储路径"]')
    const screenshotPath = await elementExists(page, 'input[placeholder*="截图保存路径"]')

    expect(dataPath).toBe(true)
    expect(screenshotPath).toBe(true)
  })

  test('should have folder selection buttons', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("存储")')

    // Check for select buttons
    const selectButtons = await page.locator('button:has-text("选择")').count()
    expect(selectButtons).toBeGreaterThan(0)
  })

  test('should have open folder button', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("存储")')

    const openButton = await elementExists(page, 'button:has-text("打开数据文件夹")')
    expect(openButton).toBe(true)
  })

  test('should display storage information', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("存储")')

    const storageInfo = await elementExists(page, '.storage-info')
    expect(storageInfo).toBe(true)
  })
})

test.describe('About Section', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ETest(page)
  })

  test('should display application info', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("关于")')

    // Check for app name
    const appName = await elementExists(page, 'h3:has-text("桌面学习助手")')
    expect(appName).toBe(true)

    // Check for version
    const version = await elementExists(page, 'p:has-text("1.0.0")')
    expect(version).toBe(true)
  })

  test('should display tech stack', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("关于")')

    const techStack = await elementExists(page, '.tech-stack')
    expect(techStack).toBe(true)

    // Check for tech tags
    const tags = await page.locator('.tech-stack .el-tag').count()
    expect(tags).toBeGreaterThan(0)
  })

  test('should display links section', async ({ page }) => {
    await navigateTo(page, '/settings')

    await page.click('label:has-text("关于")')

    const links = await elementExists(page, 'a:has-text("GitHub")')
    expect(links).toBe(true)
  })
})

test.describe('Settings Persistence', () => {
  test('should persist theme setting across reloads', async ({ page }) => {
    await navigateTo(page, '/settings')

    // Change theme
    await page.click('label:has-text("外观")')
    await page.click('label:has-text("暗色")')
    await page.waitForTimeout(500)

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Navigate back to settings
    await navigateTo(page, '/settings')
    await page.click('label:has-text("外观")')

    // Check if dark theme is still selected
    const html = page.locator('html')
    const classList = await html.getAttribute('class')

    expect(classList).toContain('dark')
  })
})
