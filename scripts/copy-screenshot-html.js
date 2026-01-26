const { copyFileSync, existsSync, mkdirSync } = require('fs')
const { join } = require('path')

const sourcePath = join(__dirname, '../src/renderer/screenshot-selector.html')
const targetDir = join(__dirname, '../out/renderer')

// Ensure target directory exists
if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true })
}

// Copy the file
copyFileSync(sourcePath, join(targetDir, 'screenshot-selector.html'))

console.log('✓ Copied screenshot-selector.html to out/renderer/')
