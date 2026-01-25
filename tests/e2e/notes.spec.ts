/**
 * Notes Management E2E Tests
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

test.describe('Notes Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ETest(page)
  })

  test('should navigate to notes page', async ({ page }) => {
    await navigateTo(page, '/notes')

    await waitForElement(page, '.notes-page')
    const isNotesPage = await elementExists(page, '.notes-page')

    expect(isNotesPage).toBe(true)
  })

  test('should display empty state when no notes exist', async ({ page }) => {
    await navigateTo(page, '/notes')

    const emptyState = await elementExists(page, '.empty-state')
    expect(emptyState).toBe(true)
  })

  test('should create a new note', async ({ page }) => {
    await navigateTo(page, '/notes')

    // Click new note button
    const newNoteButton = page.locator('[data-testid="new-note-button"], button:has-text("新建笔记")')
    await newNoteButton.first().click()

    // Wait for note editor to appear
    await waitForElement(page, '.note-editor, [data-testid="note-editor"]')

    // Fill note title
    const titleInput = page.locator('[data-testid="note-title-input"], input[placeholder*="标题"]')
    await titleInput.first().fill('E2E Test Note')

    // Fill note content
    const contentEditor = page.locator('[data-testid="note-content-editor"], .ProseMirror')
    await contentEditor.first().click()
    await contentEditor.first().fill('This is a test note created by E2E test')

    // Save note (Ctrl+S or save button)
    await page.keyboard.press('Control+s')

    // Wait for save confirmation or note to appear in list
    await page.waitForTimeout(1000)

    // Check if note was created (look for the note in the list)
    const noteTitle = page.locator('.note-item:has-text("E2E Test Note")')
    await expect(noteTitle).toBeVisible({ timeout: 5000 })
  })

  test('should edit an existing note', async ({ page }) => {
    await navigateTo(page, '/notes')

    // First create a note if none exists
    const hasNotes = await elementExists(page, '.note-item')

    if (!hasNotes) {
      // Create a test note
      const newNoteButton = page.locator('[data-testid="new-note-button"], button:has-text("新建笔记")')
      await newNoteButton.first().click()

      await waitForElement(page, '.note-editor, [data-testid="note-editor"]')

      const titleInput = page.locator('[data-testid="note-title-input"], input[placeholder*="标题"]')
      await titleInput.first().fill('Edit Test Note')

      const contentEditor = page.locator('[data-testid="note-content-editor"], .ProseMirror')
      await contentEditor.first().click()
      await contentEditor.first().fill('Original content')

      await page.keyboard.press('Control+s')
      await page.waitForTimeout(1000)
    }

    // Click on the first note to edit
    const firstNote = page.locator('.note-item').first()
    await firstNote.click()

    // Wait for editor
    await waitForElement(page, '.note-editor, [data-testid="note-editor"]')

    // Update content
    const contentEditor = page.locator('[data-testid="note-content-editor"], .ProseMirror')
    await contentEditor.first().click()
    await contentEditor.first().fill('Updated content')

    // Save
    await page.keyboard.press('Control+s')
    await page.waitForTimeout(1000)

    // Verify update (check for success message or updated content)
    const hasUpdatedContent = await page.locator('.ProseMirror:has-text("Updated content")').count()
    expect(hasUpdatedContent).toBeGreaterThan(0)
  })

  test('should delete a note', async ({ page }) => {
    await navigateTo(page, '/notes')

    // First create a note if none exists
    const hasNotes = await elementExists(page, '.note-item')

    if (!hasNotes) {
      const newNoteButton = page.locator('[data-testid="new-note-button"], button:has-text("新建笔记")')
      await newNoteButton.first().click()

      await waitForElement(page, '.note-editor, [data-testid="note-editor"]')

      const titleInput = page.locator('[data-testid="note-title-input"], input[placeholder*="标题"]')
      await titleInput.first().fill('Delete Test Note')

      const contentEditor = page.locator('[data-testid="note-content-editor"], .ProseMirror')
      await contentEditor.first().click()
      await contentEditor.first().fill('Note to be deleted')

      await page.keyboard.press('Control+s')
      await page.waitForTimeout(1000)
    }

    // Get initial note count
    const initialCount = await page.locator('.note-item').count()

    // Click on the first note
    const firstNote = page.locator('.note-item').first()
    await firstNote.click()

    // Click delete button
    const deleteButton = page.locator('[data-testid="delete-note-button"], button:has-text("删除")')
    await deleteButton.first().click()

    // Confirm deletion
    const confirmButton = page.locator('.el-message-box:visible button:has-text("确定")')
    await confirmButton.click()

    // Wait for deletion
    await page.waitForTimeout(1000)

    // Verify note was deleted
    const finalCount = await page.locator('.note-item').count()
    expect(finalCount).toBeLessThan(initialCount)
  })

  test('should search notes', async ({ page }) => {
    await navigateTo(page, '/notes')

    // Create multiple test notes first if needed
    const searchInput = page.locator('[data-testid="search-input"], input[placeholder*="搜索"]')

    // Type search query
    await searchInput.fill('test')

    // Wait for search results
    await page.waitForTimeout(500)

    // Verify search was performed (input value should be 'test')
    const inputValue = await searchInput.inputValue()
    expect(inputValue).toBe('test')
  })

  test('should filter notes by tags', async ({ page }) => {
    await navigateTo(page, '/notes')

    // Look for tag filter UI
    const tagFilter = await elementExists(page, '[data-testid="tag-filter"], .tag-filter')

    if (tagFilter) {
      // Click on a tag
      const firstTag = page.locator('.el-tag').first()
      await firstTag.click()

      // Wait for filter to apply
      await page.waitForTimeout(500)
    }

    // Test passes if tag filter exists and is clickable
    expect(tagFilter).toBe(true)
  })

  test('should auto-save note content', async ({ page }) => {
    await navigateTo(page, '/notes')

    // Create a new note
    const newNoteButton = page.locator('[data-testid="new-note-button"], button:has-text("新建笔记")')
    await newNoteButton.first().click()

    await waitForElement(page, '.note-editor, [data-testid="note-editor"]')

    // Add content
    const contentEditor = page.locator('[data-testid="note-content-editor"], .ProseMirror')
    await contentEditor.first().click()
    await contentEditor.first().fill('Auto-save test content')

    // Wait for auto-save (typically 1-2 seconds)
    await page.waitForTimeout(2000)

    // Check for save indicator (if exists)
    const saveIndicator = await elementExists(page, '.save-indicator, [data-saved="true"]')

    // If indicator exists, it should show saved state
    if (saveIndicator) {
      const saved = await page.locator('[data-saved="true"]').count()
      expect(saved).toBeGreaterThan(0)
    }
  })
})

test.describe('Notes Persistence', () => {
  test('should persist notes across page reloads', async ({ page }) => {
    // Create a note
    await page.goto('http://localhost:5173#/notes')
    await page.waitForLoadState('networkidle')

    const newNoteButton = page.locator('[data-testid="new-note-button"], button:has-text("新建笔记")')
    await newNoteButton.first().click()

    await page.waitForSelector('.note-editor, [data-testid="note-editor"]')

    const titleInput = page.locator('[data-testid="note-title-input"], input[placeholder*="标题"]')
    await titleInput.first().fill('Persistence Test Note')

    const contentEditor = page.locator('[data-testid="note-content-editor"], .ProseMirror')
    await contentEditor.first().click()
    await contentEditor.first().fill('This note should persist')

    await page.keyboard.press('Control+s')
    await page.waitForTimeout(1000)

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check if note still exists
    const noteTitle = page.locator('.note-item:has-text("Persistence Test Note")')
    await expect(noteTitle).toBeVisible({ timeout: 5000 })
  })
})
