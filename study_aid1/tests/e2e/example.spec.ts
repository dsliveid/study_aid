/**
 * Example E2E Test
 * Demonstrates E2E test patterns with Playwright
 */

import { test, expect } from '@playwright/test'
import {
  navigateTo,
  waitForElement,
  clickElement,
  fillInput,
  getText,
  setupE2ETest,
  elementExists
} from '../helpers/e2e-helpers'

test.describe('Application E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ETest(page)
  })

  test('should load the application', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Check if main content is loaded
    const title = await page.title()
    expect(title).toBeTruthy()
  })

  test('should navigate to notes page', async ({ page }) => {
    await navigateTo(page, '/notes')

    // Check if we're on the notes page
    await waitForElement(page, '.notes-page')
    const isNotesPage = await elementExists(page, '.notes-page')

    expect(isNotesPage).toBe(true)
  })

  test('should navigate to document learning page', async ({ page }) => {
    await navigateTo(page, '/document-learning')

    // Check if document upload area exists
    await waitForElement(page, '.document-learning-page')
    const uploadArea = await elementExists(page, '.document-upload')

    expect(uploadArea).toBe(true)
  })

  test('should navigate to video learning page', async ({ page }) => {
    await navigateTo(page, '/video-learning')

    // Check if video learning page is loaded
    await waitForElement(page, '.video-learning-page')
    const isVideoPage = await elementExists(page, '.video-learning-page')

    expect(isVideoPage).toBe(true)
  })

  test('should navigate to settings page', async ({ page }) => {
    await navigateTo(page, '/settings')

    // Check if settings tabs are visible
    await waitForElement(page, '.settings-page')
    const tabs = await elementExists(page, '.settings-tabs')

    expect(tabs).toBe(true)
  })

  test('should have working navigation sidebar', async ({ page }) => {
    await page.goto('http://localhost:5173')

    // Check if sidebar exists
    const sidebar = await elementExists(page, '.sidebar')
    expect(sidebar).toBe(true)

    // Check if navigation items exist
    const navItems = page.locator('.sidebar-nav-item')
    const count = await navItems.count()

    expect(count).toBeGreaterThan(0)
  })

  test('should handle theme switching', async ({ page }) => {
    await navigateTo(page, '/settings')

    // Click on appearance tab
    await clickElement(page, '[data-testid="tab-appearance"]')

    // Select dark theme
    await page.click('label:has-text("暗色")')

    // Check if theme was applied
    const html = page.locator('html')
    const classList = await html.getAttribute('class')

    // Theme class should be present
    expect(classList).toContain('dark')
  })

  test('should display empty state when no notes exist', async ({ page }) => {
    await navigateTo(page, '/notes')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check for empty state
    const emptyState = await elementExists(page, '.empty-state')
    expect(emptyState).toBe(true)
  })

  test('should handle document upload', async ({ page }) => {
    await navigateTo(page, '/document-learning')

    // Check if upload area exists
    const uploadArea = page.locator('.document-upload')
    await expect(uploadArea).toBeVisible()

    // Check for supported formats text
    const uploadTip = page.locator('.el-upload__tip')
    await expect(uploadTip).toContainText('PDF、DOCX、TXT')
  })

  test('should have working screenshot functionality in video learning', async ({ page }) => {
    await navigateTo(page, '/video-learning')

    // Check for screenshot buttons
    const fullScreenButton = await elementExists(page, 'button:has-text("全屏截图")')
    const regionButton = await elementExists(page, 'button:has-text("区域截图")')

    expect(fullScreenButton).toBe(true)
    expect(regionButton).toBe(true)
  })

  test('should display AI content generation options in document learning', async ({ page }) => {
    await navigateTo(page, '/document-learning')

    // Check if AI generation buttons exist (visible when document is loaded)
    const knowledgeButton = page.locator('button:has-text("生成知识目录")')
    const keyPointsButton = page.locator('button:has-text("标记要点")')
    const difficultyButton = page.locator('button:has-text("标注疑难点")')

    // Buttons should be present even if disabled without document
    await expect(knowledgeButton).isVisible()
    await expect(keyPointsButton).isVisible()
    await expect(difficultyButton).isVisible()
  })

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('http://localhost:5173')

    // Test Tab key navigation
    await page.keyboard.press('Tab')

    // Get focused element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)

    // Some element should be focused
    expect(focusedElement).toBeTruthy()
  })

  test('should display application info in settings', async ({ page }) => {
    await navigateTo(page, '/settings')

    // Click on about tab
    await clickElement(page, '[data-testid="tab-about"]')

    // Check for app info
    const appName = await elementExists(page, 'h3:has-text("桌面学习助手")')
    expect(appName).toBe(true)

    // Check for version info
    const version = await elementExists(page, 'p:has-text("1.0.0")')
    expect(version).toBe(true)
  })
})

test.describe('Error Handling', () => {
  test('should handle invalid route gracefully', async ({ page }) => {
    await navigateTo(page, '/invalid-route')

    // Should not crash and should show some content
    const content = await page.textContent('body')
    expect(content).toBeTruthy()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // This test would need to mock failed API calls
    // For now, it's a placeholder
    await navigateTo(page, '/notes')

    // Page should load even if API fails
    const notesPage = await elementExists(page, '.notes-page')
    expect(notesPage).toBe(true)
  })
})
