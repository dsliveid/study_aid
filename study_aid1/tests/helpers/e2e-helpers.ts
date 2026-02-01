/**
 * E2E Test Helpers
 * Common utility functions for E2E testing with Playwright
 */

import { type Page, type Locator } from '@playwright/test'

/**
 * Navigate to a specific route
 */
export async function navigateTo(page: Page, route: string) {
  await page.goto(`http://localhost:5173#${route}`)
  await page.waitForLoadState('networkidle')
}

/**
 * Login helper (if authentication is added)
 */
export async function login(page: Page, username: string, password: string) {
  await page.goto('http://localhost:5173')
  // Add login logic when authentication is implemented
}

/**
 * Wait for element to be visible
 */
export async function waitForElement(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout })
}

/**
 * Click element with wait
 */
export async function clickElement(page: Page, selector: string) {
  await waitForElement(page, selector)
  await page.click(selector)
}

/**
 * Fill input with wait
 */
export async function fillInput(page: Page, selector: string, value: string) {
  await waitForElement(page, selector)
  await page.fill(selector, value)
}

/**
 * Get text content
 */
export async function getText(page: Page, selector: string): Promise<string> {
  await waitForElement(page, selector)
  return await page.textContent(selector) || ''
}

/**
 * Take screenshot on failure
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `tests/screenshots/${name}.png`,
    fullPage: true
  })
}

/**
 * Wait for toast/notification
 */
export async function waitForToast(page: Page, timeout = 3000) {
  await page.waitForSelector('.el-message', { timeout })
}

/**
 * Get all notes from notes list
 */
export async function getNotesList(page: Page): Promise<string[]> {
  const noteElements = await page.locator('.note-item').all()
  const notes: string[] = []

  for (const element of noteElements) {
    const title = await element.textContent()
    if (title) notes.push(title)
  }

  return notes
}

/**
 * Create a new note
 */
export async function createNote(page: Page, title: string, content: string) {
  await navigateTo(page, '/notes')

  // Click new note button
  await clickElement(page, '[data-testid="new-note-button"]')

  // Fill note form
  await fillInput(page, '[data-testid="note-title-input"]', title)
  await fillInput(page, '[data-testid="note-content-editor"]', content)

  // Save note
  await clickElement(page, '[data-testid="save-note-button"]')

  // Wait for success toast
  await waitForToast(page)
}

/**
 * Upload a document
 */
export async function uploadDocument(page: Page, filePath: string) {
  await navigateTo(page, '/document-learning')

  // Get file input element
  const fileInput = page.locator('input[type="file"]')

  // Upload file
  await fileInput.setInputFiles(filePath)

  // Wait for document to be processed
  await page.waitForSelector('.document-content', { timeout: 10000 })
}

/**
 * Test helper for settings
 */
export async function changeSetting(page: Page, setting: string, value: string) {
  await navigateTo(page, '/settings')

  // Find setting input
  const input = page.locator(`[data-testid="setting-${setting}"]`)
  await input.fill(value)

  // Save setting
  await clickElement(page, '[data-testid="save-settings-button"]')

  await waitForToast(page)
}

/**
 * Check if element exists
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).count() > 0
}

/**
 * Get attribute value
 */
export async function getAttribute(
  page: Page,
  selector: string,
  attribute: string
): Promise<string | null> {
  await waitForElement(page, selector)
  return await page.getAttribute(selector, attribute)
}

/**
 * Wait for loading to complete
 */
export async function waitForLoading(page: Page) {
  await page.waitForSelector('.el-loading-mask', { state: 'hidden', timeout: 10000 }).catch(() => {
    // Loading mask might not exist, ignore error
  })
}

/**
 * Setup E2E test environment
 */
export async function setupE2ETest(page: Page) {
  // Clear localStorage
  await page.evaluate(() => localStorage.clear())

  // Clear sessionStorage
  await page.evaluate(() => sessionStorage.clear())

  // Set default viewport
  await page.setViewportSize({ width: 1280, height: 720 })
}

/**
 * Teardown E2E test
 */
export async function teardownE2ETest(page: Page) {
  // Take screenshot if test failed
  if (page.context().pages().length > 0) {
    await page.screenshot({ path: `tests/screenshots/teardown-${Date.now()}.png` }).catch(() => {})
  }
}
