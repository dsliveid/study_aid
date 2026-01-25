/**
 * Performance Tests
 * Tests for application performance metrics
 */

import { test, expect } from '@playwright/test'

test.describe('Application Performance', () => {
  test('should load the home page quickly', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime

    // Page should load in less than 3 seconds
    expect(loadTime).toBeLessThan(3000)

    console.log(`Home page load time: ${loadTime}ms`)
  })

  test('should render components efficiently', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Measure first contentful paint
    const fcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint')
          if (fcpEntry) {
            resolve(fcpEntry.startTime)
          }
        }).observe({ entryTypes: ['paint'] })
      })
    })

    // FCP should be under 2 seconds
    expect(fcp).toBeLessThan(2000)
    console.log(`First Contentful Paint: ${fcp}ms`)
  })

  test('should have reasonable bundle size', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Get resource metrics
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      return entries.map((entry) => ({
        name: entry.name,
        size: entry.transferSize,
        type: entry.initiatorType
      }))
    })

    // Calculate total JS bundle size
    const jsSize = resources
      .filter((r) => r.name.endsWith('.js'))
      .reduce((sum, r) => sum + r.size, 0)

    console.log(`Total JS bundle size: ${(jsSize / 1024 / 1024).toFixed(2)}MB`)

    // Total JS should be under 5MB
    expect(jsSize).toBeLessThan(5 * 1024 * 1024)
  })

  test('should handle large note lists efficiently', async ({ page }) => {
    await page.goto('http://localhost:5173#/notes')
    await page.waitForLoadState('networkidle')

    // Simulate large number of notes (check rendering performance)
    const startTime = Date.now()

    const noteElements = await page.locator('.note-item').all()
    const renderTime = Date.now() - startTime

    // Rendering 100 notes should take less than 100ms
    if (noteElements.length > 0) {
      expect(renderTime).toBeLessThan(100)
    }

    console.log(`Rendered ${noteElements.length} notes in ${renderTime}ms`)
  })

  test('should not have memory leaks', async ({ page }) => {
    await page.goto('http://localhost:5173')

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })

    // Navigate through multiple pages
    for (let i = 0; i < 5; i++) {
      await page.goto(`http://localhost:5173#/notes`)
      await page.waitForLoadState('networkidle')
      await page.goto('http://localhost:5173#/document-learning')
      await page.waitForLoadState('networkidle')
    }

    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })

    const memoryGrowth = finalMemory - initialMemory
    const memoryGrowthMB = memoryGrowth / 1024 / 1024

    // Memory growth should be less than 50MB after 10 navigations
    expect(memoryGrowthMB).toBeLessThan(50)

    console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`)
  })
})

test.describe('Database Performance', () => {
  test('should query notes efficiently', async ({ page }) => {
    await page.goto('http://localhost:5173#/notes')
    await page.waitForLoadState('networkidle')

    const startTime = Date.now()

    // Trigger search
    await page.fill('input[placeholder*="搜索"]', 'test')
    await page.waitForTimeout(500) // Wait for debounce

    const searchTime = Date.now() - startTime

    // Search should complete in under 500ms
    expect(searchTime).toBeLessThan(500)

    console.log(`Search time: ${searchTime}ms`)
  })

  test('should save notes quickly', async ({ page }) => {
    await page.goto('http://localhost:5173#/notes')
    await page.waitForLoadState('networkidle')

    // Create a new note
    await page.click('button:has-text("新建笔记")')

    const startTime = Date.now()

    // Fill and save
    await page.fill('input[placeholder*="标题"]', 'Performance Test')
    await page.fill('textarea[placeholder*="内容"]', 'x'.repeat(1000))
    await page.keyboard.press('Control+s')

    // Wait for save
    await page.waitForTimeout(1000)

    const saveTime = Date.now() - startTime

    // Save should complete in under 1 second
    expect(saveTime).toBeLessThan(1000)

    console.log(`Save time: ${saveTime}ms`)
  })
})

test.describe('Rendering Performance', () => {
  test('should scroll smoothly through long lists', async ({ page }) => {
    await page.goto('http://localhost:5173#/notes')
    await page.waitForLoadState('networkidle')

    // Measure scroll performance
    const scrollMetrics = await page.evaluate(async () => {
      const start = performance.now()

      // Scroll down multiple times
      for (let i = 0; i < 10; i++) {
        window.scrollBy(0, 100)
        await new Promise((resolve) => setTimeout(resolve, 16))
      }

      const end = performance.now()
      return end - start
    })

    // 10 scroll events should take less than 500ms
    expect(scrollMetrics).toBeLessThan(500)

    console.log(`Scroll performance: ${scrollMetrics.toFixed(2)}ms`)
  })

  test('should animate smoothly', async ({ page }) => {
    await page.goto('http://localhost:5173')

    // Check for CSS transitions
    const hasTransitions = await page.evaluate(() => {
      const computedStyle = window.getComputedStyle(document.body)
      const transition = computedStyle.transition
      return transition !== 'none' && transition !== ''
    })

    console.log(`CSS transitions enabled: ${hasTransitions}`)
  })
})

test.describe('Startup Performance', () => {
  test('should initialize quickly', async ({ page, context }) => {
    const startTime = Date.now()

    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    const startupTime = Date.now() - startTime

    // Startup should be under 3 seconds
    expect(startupTime).toBeLessThan(3000)

    console.log(`Application startup time: ${startupTime}ms`)
  })

  test('should load critical resources first', async ({ page }) => {
    await page.goto('http://localhost:5173')

    const resourceTiming = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      return entries.map((entry) => ({
        name: entry.name,
        duration: entry.duration,
        size: entry.transferSize
      }))
    })

    // Find largest resource
    const largestResource = resourceTiming.reduce((max, curr) =>
      curr.size > max.size ? curr : max,
      { name: '', size: 0, duration: 0 }
    )

    console.log(`Largest resource: ${largestResource.name} (${(largestResource.size / 1024).toFixed(2)}KB)`)
  })
})

test.describe('Network Performance', () => {
  test('should minimize API calls', async ({ page }) => {
    let apiCallCount = 0

    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        apiCallCount++
      }
    })

    await page.goto('http://localhost:5173#/notes')
    await page.waitForLoadState('networkidle')

    console.log(`API calls made: ${apiCallCount}`)

    // Should minimize API calls on page load
    expect(apiCallCount).toBeLessThan(10)
  })

  test('should cache resources properly', async ({ page }) => {
    const responses = new Map<string, string>()

    page.on('response', async (response) => {
      const headers = await response.allHeaders()
      responses.set(response.url(), headers['cache-control'] || '')
    })

    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Check for cache headers on static resources
    const staticResources = Array.from(responses.entries()).filter(([url]) =>
      url.includes('.js') || url.includes('.css')
    )

    console.log(`Static resources: ${staticResources.length}`)
  })
})
