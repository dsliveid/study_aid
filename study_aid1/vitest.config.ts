import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,jsx,tsx}', 'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,jsx,tsx}'],
    exclude: ['node_modules', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/main/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/renderer/src')
    }
  }
})
